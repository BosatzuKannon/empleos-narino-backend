import { Test, TestingModule } from '@nestjs/testing';
import { GetOfferApplicationsService } from './get-offer-applications.service';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('GetOfferApplicationsService', () => {
  let service: GetOfferApplicationsService;
  let prismaMock: { application: { findMany: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      application: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOfferApplicationsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<GetOfferApplicationsService>(
      GetOfferApplicationsService,
    );
  });

  it('debería obtener los candidatos de una oferta', async () => {
    const mockApplications = [
      { userId: 'USER#123', jobId: 'offer-123', status: 'SENT' },
    ];
    prismaMock.application.findMany.mockResolvedValueOnce(mockApplications);

    const result = await service.getOfferApplications('offer-123');

    expect(result.statusCode).toBe(200);
    expect(result.count).toBe(1);
    expect(result.candidates).toEqual(mockApplications);
    expect(prismaMock.application.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.application.findMany).toHaveBeenCalledWith({
      where: { jobId: 'offer-123' },
      include: { user: true },
    });
  });

  it('debería manejar error de Prisma', async () => {
    prismaMock.application.findMany.mockRejectedValueOnce(new Error('Error'));
    await expect(service.getOfferApplications('offer-123')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
