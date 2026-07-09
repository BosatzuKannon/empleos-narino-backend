import { Test, TestingModule } from '@nestjs/testing';
import { PasswordRecoveryService } from './password-recovery.service';
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
          SUPABASE_URL: 'https://mock-url.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
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
      const supabaseResetMock = jest
        .spyOn(service['supabaseAdmin'].auth, 'resetPasswordForEmail')
        .mockResolvedValueOnce({ data: {}, error: null } as any);

      const result = await service.forgotPassword(mockDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Código de recuperación de contraseña enviado al email.',
      });
      expect(supabaseResetMock).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar InternalServerErrorException en caso de error de Supabase', async () => {
      jest
        .spyOn(service['supabaseAdmin'].auth, 'resetPasswordForEmail')
        .mockResolvedValueOnce({ data: null, error: { message: 'Failed to send' } } as any);

      await expect(service.forgotPassword(mockDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('confirmNewPassword', () => {
    const mockDto = {
      email: 'prueba@empleosnarino.com',
      newPassword: 'NewPassword123!',
      confirmationCode: '123456',
    };

    it('debería confirmar la nueva contraseña exitosamente', async () => {
      // 1. Mock the OTP Verification success
      const verifyMock = jest
        .spyOn(service['supabaseAdmin'].auth, 'verifyOtp')
        .mockResolvedValueOnce({ data: { user: { id: 'mock-user-id' } }, error: null } as any);

      // 2. Mock the Admin Password Update success
      const updateMock = jest
        .spyOn(service['supabaseAdmin'].auth.admin, 'updateUserById')
        .mockResolvedValueOnce({ data: { user: {} }, error: null } as any);

      const result = await service.confirmNewPassword(mockDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Contraseña actualizada exitosamente.',
      });
      expect(verifyMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar BadRequestException si el código es incorrecto', async () => {
      jest
        .spyOn(service['supabaseAdmin'].auth, 'verifyOtp')
        .mockResolvedValueOnce({
          data: { user: null },
          error: { message: 'Token has expired or is invalid' },
        } as any);

      await expect(service.confirmNewPassword(mockDto)).rejects.toThrow(BadRequestException);
    });
  });
});