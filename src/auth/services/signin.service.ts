import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignInDto } from '../dto/signin.dto';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SigninService {
  private supabase: ReturnType<typeof createClient>;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const supabaseKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    // Initialize the Supabase client specifically for server-side auth
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async signIn(signInDto: SignInDto) {
    // We continue using 'username' from the DTO to represent the email
    const { username, password } = signInDto;

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (error) {
        // Map Supabase errors to the old Cognito exception handling flow
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

      // Format the Supabase session to perfectly match the legacy AWS Cognito structure
      // This prevents you from having to rewrite frontend token parsing logic!
      return {
        statusCode: 200,
        message: 'Inicio de sesión exitoso',
        authenticationResult: {
          AccessToken: data.session.access_token,
          RefreshToken: data.session.refresh_token,
          ExpiresIn: data.session.expires_in,
          TokenType: data.session.token_type,
        },
      };
    } catch (error) {
      console.error('Error durante el inicio de sesión:', error);

      // Pass through our custom HTTP exceptions
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
