import { Test, TestingModule } from '@nestjs/testing';
import { GoogleSignInService } from './google-signin.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import * as googleAuthModule from 'google-auth-library';
import * as supabaseModule from '@supabase/supabase-js';

jest.mock('google-auth-library', () => {
  const verifyIdToken = jest.fn();
  return {
    OAuth2Client: jest.fn(() => ({ verifyIdToken })),
    __verifyIdToken: verifyIdToken,
  };
});

jest.mock('@supabase/supabase-js', () => {
  const signInWithIdToken = jest.fn();
  const updateUserById = jest.fn();
  return {
    createClient: jest.fn(() => ({
      auth: { signInWithIdToken, admin: { updateUserById } },
    })),
    __signInWithIdToken: signInWithIdToken,
    __updateUserById: updateUserById,
  };
});

interface MockedGoogleModule {
  __verifyIdToken: jest.Mock;
}

interface MockedSupabaseModule {
  __signInWithIdToken: jest.Mock;
  __updateUserById: jest.Mock;
}

describe('GoogleSignInService', () => {
  let service: GoogleSignInService;
  let verifyIdToken: jest.Mock;
  let signInWithIdToken: jest.Mock;
  let updateUserById: jest.Mock;
  let prismaMock: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    company: { findFirst: jest.Mock };
  };

  const googleTicket = {
    getPayload: () => ({
      email: 'ana@example.com',
      name: 'Ana Gómez',
      sub: 'google-sub-123',
      picture: 'https://example.com/ana.jpg',
    }),
  };

  const supabaseSession = {
    data: {
      user: { id: 'supabase-uid-123', email: 'ana@example.com' },
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
      },
    },
    error: null,
  };

  beforeEach(async () => {
    verifyIdToken = (googleAuthModule as unknown as MockedGoogleModule)
      .__verifyIdToken;
    signInWithIdToken = (supabaseModule as unknown as MockedSupabaseModule)
      .__signInWithIdToken;
    updateUserById = (supabaseModule as unknown as MockedSupabaseModule)
      .__updateUserById;
    verifyIdToken.mockReset();
    signInWithIdToken.mockReset();
    updateUserById.mockReset();

    prismaMock = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      company: { findFirst: jest.fn() },
    };

    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SUPABASE_URL: 'https://mock-url.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
          GOOGLE_WEB_CLIENT_ID: 'mock-web-client-id',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleSignInService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<GoogleSignInService>(GoogleSignInService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear el usuario si no existe y devolver token + usuario', async () => {
    verifyIdToken.mockResolvedValue(googleTicket);
    signInWithIdToken.mockResolvedValue(supabaseSession);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce({
      id: 'supabase-uid-123',
      email: 'ana@example.com',
      firstName: 'Ana',
      lastName: 'Gómez',
      googleId: 'google-sub-123',
      avatarUrl: 'https://example.com/ana.jpg',
      role: 'PENDING',
      phone: '',
      city: '',
    });

    const result = (await service.signInWithGoogle({
      idToken: 'valid-id-token',
    })) as {
      authenticationResult: { AccessToken: string };
      user: { id: string; nombre: string };
    };

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        id: 'supabase-uid-123',
        email: 'ana@example.com',
        firstName: 'Ana',
        lastName: 'Gómez',
        googleId: 'google-sub-123',
        avatarUrl: 'https://example.com/ana.jpg',
        role: 'PENDING',
        isVerified: true,
      },
    });
    expect(result.authenticationResult.AccessToken).toBe('mock-access-token');
    expect(result.user.nombre).toBe('Ana');
    expect(updateUserById).toHaveBeenCalledWith('supabase-uid-123', {
      user_metadata: { role: 'PENDING' },
    });
  });

  it('debería actualizar googleId/avatarUrl si el usuario ya existe', async () => {
    verifyIdToken.mockResolvedValue(googleTicket);
    signInWithIdToken.mockResolvedValue(supabaseSession);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'supabase-uid-123',
      email: 'ana@example.com',
      firstName: 'Ana',
      lastName: 'Gómez',
      googleId: null,
      avatarUrl: null,
      role: 'CANDIDATE',
      phone: '',
      city: '',
    });
    prismaMock.user.update.mockResolvedValueOnce({
      id: 'supabase-uid-123',
      email: 'ana@example.com',
      firstName: 'Ana',
      lastName: 'Gómez',
      googleId: 'google-sub-123',
      avatarUrl: 'https://example.com/ana.jpg',
      role: 'CANDIDATE',
      phone: '',
      city: '',
    });

    const result = (await service.signInWithGoogle({
      idToken: 'valid-id-token',
    })) as {
      authenticationResult: { AccessToken: string };
      user: { id: string; nombre: string };
    };

    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'supabase-uid-123' },
      data: {
        googleId: 'google-sub-123',
        avatarUrl: 'https://example.com/ana.jpg',
        firstName: 'Ana',
        lastName: 'Gómez',
      },
    });
    expect(result.user.id).toBe('supabase-uid-123');
  });

  it('debería lanzar UnauthorizedException si el token de Google es inválido', async () => {
    verifyIdToken.mockRejectedValue(new Error('Invalid token signature'));

    await expect(
      service.signInWithGoogle({ idToken: 'bad-token' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
