import { Test, TestingModule } from '@nestjs/testing';
import { GetOffersByUserService } from './get-offers-by-user.service';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('GetOffersByUserService', () => {
  let service: GetOffersByUserService;
  let prismaMock: { jobVacancy: { findMany: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      jobVacancy: {
        findMany: jest.fn(),
      },
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
    const mockOffers = [{ id: '1', companyId: 'USER#123', title: 'Dev' }];
    prismaMock.jobVacancy.findMany.mockResolvedValueOnce(mockOffers);

    const result = await service.getOffersByUser('USER#123');

    expect(result.statusCode).toBe(200);
    expect(result.count).toBe(1);
    expect(result.data).toEqual(mockOffers);
    expect(prismaMock.jobVacancy.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.jobVacancy.findMany).toHaveBeenCalledWith({
      where: { companyId: 'USER#123' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('debería manejar error de Prisma', async () => {
    prismaMock.jobVacancy.findMany.mockRejectedValueOnce(new Error('Error'));
    await expect(service.getOffersByUser('123')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
