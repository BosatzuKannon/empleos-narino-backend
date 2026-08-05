import { Test, TestingModule } from '@nestjs/testing';
import { CreateServiceService } from './create-service.service';
import { PrismaService } from '../../prisma.service';
import { PushNotificationService } from '../../push-notifications/push-notifications.service';
import {
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('CreateServiceService', () => {
  let service: CreateServiceService;
  let prismaMock: {
    user: { findUnique: jest.Mock };
    serviceCategory: { findUnique: jest.Mock };
    service: { create: jest.Mock };
  };
  let pushNotificationServiceMock: { sendToCompanies: jest.Mock };

  const dto = {
    categoryId: 'cat-1',
    title: 'Pintor',
    description: 'Trabajo de pintura',
    municipality: 'Pasto',
    price: 50000,
    priceType: 'FIXED',
  };

  beforeEach(async () => {
    prismaMock = {
      user: { findUnique: jest.fn() },
      serviceCategory: { findUnique: jest.fn() },
      service: { create: jest.fn() },
    };

    pushNotificationServiceMock = {
      sendToCompanies: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateServiceService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: PushNotificationService,
          useValue: pushNotificationServiceMock,
        },
      ],
    }).compile();

    service = module.get<CreateServiceService>(CreateServiceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear un servicio exitosamente', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ role: 'CANDIDATE' });
    prismaMock.serviceCategory.findUnique.mockResolvedValueOnce({ id: 'cat-1' });
    prismaMock.service.create.mockResolvedValueOnce({ id: 'svc-1', title: 'Pintor' });

    const result = await service.createService('user-123', dto);

    expect(result.statusCode).toBe(201);
    expect(prismaMock.service.create).toHaveBeenCalledTimes(1);
    expect(pushNotificationServiceMock.sendToCompanies).toHaveBeenCalledTimes(1);
  });

  it('debería lanzar BadRequestException con P2003 (categoría inválida)', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ role: 'CANDIDATE' });
    prismaMock.serviceCategory.findUnique.mockResolvedValueOnce({ id: 'cat-1' });
    prismaMock.service.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('fk', {
        code: 'P2003',
        clientVersion: '6',
        meta: { field_name: 'service_categoryId_fkey' },
      }),
    );

    await expect(service.createService('user-123', dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('debería lanzar ConflictException con P2002', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ role: 'CANDIDATE' });
    prismaMock.serviceCategory.findUnique.mockResolvedValueOnce({ id: 'cat-1' });
    prismaMock.service.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: '6',
      }),
    );

    await expect(service.createService('user-123', dto)).rejects.toThrow(
      ConflictException,
    );
  });

  it('debería lanzar InternalServerErrorException con errores desconocidos', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ role: 'CANDIDATE' });
    prismaMock.serviceCategory.findUnique.mockResolvedValueOnce({ id: 'cat-1' });
    prismaMock.service.create.mockRejectedValueOnce(new Error('Fallo DB'));

    await expect(service.createService('user-123', dto)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
