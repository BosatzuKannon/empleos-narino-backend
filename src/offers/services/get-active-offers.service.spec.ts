import { Test, TestingModule } from '@nestjs/testing';
import { GetActiveOffersService } from './get-active-offers.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';

describe('GetActiveOffersService', () => {
  let service: GetActiveOffersService;

  beforeEach(async () => {
    const mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('dummy-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetActiveOffersService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GetActiveOffersService>(GetActiveOffersService);
  });

  it('debería obtener ofertas activas', async () => {
    const mockItems = [{ offer_id: '1', status: 'activa' }];
    const dynamoSendMock = jest
      .spyOn(service['docClient'] as any, 'send')
      .mockResolvedValueOnce({ Items: mockItems });

    const result = await service.getActiveOffers();

    expect(result.statusCode).toBe(200);
    expect(result.offers).toEqual(mockItems);
    expect(dynamoSendMock).toHaveBeenCalledTimes(1);
  });

  it('debería manejar error de DynamoDB', async () => {
    jest
      .spyOn(service['docClient'] as any, 'send')
      .mockRejectedValueOnce(new Error('Error'));
    await expect(service.getActiveOffers()).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
