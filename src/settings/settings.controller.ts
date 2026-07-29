import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { RegisterPushTokenService } from './services/register-push-token.service';
import { CheckAppVersionService } from './services/check-app-version.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly registerPushTokenService: RegisterPushTokenService,
    private readonly checkAppVersionService: CheckAppVersionService,
  ) {}

  @Public()
  @Get('app-version')
  async checkAppVersion() {
    return this.checkAppVersionService.checkAppVersion();
  }

  @Post('push-token')
  async registerPushToken(
    @Req() req: any,
    @Body() registerPushTokenDto: RegisterPushTokenDto,
  ) {
    const userId = req.user.userId;
    return this.registerPushTokenService.registerPushToken(
      userId,
      registerPushTokenDto,
    );
  }
}
