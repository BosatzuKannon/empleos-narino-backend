import { Test, TestingModule } from '@nestjs/testing';
import { CreateOfferService } from './create-offer.service';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';
import { CreateOfferDto } from '../dto/create-offer.dto';

describe('CreateOfferService', () => {
  let service: CreateOfferService;
  let prismaMock: { jobVacancy: { create: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      jobVacancy: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOfferService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CreateOfferService>(CreateOfferService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear una oferta exitosamente', async () => {
    const mockCreatedOffer = {
      id: 'test-uuid-1234',
      title: 'Dev',
      description: 'Test',
      location: 'Pasto',
      salary: 1000,
      contractType: 'Indefinido',
      requirements: 'Test',
      status: 'ACTIVE',
      companyId: 'user-123',
    };

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
    expect(prismaMock.jobVacancy.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.jobVacancy.create).toHaveBeenCalledWith({
      data: {
        title: 'Dev',
        description: 'Test',
        location: 'Pasto',
        salary: 1000,
        contractType: 'Indefinido',
        requirements: 'Test',
        status: 'ACTIVE',
        companyId: 'user-123',
      },
    });
  });

  it('debería lanzar InternalServerErrorException si Prisma falla', async () => {
    prismaMock.jobVacancy.create.mockRejectedValueOnce(new Error('Fallo DB'));

    await expect(
      service.createOffer('user-123', {} as CreateOfferDto),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
