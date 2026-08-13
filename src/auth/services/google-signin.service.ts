import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { OAuth2Client } from 'google-auth-library';
import { Prisma, User, UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma.service';
import { GoogleSignInDto } from '../dto/google-signin.dto';

@Injectable()
export class GoogleSignInService {
  private supabaseAdmin: ReturnType<typeof createClient>;
  private oauthClient: OAuth2Client;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const supabaseKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    this.supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.oauthClient = new OAuth2Client(
      this.configService.getOrThrow<string>('GOOGLE_WEB_CLIENT_ID'),
    );
  }

  async signInWithGoogle(googleSignInDto: GoogleSignInDto) {
    const { idToken } = googleSignInDto;

    try {
      // 1. Verify the Google ID token against our web client id
      const payload = await this.verifyGoogleIdToken(idToken);

      if (!payload.email) {
        throw new UnauthorizedException(
          'El token de Google no contiene un correo válido.',
        );
      }

      const email = payload.email.toLowerCase();
      const fullName = payload.name || '';
      const [firstName = fullName, ...lastNameParts] = fullName
        .trim()
        .split(' ');
      const lastName = lastNameParts.length ? lastNameParts.join(' ') : null;

      // 2. Check if the user exists in Prisma by email
      let dbUser = await this.prisma.user.findUnique({ where: { email } });

      // 3. Not in Prisma -> provision Supabase Auth + Prisma.
      // No password, no OTP: email_confirm: true makes the email trusted.
      if (!dbUser) {
        const supabaseUserId = await this.provisionSupabaseUser(email);
        dbUser = await this.ensurePrismaUser(supabaseUserId, {
          email,
          firstName: firstName || fullName,
          lastName,
          googleId: payload.sub,
          avatarUrl: payload.picture || null,
          role: UserRole.PENDING,
        });
      } else {
        // User registered manually before: adopt the Google avatar, and the
        // googleId if the manual account never linked one.
        dbUser = await this.prisma.user.update({
          where: { id: dbUser.id },
          data: {
            avatarUrl: payload.picture || dbUser.avatarUrl,
            googleId: dbUser.googleId ?? payload.sub,
          },
        });
      }

      // 4. Generate our own app JWT (the DB trigger row may predate the
      // googleId, so re-read nothing: dbUser already carries the role).
      const accessToken = this.signJwt(dbUser);

      let companyName = '';
      if (dbUser.role === UserRole.COMPANY_ADMIN) {
        const company = await this.prisma.company.findFirst({
          where: { ownerId: dbUser.id },
          select: { name: true },
        });
        companyName = company?.name || '';
      }

      return {
        statusCode: 200,
        message: 'Inicio de sesión exitoso',
        authenticationResult: {
          AccessToken: accessToken,
          RefreshToken: '',
          ExpiresIn: 60 * 60 * 24 * 30,
          TokenType: 'bearer',
        },
        user: {
          id: dbUser.id,
          email: dbUser.email,
          emailVerified: true,
          nombre: dbUser.firstName,
          apellido: dbUser.lastName || '',
          role: dbUser.role,
          telefono: dbUser.phone || '',
          ciudad: dbUser.city || '',
          avatarUrl: dbUser.avatarUrl || '',
          companyName,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      console.error('Error durante el inicio de sesión con Google:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException({
        message: 'Error al iniciar sesión con Google.',
        error: errorMessage,
      });
    }
  }

  private async verifyGoogleIdToken(idToken: string): Promise<{
    email?: string | null;
    name?: string | null;
    sub?: string;
    picture?: string | null;
  }> {
    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: this.configService.getOrThrow<string>('GOOGLE_WEB_CLIENT_ID'),
      });
      return ticket.getPayload() || {};
    } catch {
      throw new UnauthorizedException(
        'El token de Google no es válido o ha expirado.',
      );
    }
  }

  private async provisionSupabaseUser(email: string): Promise<string> {
    const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { role: UserRole.PENDING },
    });

    if (data?.user?.id) {
      return data.user.id;
    }

    // 5. Conflict handling: an orphan Supabase user (from previous tests)
    // owns this email but has no Prisma row. Adopt it instead of failing.
    if (
      error &&
      /already been registered|already registered|email_exists/i.test(
        error.message,
      )
    ) {
      const existing = await this.findSupabaseUserByEmail(email);
      if (existing) {
        return existing.id;
      }
    }

    throw new UnauthorizedException({
      message: 'No se pudo crear la cuenta con Google.',
      error: error?.message || 'Supabase no devolvió un usuario.',
    });
  }

  private async findSupabaseUserByEmail(email: string) {
    const { data, error } = await this.supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) {
      throw error;
    }
    return data.users.find((u) => u.email?.toLowerCase() === email) || null;
  }

  // The auth.users -> public."User" DB trigger already inserts the baseline
  // row on createUser, so update the extended fields; create only as a fallback
  // for environments without the trigger.
  private async ensurePrismaUser(
    id: string,
    data: {
      email: string;
      firstName: string;
      lastName: string | null;
      googleId?: string;
      avatarUrl?: string | null;
      role: UserRole;
    },
  ): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { ...data, isVerified: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return this.prisma.user.create({
          data: { id, ...data, isVerified: true },
        });
      }
      throw error;
    }
  }

  private signJwt(user: User): string {
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    const now = Math.floor(Date.now() / 1000);
    const encode = (obj: unknown) =>
      Buffer.from(JSON.stringify(obj)).toString('base64url');
    const header = encode({ alg: 'HS256', typ: 'JWT' });
    const payload = encode({
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + 60 * 60 * 24 * 30,
    });
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${signature}`;
  }
}
