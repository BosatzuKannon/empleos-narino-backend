import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { KeepAliveService } from './keep-alive.service';

@Module({
  imports: [HttpModule],
  controllers: [HealthController],
  providers: [KeepAliveService],
})
export class HealthModule {}
