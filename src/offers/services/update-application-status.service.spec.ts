import { Test, TestingModule } from '@nestjs/testing';
import { UpdateApplicationStatusService } from './update-application-status.service';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../../email/email.service';
import { PushNotificationService } from '../../push-notifications/push-notifications.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UpdateApplicationStatusDto } from '../dto/update-application-status.dto';
import { ApplicationStatus } from '@prisma/client';

describe('UpdateApplicationStatusService', () => {
  let service: UpdateApplicationStatusService;
  let prismaMock: {
    application: { update: jest.Mock; findUnique: jest.Mock; count: jest.Mock };
    company: { findFirst: jest.Mock };
  };
  let emailServiceMock: { sendApplicationStatusEmail: jest.Mock };
  let pushNotificationServiceMock: { sendToUser: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      application: {
        update: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      company: {
        findFirst: jest.fn(),
      },
    };

    emailServiceMock = {
      sendApplicationStatusEmail: jest.fn().mockResolvedValue(undefined),
    };

    pushNotificationServiceMock = {
      sendToUser: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateApplicationStatusService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmailService, useValue: emailServiceMock },
        {
          provide: PushNotificationService,
          useValue: pushNotificationServiceMock,
        },
      ],
    }).compile();

    service = module.get<UpdateApplicationStatusService>(
      UpdateApplicationStatusService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería actualizar estado y enviar correo y push (si aplica)', async () => {
    prismaMock.application.findUnique.mockResolvedValueOnce({
      id: 'app-123',
      userId: 'user-123',
      status: 'SENT',
      jobVacancy: {
        id: 'offer-123',
        title: 'Dev',
        companyId: 'company-1',
        status: 'ACTIVE',
      },
    });
    prismaMock.company.findFirst.mockResolvedValueOnce({
      id: 'company-1',
      ownerId: 'user-123',
    });
    prismaMock.application.update.mockResolvedValueOnce({
      userId: 'user-123',
      jobId: 'offer-123',
      status: 'INTERVIEWING',
    });

    const dto: UpdateApplicationStatusDto = {
      status: 'entrevista',
      candidateEmail: 'candidato@test.com',
      offerTitle: 'Dev',
    };
    const result = await service.updateApplicationStatus(
      'user-123',
      'app-123',
      dto,
    );

    expect(result.statusCode).toBe(200);
    expect(result.new_status).toBe('INTERVIEWING');
    expect(prismaMock.application.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.application.update).toHaveBeenCalledWith({
      where: { id: 'app-123' },
      data: { status: ApplicationStatus.INTERVIEWING },
    });
    expect(emailServiceMock.sendApplicationStatusEmail).toHaveBeenCalledTimes(
      1,
    );
    expect(emailServiceMock.sendApplicationStatusEmail).toHaveBeenCalledWith({
      to: 'candidato@test.com',
      offerTitle: 'Dev',
      status: ApplicationStatus.INTERVIEWING,
    });
    expect(pushNotificationServiceMock.sendToUser).toHaveBeenCalledTimes(1);
    const pushCalls = pushNotificationServiceMock.sendToUser.mock
      .calls as unknown as Array<[string, { title: string; body: string }]>;
    expect(pushCalls[0][0]).toBe('user-123');
    expect(pushCalls[0][1].title).toBe('¡Avanzaste a entrevista!');
  });

  it('debería rechazar estados no válidos', async () => {
    await expect(
      service.updateApplicationStatus('123', '456', {
        status: 'inexistente',
        candidateEmail: 'candidato@test.com',
        offerTitle: 'Dev',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debería manejar error de Prisma', async () => {
    prismaMock.application.findUnique.mockRejectedValueOnce(new Error('Error'));
    await expect(
      service.updateApplicationStatus('123', '456', {
        status: 'en_revision',
        candidateEmail: 'candidato@test.com',
        offerTitle: 'Dev',
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
