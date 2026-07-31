import { Test, TestingModule } from '@nestjs/testing';
import { GetUserPreferencesService } from './get-user-preferences.service';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('GetUserPreferencesService', () => {
  let service: GetUserPreferencesService;
  let prismaMock: { userPreference: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      userPreference: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserPreferencesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<GetUserPreferencesService>(GetUserPreferencesService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getUserPreferences', () => {
    const userId = 'user-123';

    it('debería devolver las preferencias por defecto si el usuario no tiene registros', async () => {
      prismaMock.userPreference.findUnique.mockResolvedValueOnce(null);

      const result = await service.getUserPreferences(userId);

      expect(result).toEqual({
        statusCode: 200,
        preferences: {
          emailTransactional: true,
          emailMarketing: false,
          pushNotifications: true,
        },
      });
      expect(prismaMock.userPreference.findUnique).toHaveBeenCalledTimes(1);
      expect(prismaMock.userPreference.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('debería devolver las preferencias almacenadas del usuario', async () => {
      const mockPreferences = {
        id: 'pref-123',
        emailTransactional: true,
        emailMarketing: true,
        pushNotifications: false,
      };
      prismaMock.userPreference.findUnique.mockResolvedValueOnce(
        mockPreferences,
      );

      const result = await service.getUserPreferences(userId);

      expect(result).toEqual({
        statusCode: 200,
        preferences: {
          emailTransactional: true,
          emailMarketing: true,
          pushNotifications: false,
        },
      });
    });

    it('debería lanzar InternalServerErrorException si Prisma falla', async () => {
      prismaMock.userPreference.findUnique.mockRejectedValueOnce(
        new Error('Fallo de conexión'),
      );

      await expect(service.getUserPreferences(userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
