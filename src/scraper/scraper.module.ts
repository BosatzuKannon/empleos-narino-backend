import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';

@Module({
  controllers: [ScraperController],
  providers: [PrismaService, ScraperService],
})
export class ScraperModule {}
