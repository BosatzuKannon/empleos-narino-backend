import { Controller, Get } from '@nestjs/common';
import { ScraperService, ScrapeResult } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Get('run')
  async run(): Promise<ScrapeResult> {
    return this.scraperService.scrapeDailyJobOffers();
  }
}
