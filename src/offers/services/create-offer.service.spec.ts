import { Test, TestingModule } from '@nestjs/testing';
import { CreateOfferService } from './create-offer.service';
import { PrismaService } from '../../prisma.service';
import { PushNotificationService } from '../../push-notifications/push-notifications.service';
import { InternalServerErrorException } from '@nestjs/common';
import { CreateOfferDto } from '../dto/create-offer.dto';

describe('CreateOfferService', () => {
  let service: CreateOfferService;
  let prismaMock: {
    company: { findFirst: jest.Mock };
    jobVacancy: { create: jest.Mock };
  };
  let pushNotificationServiceMock: { sendToCandidates: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      company: { findFirst: jest.fn() },
      jobVacancy: { create: jest.fn() },
    };

    pushNotificationServiceMock = {
      sendToCandidates: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOfferService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: PushNotificationService,
          useValue: pushNotificationServiceMock,
        },
      ],
    }).compile();

    service = module.get<CreateOfferService>(CreateOfferService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear una oferta exitosamente y notificar a candidatos', async () => {
    const mockCompany = {
      id: 'company-456',
      ownerId: 'user-123',
      name: 'Fucsol',
    };
    const mockCreatedOffer = {
      id: 'test-uuid-1234',
      title: 'Dev',
      description: 'Test',
      location: 'Pasto',
      salary: 1000,
      contractType: 'Indefinido',
      requirements: 'Test',
      status: 'ACTIVE',
      companyId: 'company-456',
    };

    prismaMock.company.findFirst.mockResolvedValueOnce(mockCompany);
    prismaMock.jobVacancy.create.mockResolvedValueOnce(mockCreatedOffer);

    const dto: CreateOfferDto = {
      titulo: 'Dev',
      empresa: 'Fucsol',
      ubicacion: 'Pasto',
      salario: 1000,
      tipo_contrato: 'Indefinido',
      descripcion: 'Test',
      requisitos: 'Test',
    };

    const result = await service.createOffer('user-123', dto);

    expect(result.statusCode).toBe(201);
    expect(result.offer).toEqual(mockCreatedOffer);
    expect(prismaMock.company.findFirst).toHaveBeenCalledWith({
      where: { ownerId: 'user-123' },
    });
    expect(prismaMock.jobVacancy.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.jobVacancy.create).toHaveBeenCalledWith({
      data: {
        title: 'Dev',
        description: 'Test',
        location: 'Pasto',
        salary: 1000,
        contractType: 'Indefinido',
        modality: 'Presencial',
        requirements: 'Test',
        status: 'ACTIVE',
        companyId: 'company-456',
      },
    });
    expect(pushNotificationServiceMock.sendToCandidates).toHaveBeenCalledTimes(
      1,
    );
    const pushCalls = pushNotificationServiceMock.sendToCandidates.mock
      .calls as unknown as Array<
      [{ title: string; body: string; data: Record<string, unknown> }]
    >;
    expect(pushCalls[0][0].title).toBe('Nueva oferta en Empleos Nariño');
    expect(pushCalls[0][0].body).toContain('Dev');
    expect(pushCalls[0][0].data.offerId).toBe('test-uuid-1234');
  });

  it('debería lanzar NotFoundException si no hay empresa', async () => {
    prismaMock.company.findFirst.mockResolvedValueOnce(null);

    const dto: CreateOfferDto = {
      titulo: 'Dev',
      empresa: 'Fucsol',
      ubicacion: 'Pasto',
      salario: 1000,
      tipo_contrato: 'Indefinido',
      descripcion: 'Test',
      requisitos: 'Test',
    };

    await expect(service.createOffer('user-123', dto)).rejects.toThrow(
      'No se encontró una empresa asociada a este usuario',
    );
  });

  it('debería lanzar InternalServerErrorException si Prisma falla', async () => {
    prismaMock.company.findFirst.mockRejectedValueOnce(new Error('Fallo DB'));

    await expect(
      service.createOffer('user-123', {} as CreateOfferDto),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
