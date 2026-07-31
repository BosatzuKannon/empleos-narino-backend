import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { EmailService } from './email.service';
import { EntityStatus, ApplicationStatus } from '@prisma/client';
import sgMail from '@sendgrid/mail';

jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: {
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue({}),
  },
}));

interface SentEmail {
  to: string;
  from: string;
  subject: string;
  html: string;
}

describe('EmailService', () => {
  let service: EmailService;
  let prismaMock: { user: { findUnique: jest.Mock } };
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const sgSendMock = jest.mocked(sgMail.send) as jest.Mock;

  function lastSentEmail(): SentEmail {
    const calls = sgSendMock.mock.calls as unknown as SentEmail[][];
    return calls[0][0];
  }

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        SENDGRID_API_KEY: 'mock-sendgrid-key',
        SENDGRID_SENDER_EMAIL: 'test@empleosnarino.com',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    prismaMock = {
      user: { findUnique: jest.fn() },
    };

    sgSendMock.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOtpEmail', () => {
    it('debería enviar el correo OTP sin importar preferencias', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      await service.sendOtpEmail({
        to: 'usuario@test.com',
        name: 'Ana',
        otp: '123456',
      });

      expect(sgSendMock).toHaveBeenCalledTimes(1);
      const sent = lastSentEmail();
      expect(sent.to).toBe('usuario@test.com');
      expect(sent.from).toBe('test@empleosnarino.com');
      expect(sent.subject).toContain('Confirma tu cuenta');
      expect(sent.html).toContain('123456');
      expect(sent.html).toContain('#558B2F');
    });
  });

  describe('sendOfferStatusEmail', () => {
    it('debería enviar cuando el usuario acepta correos transaccionales', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        email: 'empresa@test.com',
        preferences: { emailTransactional: true },
      });

      await service.sendOfferStatusEmail({
        to: 'empresa@test.com',
        offerTitle: 'Desarrollador',
        status: EntityStatus.ACTIVE,
      });

      expect(sgSendMock).toHaveBeenCalledTimes(1);
      expect(lastSentEmail().subject).toContain('Desarrollador');
    });

    it('no debería enviar cuando emailTransactional es false', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        email: 'empresa@test.com',
        preferences: { emailTransactional: false },
      });

      await service.sendOfferStatusEmail({
        to: 'empresa@test.com',
        offerTitle: 'Desarrollador',
        status: EntityStatus.ACTIVE,
      });

      expect(sgSendMock).not.toHaveBeenCalled();
    });

    it('no debería enviar si el usuario no existe', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      await service.sendOfferStatusEmail({
        to: 'noexiste@test.com',
        offerTitle: 'Desarrollador',
        status: EntityStatus.ACTIVE,
      });

      expect(sgSendMock).not.toHaveBeenCalled();
    });
  });

  describe('sendApplicationStatusEmail', () => {
    it('debería enviar cuando el usuario acepta correos transaccionales', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        email: 'candidato@test.com',
        preferences: null,
      });

      await service.sendApplicationStatusEmail({
        to: 'candidato@test.com',
        offerTitle: 'Atención al cliente',
        status: ApplicationStatus.HIRED,
      });

      expect(sgSendMock).toHaveBeenCalledTimes(1);
      expect(lastSentEmail().subject).toContain('seleccionado');
    });

    it('no debería enviar cuando emailTransactional es false', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        email: 'candidato@test.com',
        preferences: { emailTransactional: false },
      });

      await service.sendApplicationStatusEmail({
        to: 'candidato@test.com',
        offerTitle: 'Atención al cliente',
        status: ApplicationStatus.REVIEWED,
      });

      expect(sgSendMock).not.toHaveBeenCalled();
    });
  });
});
