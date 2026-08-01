import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PushNotificationService } from './push-notifications.service';

@Module({
  providers: [PrismaService, PushNotificationService],
  exports: [PushNotificationService],
})
export class PushNotificationsModule {}
