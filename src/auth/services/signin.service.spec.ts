import { Test, TestingModule } from '@nestjs/testing';
import { SigninService } from './signin.service';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';

jest.mock('@supabase/supabase-js', () => {
  const mockSignInWithPassword = jest.fn();
  return {
    createClient: jest.fn(() => ({
      auth: {
        signInWithPassword: mockSignInWithPassword,
      },
    })),
    __mockSignInWithPassword: mockSignInWithPassword,
  };
});

describe('SigninService', () => {
  let service: SigninService;
  let mockSignInWithPassword: jest.Mock;

  beforeEach(async () => {
    const supabaseModule = require('@supabase/supabase-js');
    mockSignInWithPassword = supabaseModule.__mockSignInWithPassword;
    mockSignInWithPassword.mockReset();

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
        SigninService,
        { provide: ConfigService, useValue: mockConfigService },
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
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'mock-jwt-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
          },
        },
        error: null,
      });

      const result = await service.signIn(mockDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Inicio de sesión exitoso',
        authenticationResult: {
          AccessToken: 'mock-jwt-token',
          RefreshToken: 'mock-refresh-token',
          ExpiresIn: 3600,
          TokenType: 'bearer',
        },
      });
      expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar UnauthorizedException si las credenciales son incorrectas', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(service.signIn(mockDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debería lanzar ForbiddenException si el correo no está confirmado', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Email not confirmed' },
      });

      await expect(service.signIn(mockDto)).rejects.toThrow(ForbiddenException);
    });

    it('debería lanzar InternalServerErrorException para errores generales', async () => {
      mockSignInWithPassword.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.signIn(mockDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
