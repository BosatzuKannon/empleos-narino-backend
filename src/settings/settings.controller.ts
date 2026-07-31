import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { RegisterPushTokenService } from './services/register-push-token.service';
import { CheckAppVersionService } from './services/check-app-version.service';
import { GetUserPreferencesService } from './services/get-user-preferences.service';
import { UpdateUserPreferencesService } from './services/update-user-preferences.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email?: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly registerPushTokenService: RegisterPushTokenService,
    private readonly checkAppVersionService: CheckAppVersionService,
    private readonly getUserPreferencesService: GetUserPreferencesService,
    private readonly updateUserPreferencesService: UpdateUserPreferencesService,
  ) {}

  @Public()
  @Get('app-version')
  async checkAppVersion() {
    return this.checkAppVersionService.checkAppVersion();
  }

  @Post('push-token')
  async registerPushToken(
    @Req() req: AuthenticatedRequest,
    @Body() registerPushTokenDto: RegisterPushTokenDto,
  ) {
    const userId = req.user.userId;
    return this.registerPushTokenService.registerPushToken(
      userId,
      registerPushTokenDto,
    );
  }

  @Get('preferences')
  async getUserPreferences(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.getUserPreferencesService.getUserPreferences(userId);
  }

  @Patch('preferences')
  async updateUserPreferences(
    @Req() req: AuthenticatedRequest,
    @Body() updateUserPreferencesDto: UpdateUserPreferencesDto,
  ) {
    const userId = req.user.userId;
    return this.updateUserPreferencesService.updateUserPreferences(
      userId,
      updateUserPreferencesDto,
    );
  }
}
