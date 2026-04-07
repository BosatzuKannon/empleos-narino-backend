import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { CheckAppVersionService } from './services/check-app-version.service';
import { RegisterPushTokenService } from './services/register-push-token.service';

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
      ],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });
});
