// src/auth/services/signup.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SignupService } from './signup.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';

describe('SignupService', () => {
  let service: SignupService;

  beforeEach(async () => {
    // 1. Mockeamos el ConfigService para simular las variables de entorno
    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        // Le decimos a TypeScript que este objeto solo tiene llaves y valores string
        const config: Record<string, string> = {
          AWS_REGION: 'us-east-2',
          DYNAMODB_TABLE_NAME: 'job_portal',
          COGNITO_CLIENT_ID: 'test-client-id',
          COGNITO_USER_POOL_ID: 'test-user-pool-id',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignupService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SignupService>(SignupService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
    const mockDto = {
      email: 'prueba@empleosnarino.com',
      password: 'Password123!',
      nombres: 'Carlos',
      apellidos: 'Jaramillo',
      telefono: '3175345577',
      user_type: 'candidato',
      fecha_nacimiento: '1988-05-15',
      ciudad: 'Pasto',
      nombre_empresa: '',
    };

    it('debería registrar un usuario exitosamente en Cognito y DynamoDB', async () => {
      // Engañamos a TypeScript casteando los clientes a 'any' antes de espiar 'send'
      const cognitoSendMock = jest
        .spyOn(service['cognitoClient'] as any, 'send')
        .mockResolvedValueOnce({ UserSub: 'mock-cognito-id-123' })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const dynamoSendMock = jest
        .spyOn(service['docClient'] as any, 'send')
        .mockResolvedValueOnce({});

      const result = await service.signUp(mockDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Registro exitoso. El usuario puede iniciar sesión.',
      });

      expect(cognitoSendMock).toHaveBeenCalledTimes(3);
      expect(dynamoSendMock).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar InternalServerErrorException si ocurre un error en AWS', async () => {
      // Aquí también aplicamos el cast al cliente
      jest
        .spyOn(service['cognitoClient'] as any, 'send')
        .mockRejectedValueOnce(new Error('Fallo de conexión a Cognito'));

      await expect(service.signUp(mockDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('debería lanzar InternalServerErrorException si ocurre un error en AWS', async () => {
      // Simulamos que Cognito falla y lanza un error
      jest
        .spyOn(service['cognitoClient'] as any, 'send')
        .mockRejectedValueOnce(new Error('Fallo de conexión a Cognito'));

      // Verificamos que el servicio capture el error y lance nuestra excepción personalizada de Nest
      await expect(service.signUp(mockDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
