import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignInDto } from '../dto/signin.dto';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SigninService {
  private supabase: ReturnType<typeof createClient>;

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
  }

  async signIn(signInDto: SignInDto) {
    const { username, password } = signInDto;

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new UnauthorizedException({
            message: 'Nombre de usuario o contraseña incorrectos.',
            error: error.message,
          });
        }

        if (error.message.includes('Email not confirmed')) {
          throw new ForbiddenException({
            message:
              'El usuario no ha sido confirmado. Por favor, confirme su cuenta.',
            error: error.message,
          });
        }

        throw new InternalServerErrorException({
          message: 'Error en la autenticación.',
          error: error.message,
        });
      }

      // 1. Get the user's role from Prisma using the Supabase UID
      const supabaseUid = data.user.id;
      const dbUser = await this.prisma.user.findUnique({
        where: { id: supabaseUid },
      });

      // 2. Ensure the role is in Supabase user_metadata so the JWT carries it
      const currentMeta = data.user.user_metadata || {};
      if (dbUser && currentMeta.role !== dbUser.role) {
        try {
          await this.supabase.auth.admin.updateUserById(supabaseUid, {
            user_metadata: { ...currentMeta, role: dbUser.role },
          });
        } catch (metaError) {
          console.warn('No se pudo actualizar user_metadata:', metaError);
        }
      }

      const role = dbUser?.role || 'CANDIDATE';

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
          id: data.user.id,
          email: data.user.email,
          emailVerified: data.user.email_confirmed_at ? true : false,
          nombre: dbUser?.firstName || currentMeta.firstName || '',
          apellido: dbUser?.lastName || currentMeta.lastName || '',
          role: role,
          telefono: dbUser?.phone || currentMeta.phone || '',
          ciudad: dbUser?.city || '',
        },
      };
    } catch (error) {
      console.error('Error durante el inicio de sesión:', error);

      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido de Supabase';
      throw new InternalServerErrorException({
        message: 'Error al iniciar sesión.',
        error: errorMessage,
      });
    }
  }
}
