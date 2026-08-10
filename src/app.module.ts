import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ProfileModule } from './profile/profile.module';
import { SettingsModule } from './settings/settings.module';
import { OffersModule } from './offers/offers.module';
import { ServicesModule } from './services/services.module';
import { CommonModule } from './common/common.module';
import { PushNotificationsModule } from './push-notifications/push-notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './health/health.module';
import { WompiModule } from './wompi/wompi.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    CommonModule,
    AuthModule,
    ProfileModule,
    SettingsModule,
    OffersModule,
    ServicesModule,
    PushNotificationsModule,
    HealthModule,
    WompiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
