import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WompiController } from './wompi.controller';
import { WompiService } from './wompi.service';

@Module({
  controllers: [WompiController],
  providers: [WompiService, PrismaService],
})
export class WompiModule {}
