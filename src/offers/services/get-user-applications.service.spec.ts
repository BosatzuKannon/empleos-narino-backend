import { Test, TestingModule } from '@nestjs/testing';
import { GetUserApplicationsService } from './get-user-applications.service';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('GetUserApplicationsService', () => {
  let service: GetUserApplicationsService;
  let prismaMock: { application: { findMany: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      application: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserApplicationsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<GetUserApplicationsService>(
      GetUserApplicationsService,
    );
  });

  it('debería obtener las postulaciones de un usuario', async () => {
    const mockApplications = [
      { userId: 'user-123', jobId: 'job-456', status: 'SENT' },
    ];
    prismaMock.application.findMany.mockResolvedValueOnce(mockApplications);

    const result = await service.getUserApplications('user-123');

    expect(result.statusCode).toBe(200);
    expect(result.count).toBe(1);
    expect(result.applications).toEqual(mockApplications);
    expect(prismaMock.application.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.application.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      include: { jobVacancy: true },
    });
  });

  it('debería manejar error de Prisma', async () => {
    prismaMock.application.findMany.mockRejectedValueOnce(new Error('Error'));
    await expect(service.getUserApplications('user-123')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
