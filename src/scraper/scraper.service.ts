import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as cheerio from 'cheerio';
import { PrismaService } from '../prisma.service';

const LIST_URL =
  'https://amorelpasto.com/clasificados/web/app.php/resultados/Empleo';
const BASE_URL = 'https://amorelpasto.com';
const COMPANY_ID = '0829cc90-e2d9-4a26-aa9c-c65a9cad8656';

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scrapeDailyJobOffers(): Promise<void> {
    const yesterday = this.yesterdayFormatted();

    try {
      const listHtml = await this.fetchHtml(LIST_URL);
      const $ = cheerio.load(listHtml);

      const matches: { title: string; url: string }[] = [];
      $('div.item-list').each((_, el) => {
        const itemDate = $(el).find('.date').text().trim();
        if (itemDate !== yesterday) return;

        const link = $(el).find('h5.add-title a').first();
        const href = link.attr('href');
        if (!href) return;

        matches.push({
          title: clean(link.text()),
          url: new URL(href, BASE_URL).toString(),
        });
      });

      this.logger.log(
        `Scraper: ${matches.length} oferta(s) fechadas ${yesterday} encontrada(s).`,
      );

      let created = 0;
      for (const match of matches) {
        try {
          if (await this.saveOffer(match.url, match.title)) {
            created++;
          }
        } catch (error) {
          // One broken detail page must not kill the batch.
          this.logger.error(`Error procesando ${match.url}`, error as Error);
        }
      }

      this.logger.log(
        `Scraper finalizado: ${created} nueva(s) oferta(s) creada(s).`,
      );
    } catch (error) {
      this.logger.error(
        'Error en el scraper de ofertas diarias.',
        error as Error,
      );
    }
  }

  private async saveOffer(
    detailUrl: string,
    listTitle: string,
  ): Promise<boolean> {
    const html = await this.fetchHtml(detailUrl);
    const $ = cheerio.load(html);

    const detailTitle = clean($('.ads-details-wrapper h2').first().text());
    const title = clean(listTitle) || detailTitle;
    const description = clean($('.ads-details-info').first().text());

    const existing = await this.prisma.jobVacancy.findFirst({
      where: { companyId: COMPANY_ID, title },
    });
    if (existing) {
      this.logger.log(`Oferta ya existe en BD, se omite: ${title}`);
      return false;
    }

    await this.prisma.jobVacancy.create({
      data: {
        title,
        description,
        // ponytail: model is JobVacancy, not JobOffer; the spec's isActive/isPaid/
        // municipio/modality/vacancies map onto the columns the app already reads.
        companyId: COMPANY_ID,
        status: 'ACTIVE',
        paymentStatus: 'APPROVED',
        location: 'Pasto',
        contractType: 'Indefinido',
        availablePositions: 1,
        salary: 0,
      },
    });
    return true;
  }

  private async fetchHtml(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al obtener ${url}`);
    }
    return response.text();
  }

  private yesterdayFormatted(): string {
    const today = new Date();
    today.setDate(today.getDate() - 1);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }
}
