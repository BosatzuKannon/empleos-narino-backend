import { Test, TestingModule } from '@nestjs/testing';
import { CheckAppVersionService } from './check-app-version.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';

describe('CheckAppVersionService', () => {
  let service: CheckAppVersionService;

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
        CheckAppVersionService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CheckAppVersionService>(CheckAppVersionService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('checkAppVersion', () => {
    it('debería devolver la configuración de la app si existe en DynamoDB', async () => {
      const mockItem = {
        min_version_code: 10,
        message_es: 'Actualización requerida',
        app_status: 'ACTIVE',
      };

      const dynamoSendMock = jest
        .spyOn(service['docClient'] as any, 'send')
        .mockResolvedValueOnce({ Item: mockItem });

      const result = await service.checkAppVersion();

      expect(result).toEqual({
        statusCode: 200,
        min_version_code: 10,
        message_es: 'Actualización requerida',
        app_status: 'ACTIVE',
        app_status_message: undefined,
        app_status_type: undefined,
      });
      expect(dynamoSendMock).toHaveBeenCalledTimes(1);
    });

    it('debería devolver valores por defecto si no encuentra el item', async () => {
      jest
        .spyOn(service['docClient'] as any, 'send')
        .mockResolvedValueOnce({ Item: undefined });

      const result = await service.checkAppVersion();

      expect(result).toEqual({
        statusCode: 200,
        min_version_code: 5,
        message_es:
          'Error al cargar la configuración de versión. Intenta actualizar tu app.',
      });
    });

    it('debería lanzar InternalServerErrorException si DynamoDB falla', async () => {
      jest
        .spyOn(service['docClient'] as any, 'send')
        .mockRejectedValueOnce(new Error('Fallo de conexión'));

      await expect(service.checkAppVersion()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
