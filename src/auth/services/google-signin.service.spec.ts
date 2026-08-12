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
  const createUser = jest.fn();
  const listUsers = jest.fn();
  return {
    createClient: jest.fn(() => ({
      auth: { admin: { createUser, listUsers } },
    })),
    __createUser: createUser,
    __listUsers: listUsers,
  };
});

interface MockedGoogleModule {
  __verifyIdToken: jest.Mock;
}

interface MockedSupabaseModule {
  __createUser: jest.Mock;
  __listUsers: jest.Mock;
}

describe('GoogleSignInService', () => {
  let service: GoogleSignInService;
  let verifyIdToken: jest.Mock;
  let createUser: jest.Mock;
  let listUsers: jest.Mock;
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

  const existingUser = {
    id: 'supabase-uid-123',
    email: 'ana@example.com',
    firstName: 'Ana',
    lastName: 'Gómez',
    googleId: null,
    avatarUrl: null,
    role: 'CANDIDATE',
    phone: '',
    city: '',
  };

  beforeEach(async () => {
    verifyIdToken = (googleAuthModule as unknown as MockedGoogleModule)
      .__verifyIdToken;
    createUser = (supabaseModule as unknown as MockedSupabaseModule)
      .__createUser;
    listUsers = (supabaseModule as unknown as MockedSupabaseModule).__listUsers;
    verifyIdToken.mockReset();
    createUser.mockReset();
    listUsers.mockReset();

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
          JWT_SECRET: 'mock-jwt-secret',
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

  it('debería solo iniciar sesión si el usuario ya existe en Prisma (sin llamar a Supabase admin)', async () => {
    verifyIdToken.mockResolvedValue(googleTicket);
    prismaMock.user.findUnique.mockResolvedValueOnce(existingUser);
    prismaMock.company.findFirst.mockResolvedValueOnce(null);

    const result = (await service.signInWithGoogle({
      idToken: 'valid-id-token',
    })) as {
      authenticationResult: { AccessToken: string };
      user: { id: string; nombre: string; role: string };
    };

    expect(createUser).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(result.authenticationResult.AccessToken.split('.')).toHaveLength(3);
    expect(result.user.id).toBe('supabase-uid-123');
    expect(result.user.role).toBe('CANDIDATE');
  });

  it('debería crear Supabase + Prisma si el usuario no existe (sin OTP) y devolver JWT', async () => {
    verifyIdToken.mockResolvedValue(googleTicket);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    createUser.mockResolvedValueOnce({
      data: {
        user: { id: 'supabase-uid-123', email: 'ana@example.com' },
      },
      error: null,
    });
    prismaMock.user.update.mockResolvedValueOnce({
      ...existingUser,
      googleId: 'google-sub-123',
      avatarUrl: 'https://example.com/ana.jpg',
      role: 'PENDING',
    });

    const result = (await service.signInWithGoogle({
      idToken: 'valid-id-token',
    })) as {
      authenticationResult: { AccessToken: string };
      user: { id: string; role: string };
    };

    expect(createUser).toHaveBeenCalledWith({
      email: 'ana@example.com',
      email_confirm: true,
      user_metadata: { role: 'PENDING' },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'supabase-uid-123' },
      data: {
        email: 'ana@example.com',
        firstName: 'Ana',
        lastName: 'Gómez',
        googleId: 'google-sub-123',
        avatarUrl: 'https://example.com/ana.jpg',
        role: 'PENDING',
        isVerified: true,
      },
    });
    expect(result.authenticationResult.AccessToken.split('.')).toHaveLength(3);
    expect(result.user.role).toBe('PENDING');
  });

  it('debería adoptar un usuario huérfano de Supabase si createUser dice email_exists', async () => {
    verifyIdToken.mockResolvedValue(googleTicket);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    createUser.mockResolvedValueOnce({
      data: null,
      error: new Error(
        'A user with this email address has already been registered',
      ),
    });
    listUsers.mockResolvedValueOnce({
      data: { users: [{ id: 'orphan-uid', email: 'ana@example.com' }] },
      error: null,
    });
    prismaMock.user.update.mockResolvedValueOnce({
      ...existingUser,
      id: 'orphan-uid',
      googleId: 'google-sub-123',
      role: 'PENDING',
    });

    const result = (await service.signInWithGoogle({
      idToken: 'valid-id-token',
    })) as { user: { id: string; role: string } };

    expect(listUsers).toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'orphan-uid' },
      data: {
        email: 'ana@example.com',
        firstName: 'Ana',
        lastName: 'Gómez',
        googleId: 'google-sub-123',
        avatarUrl: 'https://example.com/ana.jpg',
        role: 'PENDING',
        isVerified: true,
      },
    });
    expect(result.user.id).toBe('orphan-uid');
  });

  it('debería lanzar UnauthorizedException si el token de Google es inválido', async () => {
    verifyIdToken.mockRejectedValue(new Error('Invalid token signature'));

    await expect(
      service.signInWithGoogle({ idToken: 'bad-token' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
