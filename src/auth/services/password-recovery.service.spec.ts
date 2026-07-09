import { Test, TestingModule } from '@nestjs/testing';
import { PasswordRecoveryService } from './password-recovery.service.ts';
import { ConfigService } from '@nestjs/config';
import {
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';

describe('PasswordRecoveryService', () => {
  let service: PasswordRecoveryService;

  beforeEach(async () => {
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
        PasswordRecoveryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PasswordRecoveryService>(PasswordRecoveryService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('forgotPassword', () => {
    const mockDto = { email: 'prueba@empleosnarino.com' };

    it('debería enviar el código de recuperación exitosamente', async () => {
      const cognitoSendMock = jest
        .spyOn(service['cognitoClient'] as any, 'send')
        .mockResolvedValueOnce({});

      const result = await service.forgotPassword(mockDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Código de recuperación de contraseña enviado al email.',
      });
      expect(cognitoSendMock).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar InternalServerErrorException en caso de error de AWS', async () => {
      jest
        .spyOn(service['cognitoClient'] as any, 'send')
        .mockRejectedValueOnce(new Error('Fallo de red'));

      await expect(service.forgotPassword(mockDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('confirmNewPassword', () => {
    const mockDto = {
      email: 'prueba@empleosnarino.com',
      newPassword: 'NewPassword123!',
      confirmationCode: '123456',
    };

    it('debería confirmar la nueva contraseña exitosamente', async () => {
      const cognitoSendMock = jest
        .spyOn(service['cognitoClient'] as any, 'send')
        .mockResolvedValueOnce({});

      const result = await service.confirmNewPassword(mockDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Contraseña actualizada exitosamente.',
      });
      expect(cognitoSendMock).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar BadRequestException si el código es incorrecto', async () => {
      const error = new Error(
        'Invalid code provided, please request a code again.',
      );
      error.name = 'CodeMismatchException';

      jest
        .spyOn(service['cognitoClient'] as any, 'send')
        .mockRejectedValueOnce(error);

      await expect(service.confirmNewPassword(mockDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar InternalServerErrorException para errores generales de AWS', async () => {
      jest
        .spyOn(service['cognitoClient'] as any, 'send')
        .mockRejectedValueOnce(new Error('Error inesperado'));

      await expect(service.confirmNewPassword(mockDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
