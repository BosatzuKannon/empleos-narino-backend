import { Test, TestingModule } from '@nestjs/testing';
import { VerifyOtpService } from './verify-otp.service';
import { PrismaService } from '../../prisma.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { hashOtp } from '../../common/utils/otp.util';

describe('VerifyOtpService', () => {
  let service: VerifyOtpService;
  let prismaMock: { user: { findUnique: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyOtpService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<VerifyOtpService>(VerifyOtpService);
  });

  const baseUser = {
    id: 'user-1',
    email: 'prueba@empleosnarino.com',
    firstName: 'Ana',
    isVerified: false,
    otpCode: hashOtp('123456'),
    otpExpiresAt: new Date(Date.now() + 60000),
  };

  it('debería verificar la cuenta con un código válido', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ ...baseUser });
    prismaMock.user.update.mockResolvedValueOnce({});

    const result = await service.verifyOtp({
      email: 'Prueba@EmpleosNarino.com',
      code: '123456',
    });

    expect(result.statusCode).toBe(200);
    expect(result.message).toContain('Cuenta verificada');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'prueba@empleosnarino.com' },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { isVerified: true, otpCode: null, otpExpiresAt: null },
    });
  });

  it('debería rechazar un código incorrecto', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ ...baseUser });

    await expect(
      service.verifyOtp({ email: 'prueba@empleosnarino.com', code: '000000' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debería rechazar un código expirado', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...baseUser,
      otpExpiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      service.verifyOtp({ email: 'prueba@empleosnarino.com', code: '123456' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debería rechazar usuarios sin OTP pendiente', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.verifyOtp({ email: 'prueba@empleosnarino.com', code: '123456' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debería rechazar cuentas ya verificadas', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...baseUser,
      isVerified: true,
    });

    await expect(
      service.verifyOtp({ email: 'prueba@empleosnarino.com', code: '123456' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debería lanzar InternalServerErrorException en errores generales', async () => {
    prismaMock.user.findUnique.mockRejectedValueOnce(new Error('DB error'));

    await expect(
      service.verifyOtp({ email: 'prueba@empleosnarino.com', code: '123456' }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
