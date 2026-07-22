import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterPushTokenService } from './services/register-push-token.service';
import { CheckAppVersionService } from './services/check-app-version.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

interface JwtPayload {
  sub?: string;
}

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly registerPushTokenService: RegisterPushTokenService,
    private readonly checkAppVersionService: CheckAppVersionService,
  ) {}

  @Get('app-version')
  async checkAppVersion() {
    return this.checkAppVersionService.checkAppVersion();
  }

  @Post('push-token')
  async registerPushToken(
    @Headers('authorization') authHeader: string,
    @Body() registerPushTokenDto: RegisterPushTokenDto,
  ) {
    // 1. Verify token exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autorización inválido.');
    }

    try {
      // 2. Extract the user ID directly from the Supabase JWT
      const token = authHeader.split(' ')[1];
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(
        Buffer.from(payloadBase64, 'base64').toString('utf-8'),
      ) as JwtPayload;
      const userId = payload.sub;

      if (!userId) {
        throw new UnauthorizedException('El token no contiene un ID válido.');
      }

      // 3. Pass BOTH arguments to the service, fixing the TS2554 error!
      return this.registerPushTokenService.registerPushToken(
        userId,
        registerPushTokenDto,
      );
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }
  }
}
