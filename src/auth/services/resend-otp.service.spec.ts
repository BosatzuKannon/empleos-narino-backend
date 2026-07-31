import { Test, TestingModule } from '@nestjs/testing';
import { ResendOtpService } from './resend-otp.service';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../../email/email.service';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('ResendOtpService', () => {
  let service: ResendOtpService;
  let prismaMock: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let emailServiceMock: { sendOtpEmail: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    emailServiceMock = {
      sendOtpEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResendOtpService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmailService, useValue: emailServiceMock },
      ],
    }).compile();

    service = module.get<ResendOtpService>(ResendOtpService);
  });

  it('debería generar un nuevo OTP y enviarlo', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'prueba@empleosnarino.com',
      firstName: 'Ana',
      isVerified: false,
    });
    prismaMock.user.update.mockResolvedValueOnce({});

    const result = await service.resendOtp({
      email: 'Prueba@EmpleosNarino.com',
    });

    expect(result.statusCode).toBe(200);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'prueba@empleosnarino.com' },
    });
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    const updateCalls = prismaMock.user.update.mock.calls as unknown as Array<
      [
        {
          where: { id: string };
          data: { isVerified: boolean; otpCode: string; otpExpiresAt: Date };
        },
      ]
    >;
    const updateArg = updateCalls[0][0];
    expect(updateArg.where).toEqual({ id: 'user-1' });
    expect(updateArg.data.isVerified).toBe(false);
    expect(updateArg.data.otpCode.startsWith('scrypt$')).toBe(true);
    expect(updateArg.data.otpExpiresAt).toBeInstanceOf(Date);

    expect(emailServiceMock.sendOtpEmail).toHaveBeenCalledTimes(1);
    const otpCalls = emailServiceMock.sendOtpEmail.mock
      .calls as unknown as Array<[{ to: string; name: string; otp: string }]>;
    const otpArg = otpCalls[0][0];
    expect(otpArg.to).toBe('prueba@empleosnarino.com');
    expect(otpArg.name).toBe('Ana');
    expect(otpArg.otp).toMatch(/^\d{6}$/);
  });

  it('debería lanzar NotFoundException si el usuario no existe', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.resendOtp({ email: 'noexiste@empleosnarino.com' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('debería lanzar BadRequestException si la cuenta ya está verificada', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'prueba@empleosnarino.com',
      isVerified: true,
    });

    await expect(
      service.resendOtp({ email: 'prueba@empleosnarino.com' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debería lanzar InternalServerErrorException en errores generales', async () => {
    prismaMock.user.findUnique.mockRejectedValueOnce(new Error('DB error'));

    await expect(
      service.resendOtp({ email: 'prueba@empleosnarino.com' }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
