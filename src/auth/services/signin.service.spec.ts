import { Test, TestingModule } from '@nestjs/testing';
import { SigninService } from './signin.service.ts.disabled';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('SigninService', () => {
  let service: SigninService;

  beforeEach(async () => {
    // Mock del ConfigService con tipado estricto para evitar errores de linter
    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          AWS_REGION: 'us-east-2',
          COGNITO_CLIENT_ID: 'test-client-id',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SigninService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SigninService>(SigninService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    const mockDto = {
      username: 'prueba@empleosnarino.com',
      password: 'Password123!',
    };

    it('debería iniciar sesión exitosamente y devolver el token', async () => {
      // Mock de una respuesta exitosa de Cognito
      const cognitoSendMock = jest
        .spyOn(service['cognitoClient'] as any, 'send')
        .mockResolvedValueOnce({
          AuthenticationResult: { AccessToken: 'mock-jwt-token' },
        });

      const result = await service.signIn(mockDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Inicio de sesión exitoso',
        authenticationResult: { AccessToken: 'mock-jwt-token' },
      });
      expect(cognitoSendMock).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar UnauthorizedException si las credenciales son incorrectas', async () => {
      // Simulamos el error específico NotAuthorizedException
      const error = new Error('Incorrect username or password.');
      error.name = 'NotAuthorizedException';

      jest
        .spyOn(service['cognitoClient'] as any, 'send')
        .mockRejectedValueOnce(error);

      await expect(service.signIn(mockDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debería lanzar ForbiddenException si el usuario no ha confirmado su correo', async () => {
      // Simulamos el error específico UserNotConfirmedException
      const error = new Error('User is not confirmed.');
      error.name = 'UserNotConfirmedException';

      jest
        .spyOn(service['cognitoClient'] as any, 'send')
        .mockRejectedValueOnce(error);

      await expect(service.signIn(mockDto)).rejects.toThrow(ForbiddenException);
    });

    it('debería lanzar InternalServerErrorException para errores generales de AWS', async () => {
      // Simulamos un error de red genérico
      const error = new Error('Error de conexión a internet');

      jest
        .spyOn(service['cognitoClient'] as any, 'send')
        .mockRejectedValueOnce(error);

      await expect(service.signIn(mockDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
