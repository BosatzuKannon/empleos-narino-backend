import { Test, TestingModule } from '@nestjs/testing';
import { UpdateApplicationStatusService } from './update-application-status.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { UpdateApplicationStatusDto } from '../dto/update-application-status.dto';
import * as sgMail from '@sendgrid/mail';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue({}),
}));

describe('UpdateApplicationStatusService', () => {
  let service: UpdateApplicationStatusService;

  beforeEach(async () => {
    const mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('dummy-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateApplicationStatusService,
        { provide: ConfigService, useValue: mockConfigService },
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
    const dynamoSendMock = jest
      .spyOn(service['docClient'] as any, 'send')
      .mockResolvedValueOnce({});

    const dto = {
      status: 'entrevista',
      candidateEmail: 'candidato@test.com',
      offerTitle: 'Dev',
    };
    const result = await service.updateApplicationStatus(
      'user-123',
      'offer-123',
      dto,
    );

    expect(result.statusCode).toBe(200);
    expect(result.new_status).toBe('entrevista');
    expect(dynamoSendMock).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(jest.mocked(sgMail.send)).toHaveBeenCalledTimes(1);
  });

  it('debería manejar error de DynamoDB', async () => {
    jest
      .spyOn(service['docClient'] as any, 'send')
      .mockRejectedValueOnce(new Error('Error'));
    await expect(
      service.updateApplicationStatus(
        '123',
        '456',
        {} as UpdateApplicationStatusDto,
      ),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
