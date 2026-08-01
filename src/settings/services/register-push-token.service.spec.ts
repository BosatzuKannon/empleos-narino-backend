import { Test, TestingModule } from '@nestjs/testing';
import { RegisterPushTokenService } from './register-push-token.service';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('RegisterPushTokenService', () => {
  let service: RegisterPushTokenService;
  let prismaMock: {
    device: { upsert: jest.Mock; deleteMany: jest.Mock };
  };

  beforeEach(async () => {
    prismaMock = {
      device: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterPushTokenService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<RegisterPushTokenService>(RegisterPushTokenService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('registerPushToken', () => {
    const userId = '12345';
    const mockDto = {
      token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      platform: 'android',
      permission_status: 'granted',
    };

    it('debería registrar el push token exitosamente', async () => {
      const mockDevice = {
        id: 'device-123',
        pushToken: mockDto.token,
        platform: 'android',
      };
      prismaMock.device.upsert.mockResolvedValueOnce(mockDevice);

      const result = await service.registerPushToken(userId, mockDto);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Push Token registrado/actualizado exitosamente.',
        deviceId: 'device-123',
      });
      expect(prismaMock.device.upsert).toHaveBeenCalledTimes(1);
      expect(prismaMock.device.upsert).toHaveBeenCalledWith({
        where: { pushToken: mockDto.token },
        update: {
          userId,
          platform: 'android',
          updatedAt: expect.any(Date) as Date,
        },
        create: {
          pushToken: mockDto.token,
          platform: 'android',
          userId,
        },
      });
      expect(prismaMock.device.deleteMany).not.toHaveBeenCalled();
    });

    it('debería eliminar los tokens previos si el permiso es "denied"', async () => {
      const result = await service.registerPushToken(userId, {
        platform: 'android',
        permission_status: 'denied',
      });

      expect(result).toEqual({
        statusCode: 200,
        message:
          'Permiso de notificaciones no concedido. Tokens previos eliminados.',
      });
      expect(prismaMock.device.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(prismaMock.device.upsert).not.toHaveBeenCalled();
    });

    it('debería eliminar los tokens previos si el permiso es "undetermined"', async () => {
      const result = await service.registerPushToken(userId, {
        platform: 'ios',
        permission_status: 'undetermined',
      });

      expect(result.statusCode).toBe(200);
      expect(prismaMock.device.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(prismaMock.device.upsert).not.toHaveBeenCalled();
    });

    it('debería eliminar los tokens previos si "granted" sin token', async () => {
      const result = await service.registerPushToken(userId, {
        token: '',
        platform: 'android',
        permission_status: 'granted',
      });

      expect(result.statusCode).toBe(200);
      expect(prismaMock.device.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(prismaMock.device.upsert).not.toHaveBeenCalled();
    });

    it('debería lanzar InternalServerErrorException si Prisma falla', async () => {
      prismaMock.device.upsert.mockRejectedValueOnce(
        new Error('Fallo de escritura'),
      );

      await expect(service.registerPushToken(userId, mockDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
