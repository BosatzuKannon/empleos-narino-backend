import { Test, TestingModule } from '@nestjs/testing';
import { UpdateProfileService } from './update-profile.service';
import { ConfigService } from '@nestjs/config';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

describe('UpdateProfileService', () => {
  let service: UpdateProfileService;

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
        UpdateProfileService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UpdateProfileService>(UpdateProfileService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('updateProfile', () => {
    const cognitoId = 'usuario-123';
    const mockDto = {
      nombres: 'Carlos',
      apellidos: 'Jaramillo',
      telefono: '3001234567',
      ciudad: 'Pasto',
    };

    it('debería actualizar el perfil exitosamente', async () => {
      const mockUpdatedAttributes = {
        ...mockDto,
        fecha_nacimiento: '1988-05-15',
      };

      const dynamoSendMock = jest
        .spyOn(service['docClient'] as any, 'send')
        .mockResolvedValueOnce({ Attributes: mockUpdatedAttributes });

      const result = await service.updateProfile(cognitoId, mockDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Perfil de usuario actualizado exitosamente.',
        updatedAttributes: mockUpdatedAttributes,
      });
      expect(dynamoSendMock).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar NotFoundException si no se encuentran atributos (usuario no existe)', async () => {
      jest
        .spyOn(service['docClient'] as any, 'send')
        .mockResolvedValueOnce({ Attributes: undefined });

      await expect(service.updateProfile(cognitoId, mockDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar InternalServerErrorException en caso de error de AWS', async () => {
      jest
        .spyOn(service['docClient'] as any, 'send')
        .mockRejectedValueOnce(new Error('Fallo de conexión a DynamoDB'));

      await expect(service.updateProfile(cognitoId, mockDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
