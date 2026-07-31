import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { CheckAppVersionService } from './services/check-app-version.service';
import { RegisterPushTokenService } from './services/register-push-token.service';
import { GetUserPreferencesService } from './services/get-user-preferences.service';
import { UpdateUserPreferencesService } from './services/update-user-preferences.service';

describe('SettingsController', () => {
  let controller: SettingsController;

  const mockCheckAppVersionService = {
    checkAppVersion: jest.fn().mockResolvedValue({
      statusCode: 200,
      min_version_code: 10,
    }),
  };

  const mockRegisterPushTokenService = {
    registerPushToken: jest.fn().mockResolvedValue({
      statusCode: 201,
      message: 'Push Token registrado/actualizado exitosamente.',
    }),
  };

  const mockGetUserPreferencesService = {
    getUserPreferences: jest.fn().mockResolvedValue({
      statusCode: 200,
      preferences: {
        emailTransactional: true,
        emailMarketing: false,
        pushNotifications: true,
      },
    }),
  };

  const mockUpdateUserPreferencesService = {
    updateUserPreferences: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'Preferencias actualizadas exitosamente.',
      preferences: {
        emailTransactional: true,
        emailMarketing: false,
        pushNotifications: true,
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: CheckAppVersionService,
          useValue: mockCheckAppVersionService,
        },
        {
          provide: RegisterPushTokenService,
          useValue: mockRegisterPushTokenService,
        },
        {
          provide: GetUserPreferencesService,
          useValue: mockGetUserPreferencesService,
        },
        {
          provide: UpdateUserPreferencesService,
          useValue: mockUpdateUserPreferencesService,
        },
      ],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserPreferences', () => {
    it('debería obtener las preferencias del usuario autenticado', async () => {
      const req = { user: { userId: 'user-123' } };

      const result = await controller.getUserPreferences(req);

      expect(result).toEqual({
        statusCode: 200,
        preferences: {
          emailTransactional: true,
          emailMarketing: false,
          pushNotifications: true,
        },
      });
      expect(
        mockGetUserPreferencesService.getUserPreferences,
      ).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updateUserPreferences', () => {
    it('debería actualizar las preferencias del usuario autenticado', async () => {
      const req = { user: { userId: 'user-123' } };
      const dto = { emailMarketing: true };

      const result = await controller.updateUserPreferences(req, dto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Preferencias actualizadas exitosamente.',
        preferences: {
          emailTransactional: true,
          emailMarketing: false,
          pushNotifications: true,
        },
      });
      expect(
        mockUpdateUserPreferencesService.updateUserPreferences,
      ).toHaveBeenCalledWith('user-123', dto);
    });
  });
});
