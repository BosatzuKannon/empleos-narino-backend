import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ProfileModule } from './profile/profile.module';
import { SettingsModule } from './settings/settings.module';
import { OffersModule } from './offers/offers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ProfileModule,
    SettingsModule,
    OffersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
