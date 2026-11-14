import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';

@Module({
  controllers: [AdsController],
  providers: [PrismaService, AdsService],
})
export class AdsModule {}
