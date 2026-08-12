import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailModule } from '../email/email.module';
import { WompiController } from './wompi.controller';
import { WompiService } from './wompi.service';

@Module({
  imports: [EmailModule],
  controllers: [WompiController],
  providers: [WompiService, PrismaService],
})
export class WompiModule {}
