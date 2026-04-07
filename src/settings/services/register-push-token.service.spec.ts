import { Test, TestingModule } from '@nestjs/testing';
import { RegisterPushTokenService } from './register-push-token.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';

describe('RegisterPushTokenService', () => {
  let service: RegisterPushTokenService;

  beforeEach(async () => {
    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          AWS_REGION: 'us-east-2',
          DYNAMODB_TABLE_NAME: 'job_portal',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterPushTokenService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RegisterPushTokenService>(RegisterPushTokenService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('registerPushToken', () => {
    const mockDto = {
      user_id: '12345',
      platform: 'android',
      permission_status: 'granted',
      token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    };

    it('debería registrar el push token exitosamente', async () => {
      const dynamoSendMock = jest
        .spyOn(service['docClient'] as any, 'send')
        .mockResolvedValueOnce({});

      const result = await service.registerPushToken(mockDto);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Push Token registrado/actualizado exitosamente.',
        status: 'granted',
        token_sk: 'PUSH_TOKEN#android',
      });
      expect(dynamoSendMock).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar InternalServerErrorException si DynamoDB falla', async () => {
      jest
        .spyOn(service['docClient'] as any, 'send')
        .mockRejectedValueOnce(new Error('Fallo de escritura'));

      await expect(service.registerPushToken(mockDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
