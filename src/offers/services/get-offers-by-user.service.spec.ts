import { Test, TestingModule } from '@nestjs/testing';
import { GetOffersByUserService } from './get-offers-by-user.service';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('GetOffersByUserService', () => {
  let service: GetOffersByUserService;
  let prismaMock: {
    company: { findFirst: jest.Mock };
    jobVacancy: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prismaMock = {
      company: { findFirst: jest.fn() },
      jobVacancy: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOffersByUserService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<GetOffersByUserService>(GetOffersByUserService);
  });

  it('debería obtener ofertas de un usuario', async () => {
    const mockCompany = { id: 'company-789', ownerId: 'USER#123' };
    const mockOffers = [
      { id: '1', companyId: 'company-789', title: 'Dev', company: mockCompany },
    ];

    prismaMock.company.findFirst.mockResolvedValueOnce(mockCompany);
    prismaMock.jobVacancy.findMany.mockResolvedValueOnce(mockOffers);

    const result = await service.getOffersByUser('USER#123');

    expect(result.statusCode).toBe(200);
    expect(result.count).toBe(1);
    expect(result.data).toEqual(mockOffers);
    expect(prismaMock.company.findFirst).toHaveBeenCalledWith({
      where: { ownerId: 'USER#123' },
    });
    expect(prismaMock.jobVacancy.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.jobVacancy.findMany).toHaveBeenCalledWith({
      where: { companyId: 'company-789' },
      orderBy: { createdAt: 'desc' },
      include: { company: true },
    });
  });

  it('debería retornar array vacío si no hay empresa', async () => {
    prismaMock.company.findFirst.mockResolvedValueOnce(null);

    const result = await service.getOffersByUser('USER#456');

    expect(result.statusCode).toBe(200);
    expect(result.count).toBe(0);
    expect(result.data).toEqual([]);
    expect(prismaMock.jobVacancy.findMany).not.toHaveBeenCalled();
  });

  it('debería manejar error de Prisma', async () => {
    prismaMock.company.findFirst.mockRejectedValueOnce(new Error('Error'));
    await expect(service.getOffersByUser('123')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
