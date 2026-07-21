import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { CheckAppVersionService } from './services/check-app-version.service';
import { RegisterPushTokenService } from './services/register-push-token.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SettingsController],
  providers: [
    PrismaService,
    CheckAppVersionService, 
    RegisterPushTokenService
  ],
})
export class SettingsModule {}
