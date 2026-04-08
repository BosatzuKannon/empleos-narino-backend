import { Test, TestingModule } from '@nestjs/testing';
import { GetOffersByUserService } from './get-offers-by-user.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';

describe('GetOffersByUserService', () => {
  let service: GetOffersByUserService;

  beforeEach(async () => {
    const mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('dummy-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOffersByUserService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GetOffersByUserService>(GetOffersByUserService);
  });

  it('debería obtener ofertas de un usuario', async () => {
    const mockItems = [{ offer_id: '1', createdBy: 'USER#123' }];
    const dynamoSendMock = jest
      .spyOn(service['docClient'] as any, 'send')
      .mockResolvedValueOnce({ Items: mockItems, Count: 1 });

    const result = await service.getOffersByUser('123');

    expect(result.statusCode).toBe(200);
    expect(result.count).toBe(1);
    expect(result.data).toEqual(mockItems);
    expect(dynamoSendMock).toHaveBeenCalledTimes(1);
  });

  it('debería manejar error de DynamoDB', async () => {
    jest
      .spyOn(service['docClient'] as any, 'send')
      .mockRejectedValueOnce(new Error('Error'));
    await expect(service.getOffersByUser('123')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
