import { Test, TestingModule } from '@nestjs/testing';
import { UpdateOfferStatusService } from './update-offer-status.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: {
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue({}),
  },
}));

describe('UpdateOfferStatusService', () => {
  let service: UpdateOfferStatusService;
  let prismaMock: { jobVacancy: { update: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      jobVacancy: {
        update: jest.fn(),
      },
    };

    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SENDGRID_API_KEY: 'mock-sendgrid-key',
          SENDGRID_SENDER_EMAIL: 'test@empleosnarino.com',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOfferStatusService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UpdateOfferStatusService>(UpdateOfferStatusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería actualizar estado y enviar correo si aplica', async () => {
    const mockUpdatedOffer = {
      id: 'offer-123',
      title: 'Dev',
      status: 'ACTIVE',
      updatedAt: new Date('2023-01-01'),
    };
    prismaMock.jobVacancy.update.mockResolvedValueOnce(mockUpdatedOffer);

    const dto = { status: 'ACTIVE', creatorEmail: 'test@test.com' };
    const result = await service.updateOfferStatus('offer-123', 'admin', dto);

    expect(result.statusCode).toBe(200);
    expect(result.new_status).toBe('ACTIVE');
    expect(prismaMock.jobVacancy.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.jobVacancy.update).toHaveBeenCalledWith({
      where: { id: 'offer-123' },
      data: { status: 'ACTIVE' },
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(jest.mocked(sgMail.send)).toHaveBeenCalledTimes(1);
  });

  it('debería manejar error de Prisma', async () => {
    prismaMock.jobVacancy.update.mockRejectedValueOnce(new Error('Error'));
    await expect(
      service.updateOfferStatus('123', 'admin', { status: 'INACTIVE' }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
