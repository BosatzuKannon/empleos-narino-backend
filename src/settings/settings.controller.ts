import { Controller, Get, Post, Body } from '@nestjs/common';
// import { CheckAppVersionService } from './services/check-app-version.service';
// import { RegisterPushTokenService } from './services/register-push-token.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Controller('settings')
export class SettingsController {
  constructor(
    // private readonly checkAppVersionService: CheckAppVersionService,
    // private readonly registerPushTokenService: RegisterPushTokenService,
  ) {}

  @Get('checkAppVersion')
  async checkAppVersion() {
    // return this.checkAppVersionService.checkAppVersion();
  }

  @Post('registerPushToken')
  async registerPushToken(@Body() registerPushTokenDto: RegisterPushTokenDto) {
    // return this.registerPushTokenService.registerPushToken(
    //   registerPushTokenDto,
    // );
  }
}
