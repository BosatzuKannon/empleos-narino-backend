import { Test, TestingModule } from '@nestjs/testing';
import { UpdateOfferStatusService } from './update-offer-status.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue({}),
}));

describe('UpdateOfferStatusService', () => {
  let service: UpdateOfferStatusService;

  beforeEach(async () => {
    const mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('dummy-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOfferStatusService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UpdateOfferStatusService>(UpdateOfferStatusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería actualizar estado y enviar correo si aplica', async () => {
    const dynamoSendMock = jest
      .spyOn(service['docClient'] as any, 'send')
      .mockResolvedValueOnce({
        Attributes: { titulo: 'Dev', updated_at: '2023' },
      });

    const dto = { status: 'activo', creatorEmail: 'test@test.com' };
    const result = await service.updateOfferStatus('offer-123', 'admin', dto);

    expect(result.statusCode).toBe(200);
    expect(result.new_status).toBe('activo');
    expect(dynamoSendMock).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(jest.mocked(sgMail.send)).toHaveBeenCalledTimes(1);
  });

  it('debería manejar error de DynamoDB', async () => {
    jest
      .spyOn(service['docClient'] as any, 'send')
      .mockRejectedValueOnce(new Error('Error'));
    await expect(
      service.updateOfferStatus('123', 'admin', { status: 'inactivo' }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
