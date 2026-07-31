import { Test, TestingModule } from '@nestjs/testing';
import { SignupService } from './signup.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../../email/email.service';
import { InternalServerErrorException } from '@nestjs/common';
import * as supabaseModule from '@supabase/supabase-js';

interface MockedSignupModule {
  __mockCreateUser: jest.Mock;
}

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
  let emailServiceMock: { sendOtpEmail: jest.Mock };
  let mockCreateUser: jest.Mock;

  beforeEach(async () => {
    const mockedModule = supabaseModule as unknown as MockedSignupModule;
    mockCreateUser = mockedModule.__mockCreateUser;
    mockCreateUser.mockReset();

    prismaMock = {
      user: { update: jest.fn() },
      company: { create: jest.fn() },
    };

    emailServiceMock = {
      sendOtpEmail: jest.fn().mockResolvedValue(undefined),
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
        { provide: EmailService, useValue: emailServiceMock },
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

    it('debería registrar un usuario exitosamente y enviar el OTP', async () => {
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

      const updateCalls = prismaMock.user.update.mock.calls as unknown as Array<
        [
          {
            where: { id: string };
            data: {
              isVerified: boolean;
              otpCode: string;
              otpExpiresAt: Date;
            };
          },
        ]
      >;
      const updateArg = updateCalls[0][0];
      expect(updateArg.where).toEqual({ id: 'mock-id' });
      expect(updateArg.data.isVerified).toBe(false);
      expect(updateArg.data.otpCode.startsWith('scrypt$')).toBe(true);
      expect(updateArg.data.otpExpiresAt).toBeInstanceOf(Date);

      expect(emailServiceMock.sendOtpEmail).toHaveBeenCalledTimes(1);
      const otpCalls = emailServiceMock.sendOtpEmail.mock
        .calls as unknown as Array<[{ to: string; name: string; otp: string }]>;
      const otpArg = otpCalls[0][0];
      expect(otpArg.to).toBe(mockDto.email);
      expect(otpArg.name).toBe(mockDto.nombres);
      expect(otpArg.otp).toMatch(/^\d{6}$/);
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
