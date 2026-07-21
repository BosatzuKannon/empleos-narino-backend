import { Test, TestingModule } from '@nestjs/testing';
import { GetActiveOffersService } from './get-active-offers.service';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('GetActiveOffersService', () => {
  let service: GetActiveOffersService;
  let prismaMock: { jobVacancy: { findMany: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      jobVacancy: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetActiveOffersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<GetActiveOffersService>(GetActiveOffersService);
  });

  it('debería obtener ofertas activas', async () => {
    const mockOffers = [{ id: '1', title: 'Dev', status: 'ACTIVE' }];
    prismaMock.jobVacancy.findMany.mockResolvedValueOnce(mockOffers);

    const result = await service.getActiveOffers();

    expect(result.statusCode).toBe(200);
    expect(result.offers).toEqual(mockOffers);
    expect(prismaMock.jobVacancy.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.jobVacancy.findMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: { company: true },
    });
  });

  it('debería manejar error de Prisma', async () => {
    prismaMock.jobVacancy.findMany.mockRejectedValueOnce(new Error('Error'));
    await expect(service.getActiveOffers()).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
