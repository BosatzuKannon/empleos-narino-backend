import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ScraperService } from './scraper.service';

@Module({
  providers: [PrismaService, ScraperService],
})
export class ScraperModule {}
