import { Test, TestingModule } from '@nestjs/testing';
import { UpdateApplicationStatusService } from './update-application-status.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';
import { UpdateApplicationStatusDto } from '../dto/update-application-status.dto';
import sgMail from '@sendgrid/mail';

jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: {
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue({}),
  },
}));

describe('UpdateApplicationStatusService', () => {
  let service: UpdateApplicationStatusService;
  let prismaMock: { application: { update: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      application: {
        update: jest.fn(),
      },
    };

    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SENDGRID_API_KEY: 'mock-sendgrid-key',
          SENDGRID_SENDER_EMAIL: 'test@empleosnarino.com',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateApplicationStatusService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UpdateApplicationStatusService>(
      UpdateApplicationStatusService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería actualizar estado y enviar correo (si aplica)', async () => {
    const mockUpdated = { userId: 'user-123', jobId: 'offer-123', status: 'INTERVIEWING' };
    prismaMock.application.update.mockResolvedValueOnce(mockUpdated);

    const dto: UpdateApplicationStatusDto = {
      status: 'INTERVIEWING',
      candidateEmail: 'candidato@test.com',
      offerTitle: 'Dev',
    };
    const result = await service.updateApplicationStatus(
      'user-123',
      'offer-123',
      dto,
    );

    expect(result.statusCode).toBe(200);
    expect(result.new_status).toBe('INTERVIEWING');
    expect(prismaMock.application.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.application.update).toHaveBeenCalledWith({
      where: {
        userId_jobId: {
          userId: 'user-123',
          jobId: 'offer-123',
        },
      },
      data: { status: 'INTERVIEWING' },
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(jest.mocked(sgMail.send)).toHaveBeenCalledTimes(1);
  });

  it('debería manejar error de Prisma', async () => {
    prismaMock.application.update.mockRejectedValueOnce(new Error('Error'));
    await expect(
      service.updateApplicationStatus(
        '123',
        '456',
        {} as UpdateApplicationStatusDto,
      ),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
