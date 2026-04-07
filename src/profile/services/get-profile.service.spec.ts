import { Test, TestingModule } from '@nestjs/testing';
import { GetProfileService } from './get-profile.service';
import { ConfigService } from '@nestjs/config';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

describe('GetProfileService', () => {
  let service: GetProfileService;

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
        GetProfileService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GetProfileService>(GetProfileService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    const cognitoId = 'usuario-123';

    it('debería obtener el perfil exitosamente', async () => {
      const mockProfile = { nombres: 'Carlos', apellidos: 'Jaramillo' };

      const dynamoSendMock = jest
        .spyOn(service['docClient'] as any, 'send')
        .mockResolvedValueOnce({ Item: mockProfile });

      const result = await service.getProfile(cognitoId);

      expect(result).toEqual({
        statusCode: 200,
        profile: mockProfile,
      });
      expect(dynamoSendMock).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar NotFoundException si no se encuentra el perfil', async () => {
      jest
        .spyOn(service['docClient'] as any, 'send')
        .mockResolvedValueOnce({ Item: undefined });

      await expect(service.getProfile(cognitoId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar InternalServerErrorException en caso de error de AWS', async () => {
      jest
        .spyOn(service['docClient'] as any, 'send')
        .mockRejectedValueOnce(new Error('Fallo de conexión a DynamoDB'));

      await expect(service.getProfile(cognitoId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
