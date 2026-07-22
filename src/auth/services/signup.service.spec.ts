import { Test, TestingModule } from '@nestjs/testing';
import { SignupService } from './signup.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';

jest.mock('@supabase/supabase-js', () => {
  const mockCreateUser = jest.fn();
  return {
    createClient: jest.fn(() => ({
      auth: {
        admin: {
          createUser: mockCreateUser,
        },
      },
    })),
    __mockCreateUser: mockCreateUser,
  };
});

describe('SignupService', () => {
  let service: SignupService;
  let prismaMock: {
    user: { update: jest.Mock };
    company: { create: jest.Mock };
  };
  let mockCreateUser: jest.Mock;

  beforeEach(async () => {
    const supabaseModule = require('@supabase/supabase-js');
    mockCreateUser = supabaseModule.__mockCreateUser;
    mockCreateUser.mockReset();

    prismaMock = {
      user: { update: jest.fn() },
      company: { create: jest.fn() },
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
        SignupService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<SignupService>(SignupService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
    const mockDto = {
      email: 'prueba@empleosnarino.com',
      password: 'Password123!',
      nombres: 'Carlos',
      apellidos: 'Jaramillo',
      telefono: '3175345577',
      user_type: 'candidato',
      fecha_nacimiento: '1988-05-15',
      ciudad: 'Pasto',
      nombre_empresa: '',
    };

    it('debería registrar un usuario exitosamente', async () => {
      mockCreateUser.mockResolvedValueOnce({
        data: { user: { id: 'mock-id' } },
        error: null,
      });
      prismaMock.user.update.mockResolvedValueOnce({});

      const result = await service.signUp(mockDto);

      expect(result.statusCode).toBe(201);
      expect(result.message).toContain('Registro exitoso');
      expect(mockCreateUser).toHaveBeenCalledTimes(1);
      expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar InternalServerErrorException si el correo ya está registrado', async () => {
      mockCreateUser.mockResolvedValueOnce({
        data: { user: null },
        error: {
          message: 'A user with this email address has already been registered',
        },
      });

      await expect(service.signUp(mockDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('debería lanzar InternalServerErrorException si ocurre un error general', async () => {
      mockCreateUser.mockRejectedValueOnce(new Error('Fallo de conexión'));

      await expect(service.signUp(mockDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
