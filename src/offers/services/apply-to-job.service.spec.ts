import { Test, TestingModule } from '@nestjs/testing';
import { ApplyToJobService } from './apply-to-job.service';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';
import { ApplyToJobDto } from '../dto/apply-to-job.dto';

describe('ApplyToJobService', () => {
  let service: ApplyToJobService;
  let prismaMock: { application: { create: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      application: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplyToJobService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ApplyToJobService>(ApplyToJobService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería registrar una postulación exitosamente', async () => {
    const mockApplication = {
      id: 'app-uuid-1234',
      userId: 'user-123',
      jobId: 'offer-123',
      status: 'SENT',
    };

    prismaMock.application.create.mockResolvedValueOnce(mockApplication);

    const dto: ApplyToJobDto = {
      offer_id: 'offer-123',
      offer_title: 'Desarrollador',
      empresa: 'Tech Corp',
      resume_url: 'https://s3.aws.com/resume.pdf',
    };

    const result = await service.applyToJob('user-123', dto);

    expect(result.statusCode).toBe(201);
    expect(result.application.status).toBe('SENT');
    expect(prismaMock.application.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.application.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        jobId: 'offer-123',
        status: 'SENT',
      },
    });
  });

  it('debería lanzar InternalServerErrorException si Prisma falla', async () => {
    prismaMock.application.create.mockRejectedValueOnce(new Error('DB Error'));
    await expect(
      service.applyToJob('user-123', {} as ApplyToJobDto),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
