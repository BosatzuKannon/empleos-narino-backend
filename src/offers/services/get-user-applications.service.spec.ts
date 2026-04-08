import { Test, TestingModule } from '@nestjs/testing';
import { GetUserApplicationsService } from './get-user-applications.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';

describe('GetUserApplicationsService', () => {
  let service: GetUserApplicationsService;

  beforeEach(async () => {
    const mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('dummy-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserApplicationsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GetUserApplicationsService>(
      GetUserApplicationsService,
    );
  });

  it('debería obtener las postulaciones de un usuario', async () => {
    const mockItems = [{ sk: 'APPLICATION#123', status: 'enviada' }];
    const dynamoSendMock = jest
      .spyOn(service['docClient'] as any, 'send')
      .mockResolvedValueOnce({ Items: mockItems, Count: 1 });

    const result = await service.getUserApplications('user-123');

    expect(result.statusCode).toBe(200);
    expect(result.count).toBe(1);
    expect(result.applications).toEqual(mockItems);
    expect(dynamoSendMock).toHaveBeenCalledTimes(1);
  });

  it('debería manejar error de DynamoDB', async () => {
    jest
      .spyOn(service['docClient'] as any, 'send')
      .mockRejectedValueOnce(new Error('Error'));
    await expect(service.getUserApplications('user-123')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
