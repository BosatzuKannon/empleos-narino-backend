import { Test, TestingModule } from '@nestjs/testing';
import { RegisterPushTokenService } from './register-push-token.service';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('RegisterPushTokenService', () => {
  let service: RegisterPushTokenService;
  let prismaMock: { device: { upsert: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      device: {
        upsert: jest.fn(),
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
    };

    it('debería registrar el push token exitosamente', async () => {
      const mockDevice = { id: 'device-123', pushToken: mockDto.token, platform: 'android' };
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
        update: { userId, platform: 'android', updatedAt: expect.any(Date) },
        create: {
          pushToken: mockDto.token,
          platform: 'android',
          userId,
        },
      });
    });

    it('debería devolver mensaje si no se proporciona token', async () => {
      const result = await service.registerPushToken(userId, { token: '', platform: 'android' });

      expect(result).toEqual({
        statusCode: 200,
        message: 'No push token provided, skipping registration.',
      });
      expect(prismaMock.device.upsert).not.toHaveBeenCalled();
    });

    it('debería lanzar InternalServerErrorException si Prisma falla', async () => {
      prismaMock.device.upsert.mockRejectedValueOnce(new Error('Fallo de escritura'));

      await expect(service.registerPushToken(userId, mockDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
