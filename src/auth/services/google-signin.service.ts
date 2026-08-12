import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { OAuth2Client } from 'google-auth-library';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { GoogleSignInDto } from '../dto/google-signin.dto';

@Injectable()
export class GoogleSignInService {
  private supabase: ReturnType<typeof createClient>;
  private oauthClient: OAuth2Client;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const supabaseKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    this.supabase = createClient(supabaseUrl, supabaseKey, {
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
      const googleWebClientId = this.configService.getOrThrow<string>(
        'GOOGLE_WEB_CLIENT_ID',
      );
      let payload:
        | {
            email?: string | null;
            name?: string | null;
            sub?: string;
            picture?: string | null;
          }
        | undefined;
      try {
        const ticket = await this.oauthClient.verifyIdToken({
          idToken,
          audience: googleWebClientId,
        });
        payload = ticket.getPayload();
      } catch {
        throw new UnauthorizedException(
          'El token de Google no es válido o ha expirado.',
        );
      }

      if (!payload?.email) {
        throw new UnauthorizedException(
          'El token de Google no contiene un correo válido.',
        );
      }

      const email = payload.email.toLowerCase();
      const fullName = payload.name || '';
      const [firstName = '', ...lastNameParts] = fullName.trim().split(' ');
      const lastName = lastNameParts.length ? lastNameParts.join(' ') : null;

      // 2. Create/link the Supabase auth user and get the standard session JWT
      const { data, error } = await this.supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error || !data.user || !data.session) {
        throw new UnauthorizedException({
          message: 'No se pudo autenticar con la cuenta de Google.',
          error: error?.message || 'Supabase no devolvió una sesión.',
        });
      }

      // 3. Find the user by email; create if missing, otherwise fill googleId/avatarUrl
      let dbUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!dbUser) {
        dbUser = await this.prisma.user.create({
          data: {
            id: data.user.id,
            email,
            firstName: firstName || fullName,
            lastName,
            googleId: payload.sub,
            avatarUrl: payload.picture || null,
            role: UserRole.PENDING,
            isVerified: true,
          },
        });
      } else {
        dbUser = await this.prisma.user.update({
          where: { id: dbUser.id },
          data: {
            googleId: dbUser.googleId ?? payload.sub,
            avatarUrl: dbUser.avatarUrl ?? payload.picture ?? null,
            firstName: dbUser.firstName || firstName || fullName,
            lastName: dbUser.lastName || lastName || null,
          },
        });
      }

      // 3.1. Sync the role to Supabase user_metadata so the JWT payload carries it
      try {
        await this.supabase.auth.admin.updateUserById(data.user.id, {
          user_metadata: {
            ...(data.user.user_metadata || {}),
            role: dbUser.role,
          },
        });
      } catch (metaError) {
        console.warn('No se pudo actualizar user_metadata:', metaError);
      }

      // 4. Mirror the standard local sign-in response
      const role = dbUser.role;
      let companyName = '';
      if (role === UserRole.COMPANY_ADMIN) {
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
          AccessToken: data.session.access_token,
          RefreshToken: data.session.refresh_token,
          ExpiresIn: data.session.expires_in,
          TokenType: data.session.token_type,
        },
        user: {
          id: dbUser.id,
          email: dbUser.email,
          emailVerified: true,
          nombre: dbUser.firstName,
          apellido: dbUser.lastName || '',
          role,
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
}
