import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignInDto } from '../dto/signin.dto';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';

@Injectable()
export class SigninService {
  private cognitoClient: CognitoIdentityProviderClient;
  private readonly CLIENT_ID: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    this.CLIENT_ID = this.configService.getOrThrow<string>('COGNITO_CLIENT_ID');

    this.cognitoClient = new CognitoIdentityProviderClient({ region });
  }

  async signIn(signInDto: SignInDto) {
    const { username, password } = signInDto;

    try {
      const command = new InitiateAuthCommand({
        ClientId: this.CLIENT_ID,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      });

      const result = await this.cognitoClient.send(command);

      return {
        statusCode: 200,
        message: 'Inicio de sesión exitoso',
        authenticationResult: result.AuthenticationResult,
      };
    } catch (error) {
      // <-- Ya no usamos ': any'
      console.error('Error durante el inicio de sesión:', error);

      // Le demostramos a TypeScript que este error es un objeto Error real
      if (error instanceof Error) {
        if (
          error.name === 'NotAuthorizedException' ||
          error.name === 'UserNotFoundException'
        ) {
          throw new UnauthorizedException({
            message: 'Nombre de usuario o contraseña incorrectos.',
            error: error.message,
          });
        }

        if (error.name === 'UserNotConfirmedException') {
          throw new ForbiddenException({
            message:
              'El usuario no ha sido confirmado. Por favor, confirme su cuenta.',
            error: error.message,
          });
        }
      }

      // Fallback seguro si por alguna razón falla algo que no sea una instancia de Error
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido de AWS';

      throw new InternalServerErrorException({
        message: 'Error al iniciar sesión.',
        error: errorMessage,
      });
    }
  }
}
