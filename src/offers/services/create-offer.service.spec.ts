import { Test, TestingModule } from '@nestjs/testing';
import { CreateOfferService } from './create-offer.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { CreateOfferDto } from '../dto/create-offer.dto';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

describe('CreateOfferService', () => {
  let service: CreateOfferService;

  beforeEach(async () => {
    const mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('dummy-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOfferService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CreateOfferService>(CreateOfferService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear una oferta exitosamente', async () => {
    const dynamoSendMock = jest
      .spyOn(service['docClient'] as any, 'send')
      .mockResolvedValueOnce({});

    const dto = {
      titulo: 'Dev',
      empresa: 'Fucsol',
      ubicacion: 'Pasto',
      salario: 1000,
      tipo_contrato: 'Indefinido',
      descripcion: 'Test',
      requisitos: 'Test',
    };

    const result = await service.createOffer('user-123', dto);

    expect(result.statusCode).toBe(201);
    expect(result.offer.offer_id).toBe('test-uuid-1234');
    expect(dynamoSendMock).toHaveBeenCalledTimes(1);
  });

  it('debería lanzar InternalServerErrorException si DynamoDB falla', async () => {
    jest
      .spyOn(service['docClient'] as any, 'send')
      .mockRejectedValueOnce(new Error('Fallo DB'));

    await expect(
      service.createOffer('user-123', {} as CreateOfferDto),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
