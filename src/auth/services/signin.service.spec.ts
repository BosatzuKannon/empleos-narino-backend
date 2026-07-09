import { Test, TestingModule } from '@nestjs/testing';
import { SigninService } from './signin.service';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('SigninService', () => {
  let service: SigninService;

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
      // Mock successful Supabase authentication
      const supabaseSignInMock = jest
        .spyOn(service['supabase'].auth, 'signInWithPassword')
        .mockResolvedValueOnce({
          data: {
            session: {
              access_token: 'mock-jwt-token',
              refresh_token: 'mock-refresh-token',
              expires_in: 3600,
              token_type: 'bearer',
            },
          },
          error: null,
        } as any);

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
      expect(supabaseSignInMock).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar UnauthorizedException si las credenciales son incorrectas', async () => {
      jest.spyOn(service['supabase'].auth, 'signInWithPassword').mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' },
      } as any);

      await expect(service.signIn(mockDto)).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar ForbiddenException si el correo no está confirmado', async () => {
      jest.spyOn(service['supabase'].auth, 'signInWithPassword').mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Email not confirmed' },
      } as any);

      await expect(service.signIn(mockDto)).rejects.toThrow(ForbiddenException);
    });

    it('debería lanzar InternalServerErrorException para errores generales', async () => {
      jest.spyOn(service['supabase'].auth, 'signInWithPassword').mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(service.signIn(mockDto)).rejects.toThrow(InternalServerErrorException);
    });
  });
});