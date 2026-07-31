import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { CheckAppVersionService } from './services/check-app-version.service';
import { RegisterPushTokenService } from './services/register-push-token.service';
import { GetUserPreferencesService } from './services/get-user-preferences.service';
import { UpdateUserPreferencesService } from './services/update-user-preferences.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SettingsController],
  providers: [
    PrismaService,
    CheckAppVersionService,
    RegisterPushTokenService,
    GetUserPreferencesService,
    UpdateUserPreferencesService,
  ],
})
export class SettingsModule {}
