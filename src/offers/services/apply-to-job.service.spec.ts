import { Test, TestingModule } from '@nestjs/testing';
import { ApplyToJobService } from './apply-to-job.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { ApplyToJobDto } from '../dto/apply-to-job.dto';

describe('ApplyToJobService', () => {
  let service: ApplyToJobService;

  beforeEach(async () => {
    const mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('dummy-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplyToJobService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ApplyToJobService>(ApplyToJobService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería registrar una postulación exitosamente', async () => {
    const dynamoSendMock = jest
      .spyOn(service['docClient'] as any, 'send')
      .mockResolvedValueOnce({});

    const dto = {
      offer_id: 'offer-123',
      offer_title: 'Desarrollador',
      empresa: 'Tech Corp',
      resume_url: 'https://s3.aws.com/resume.pdf',
    };

    const result = await service.applyToJob('user-123', dto);

    expect(result.statusCode).toBe(201);
    expect(result.application.status).toBe('enviada');
    expect(dynamoSendMock).toHaveBeenCalledTimes(1);
  });

  it('debería lanzar InternalServerErrorException si DynamoDB falla', async () => {
    jest
      .spyOn(service['docClient'] as any, 'send')
      .mockRejectedValueOnce(new Error('DB Error'));
    await expect(
      service.applyToJob('user-123', {} as ApplyToJobDto),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
