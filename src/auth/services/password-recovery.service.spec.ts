import { Test, TestingModule } from '@nestjs/testing';
import { PasswordRecoveryService } from './password-recovery.service';
import { ConfigService } from '@nestjs/config';
import {
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';

jest.mock('@supabase/supabase-js', () => {
  const mockResetPasswordForEmail = jest.fn();
  const mockVerifyOtp = jest.fn();
  const mockUpdateUserById = jest.fn();
  return {
    createClient: jest.fn(() => ({
      auth: {
        resetPasswordForEmail: mockResetPasswordForEmail,
        verifyOtp: mockVerifyOtp,
        admin: {
          updateUserById: mockUpdateUserById,
        },
      },
    })),
    __mocks: {
      resetPasswordForEmail: mockResetPasswordForEmail,
      verifyOtp: mockVerifyOtp,
      updateUserById: mockUpdateUserById,
    },
  };
});

describe('PasswordRecoveryService', () => {
  let service: PasswordRecoveryService;
  let mocks: {
    resetPasswordForEmail: jest.Mock;
    verifyOtp: jest.Mock;
    updateUserById: jest.Mock;
  };

  beforeEach(async () => {
    const supabaseModule = require('@supabase/supabase-js');
    mocks = supabaseModule.__mocks;
    mocks.resetPasswordForEmail.mockReset();
    mocks.verifyOtp.mockReset();
    mocks.updateUserById.mockReset();

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
        { provide: ConfigService, useValue: mockConfigService },
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
      mocks.resetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null });

      const result = await service.forgotPassword(mockDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Código de recuperación de contraseña enviado al email.',
      });
      expect(mocks.resetPasswordForEmail).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar InternalServerErrorException en caso de error de Supabase', async () => {
      mocks.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to send' },
      });

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
      mocks.verifyOtp.mockResolvedValueOnce({
        data: { user: { id: 'mock-user-id' } },
        error: null,
      });
      mocks.updateUserById.mockResolvedValueOnce({ data: { user: {} }, error: null });

      const result = await service.confirmNewPassword(mockDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Contraseña actualizada exitosamente.',
      });
      expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
      expect(mocks.updateUserById).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar BadRequestException si el código es incorrecto', async () => {
      mocks.verifyOtp.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Token has expired or is invalid' },
      });

      await expect(service.confirmNewPassword(mockDto)).rejects.toThrow(BadRequestException);
    });
  });
});
