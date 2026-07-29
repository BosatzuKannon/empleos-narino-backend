import { Test, TestingModule } from '@nestjs/testing';
import { SigninService } from './signin.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import {
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as supabaseModule from '@supabase/supabase-js';

interface MockedSigninModule {
  __mockSignInWithPassword: jest.Mock;
  __mockUpdateUserById: jest.Mock;
}

jest.mock('@supabase/supabase-js', () => {
  const mockSignInWithPassword = jest.fn();
  const mockUpdateUserById = jest.fn();
  return {
    createClient: jest.fn(() => ({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        admin: {
          updateUserById: mockUpdateUserById,
        },
      },
    })),
    __mockSignInWithPassword: mockSignInWithPassword,
    __mockUpdateUserById: mockUpdateUserById,
  };
});

describe('SigninService', () => {
  let service: SigninService;
  let mockSignInWithPassword: jest.Mock;
  let mockUpdateUserById: jest.Mock;
  let prismaMock: {
    user: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    const mockedModule = supabaseModule as unknown as MockedSigninModule;
    mockSignInWithPassword = mockedModule.__mockSignInWithPassword;
    mockUpdateUserById = mockedModule.__mockUpdateUserById;
    mockSignInWithPassword.mockReset();
    mockUpdateUserById.mockReset();

    prismaMock = {
      user: { findUnique: jest.fn() },
    };

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
        { provide: PrismaService, useValue: prismaMock },
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

    it('debería iniciar sesión exitosamente y devolver token + usuario', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {
          user: {
            id: 'mock-user-id',
            email: 'prueba@empleosnarino.com',
            email_confirmed_at: '2025-01-01T00:00:00Z',
            user_metadata: { firstName: 'Carlos', lastName: 'Jaramillo' },
          },
          session: {
            access_token: 'mock-jwt-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
          },
        },
        error: null,
      });
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'mock-user-id',
        email: 'prueba@empleosnarino.com',
        firstName: 'Carlos',
        lastName: 'Jaramillo',
        role: 'CANDIDATE',
        phone: '3001234567',
        city: 'Pasto',
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
        user: {
          id: 'mock-user-id',
          email: 'prueba@empleosnarino.com',
          emailVerified: true,
          nombre: 'Carlos',
          apellido: 'Jaramillo',
          role: 'CANDIDATE',
          telefono: '3001234567',
          ciudad: 'Pasto',
        },
      });
      expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'mock-user-id' },
      });
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
