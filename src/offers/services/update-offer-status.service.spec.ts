import { Test, TestingModule } from '@nestjs/testing';
import { UpdateOfferStatusService } from './update-offer-status.service';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../../email/email.service';
import { InternalServerErrorException } from '@nestjs/common';
import { EntityStatus } from '@prisma/client';

describe('UpdateOfferStatusService', () => {
  let service: UpdateOfferStatusService;
  let prismaMock: { jobVacancy: { update: jest.Mock } };
  let emailServiceMock: { sendOfferStatusEmail: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      jobVacancy: {
        update: jest.fn(),
      },
    };

    emailServiceMock = {
      sendOfferStatusEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOfferStatusService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmailService, useValue: emailServiceMock },
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

    const dto = { status: 'activo', creatorEmail: 'test@test.com' };
    const result = await service.updateOfferStatus('offer-123', 'admin', dto);

    expect(result.statusCode).toBe(200);
    expect(result.new_status).toBe('ACTIVE');
    expect(prismaMock.jobVacancy.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.jobVacancy.update).toHaveBeenCalledWith({
      where: { id: 'offer-123' },
      data: { status: EntityStatus.ACTIVE },
    });
    expect(emailServiceMock.sendOfferStatusEmail).toHaveBeenCalledTimes(1);
    expect(emailServiceMock.sendOfferStatusEmail).toHaveBeenCalledWith({
      to: 'test@test.com',
      offerTitle: 'Dev',
      status: EntityStatus.ACTIVE,
    });
  });

  it('no debería enviar correo sin creatorEmail', async () => {
    const mockUpdatedOffer = {
      id: 'offer-123',
      title: 'Dev',
      status: 'ACTIVE',
      updatedAt: new Date('2023-01-01'),
    };
    prismaMock.jobVacancy.update.mockResolvedValueOnce(mockUpdatedOffer);

    const dto = { status: 'activo' };
    await service.updateOfferStatus('offer-123', 'admin', dto);

    expect(emailServiceMock.sendOfferStatusEmail).not.toHaveBeenCalled();
  });

  it('debería manejar error de Prisma', async () => {
    prismaMock.jobVacancy.update.mockRejectedValueOnce(new Error('Error'));
    await expect(
      service.updateOfferStatus('123', 'admin', { status: 'inactivo' }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
