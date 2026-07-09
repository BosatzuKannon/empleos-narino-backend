import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ConfirmNewPasswordDto } from '../dto/confirm-new-password.dto';
import {
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';

@Injectable()
export class PasswordRecoveryService {
  private cognitoClient: CognitoIdentityProviderClient;
  private readonly CLIENT_ID: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    this.CLIENT_ID = this.configService.getOrThrow<string>('COGNITO_CLIENT_ID');

    this.cognitoClient = new CognitoIdentityProviderClient({ region });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.CLIENT_ID,
        Username: email,
      });

      await this.cognitoClient.send(command);

      return {
        statusCode: 200,
        message: 'Código de recuperación de contraseña enviado al email.',
      };
    } catch (error) {
      console.error('Error with forgot password request:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException({
        message: 'Error al solicitar el código de recuperación de contraseña',
        error: errorMessage,
      });
    }
  }

  async confirmNewPassword(confirmNewPasswordDto: ConfirmNewPasswordDto) {
    const { email, newPassword, confirmationCode } = confirmNewPasswordDto;

    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.CLIENT_ID,
        Username: email,
        Password: newPassword,
        ConfirmationCode: confirmationCode,
      });

      await this.cognitoClient.send(command);

      return {
        statusCode: 200,
        message: 'Contraseña actualizada exitosamente.',
      };
    } catch (error) {
      console.error('Error confirming new password:', error);

      if (error instanceof Error && error.name === 'CodeMismatchException') {
        throw new BadRequestException({
          message: 'El código de confirmación es incorrecto.',
          error: error.message,
        });
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException({
        message: 'Error al confirmar la nueva contraseña.',
        error: errorMessage,
      });
    }
  }
}
