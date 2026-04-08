import { Test, TestingModule } from '@nestjs/testing';
import { GetOfferApplicationsService } from './get-offer-applications.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';

describe('GetOfferApplicationsService', () => {
  let service: GetOfferApplicationsService;

  beforeEach(async () => {
    const mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('dummy-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOfferApplicationsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GetOfferApplicationsService>(
      GetOfferApplicationsService,
    );
  });

  it('debería obtener los candidatos de una oferta', async () => {
    const mockItems = [{ pk: 'USER#123', resume_url: 'url' }];
    const dynamoSendMock = jest
      .spyOn(service['docClient'] as any, 'send')
      .mockResolvedValueOnce({ Items: mockItems, Count: 1 });

    const result = await service.getOfferApplications('offer-123');

    expect(result.statusCode).toBe(200);
    expect(result.count).toBe(1);
    expect(result.candidates).toEqual(mockItems);
    expect(dynamoSendMock).toHaveBeenCalledTimes(1);
  });

  it('debería manejar error de DynamoDB', async () => {
    jest
      .spyOn(service['docClient'] as any, 'send')
      .mockRejectedValueOnce(new Error('Error'));
    await expect(service.getOfferApplications('offer-123')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
