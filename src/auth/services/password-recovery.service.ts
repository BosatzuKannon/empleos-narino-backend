import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ConfirmNewPasswordDto } from '../dto/confirm-new-password.dto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class PasswordRecoveryService {
  private supabaseAdmin: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    // Usamos el cliente Admin para poder actualizar la contraseña directamente tras verificar el código
    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    try {
      // Supabase enviará automáticamente un email con un código OTP de 6 dígitos (si está configurado así en tu dashboard)
      const { error } = await this.supabaseAdmin.auth.resetPasswordForEmail(email);

      if (error) {
        throw new Error(error.message);
      }

      return {
        statusCode: 200,
        message: 'Código de recuperación de contraseña enviado al email.',
      };
    } catch (error) {
      console.error('Error with forgot password request:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido de Supabase';
      throw new InternalServerErrorException({
        message: 'Error al solicitar el código de recuperación de contraseña',
        error: errorMessage,
      });
    }
  }

  async confirmNewPassword(confirmNewPasswordDto: ConfirmNewPasswordDto) {
    const { email, newPassword, confirmationCode } = confirmNewPasswordDto;

    try {
      // 1. Verificamos que el código OTP que el usuario ingresó es correcto
      const { data, error: verifyError } = await this.supabaseAdmin.auth.verifyOtp({
        email,
        token: confirmationCode,
        type: 'recovery',
      });

      if (verifyError) {
        if (verifyError.message.includes('Token has expired or is invalid')) {
          throw new BadRequestException({
            message: 'El código de confirmación es incorrecto o ha expirado.',
            error: verifyError.message,
          });
        }
        throw new Error(verifyError.message);
      }

      if (!data.user) {
        throw new Error('No se pudo identificar al usuario tras verificar el código.');
      }

      // 2. Si el código es correcto, usamos el Admin API para actualizar la contraseña del usuario
      const { error: updateError } = await this.supabaseAdmin.auth.admin.updateUserById(
        data.user.id,
        { password: newPassword }
      );

      if (updateError) {
        throw new Error(updateError.message);
      }

      return {
        statusCode: 200,
        message: 'Contraseña actualizada exitosamente.',
      };
    } catch (error) {
      console.error('Error confirming new password:', error);

      // Respetamos la excepción HTTP si ya fue lanzada en el paso de verificación
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido de Supabase';
      throw new InternalServerErrorException({
        message: 'Error al confirmar la nueva contraseña.',
        error: errorMessage,
      });
    }
  }
}