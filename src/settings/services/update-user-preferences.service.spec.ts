import { Test, TestingModule } from '@nestjs/testing';
import { UpdateUserPreferencesService } from './update-user-preferences.service';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('UpdateUserPreferencesService', () => {
  let service: UpdateUserPreferencesService;
  let prismaMock: { userPreference: { upsert: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      userPreference: {
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserPreferencesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UpdateUserPreferencesService>(
      UpdateUserPreferencesService,
    );
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('updateUserPreferences', () => {
    const userId = 'user-123';

    it('debería actualizar las preferencias usando upsert', async () => {
      const dto = { emailMarketing: true };
      const mockPreferences = {
        id: 'pref-123',
        emailTransactional: true,
        emailMarketing: true,
        pushNotifications: true,
      };
      prismaMock.userPreference.upsert.mockResolvedValueOnce(mockPreferences);

      const result = await service.updateUserPreferences(userId, dto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Preferencias actualizadas exitosamente.',
        preferences: {
          emailTransactional: true,
          emailMarketing: true,
          pushNotifications: true,
        },
      });
      expect(prismaMock.userPreference.upsert).toHaveBeenCalledTimes(1);
      expect(prismaMock.userPreference.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: { emailMarketing: true },
        create: { userId, emailMarketing: true },
      });
    });

    it('debería devolver preferencias por defecto si el dto está vacío', async () => {
      const result = await service.updateUserPreferences(userId, {});

      expect(result).toEqual({
        statusCode: 200,
        message: 'No se recibieron cambios para aplicar.',
        preferences: {
          emailTransactional: true,
          emailMarketing: false,
          pushNotifications: true,
        },
      });
      expect(prismaMock.userPreference.upsert).not.toHaveBeenCalled();
    });

    it('debería lanzar InternalServerErrorException si Prisma falla', async () => {
      prismaMock.userPreference.upsert.mockRejectedValueOnce(
        new Error('Fallo de escritura'),
      );

      await expect(
        service.updateUserPreferences(userId, { pushNotifications: false }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
