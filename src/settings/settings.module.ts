import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
// import { CheckAppVersionService } from './services/check-app-version.service';
// import { RegisterPushTokenService } from './services/register-push-token.service';

@Module({
  controllers: [SettingsController],
  providers: [
    // CheckAppVersionService, 
    // RegisterPushTokenService
  ],
})
export class SettingsModule {}
