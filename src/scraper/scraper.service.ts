import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as cheerio from 'cheerio';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

const LIST_URL =
  'https://amorelpasto.com/clasificados/web/app.php/resultados/Empleo';
const BASE_URL = 'https://amorelpasto.com';
const COMPANY_ID = 'ce6e8db1-78d3-4e18-bffa-cfb963fe20b2';

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

export interface ScrapeResult {
  success: boolean;
  offersFound: number;
  offersInserted: number;
  errors: string[];
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'America/Bogota' })
  async scrapeDailyJobOffers(): Promise<ScrapeResult> {
    const yesterday = this.yesterdayFormatted();
    this.logger.log(`Scraper iniciado. Fecha filtro (ayer): ${yesterday}`);

    const result: ScrapeResult = {
      success: true,
      offersFound: 0,
      offersInserted: 0,
      errors: [],
    };

    try {
      this.logger.log(`GET lista: ${LIST_URL}`);
      const listHtml = await this.fetchHtml(LIST_URL);
      this.logger.log(
        `Lista obtenida OK (${listHtml.length} chars). Parseando HTML...`,
      );

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

      result.offersFound = matches.length;
      this.logger.log(
        `Parseo lista OK: ${matches.length} oferta(s) pasaron el filtro de fecha ${yesterday}.`,
      );

      let created = 0;
      for (const match of matches) {
        this.logger.log(`Procesando detalle: ${match.url}`);
        try {
          if (await this.saveOffer(match.url, match.title)) {
            created++;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`Error procesando ${match.url}: ${message}`);
          result.errors.push(`${match.url}: ${message}`);
        }
      }

      result.offersInserted = created;
      this.logger.log(
        `Scraper finalizado: ${created} nueva(s) oferta(s) insertada(s), ${result.errors.length} error(es).`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.success = false;
      result.errors.push(message);
      this.logger.error(
        `Error en el scraper de ofertas diarias: ${message}`,
        error as Error,
      );
    }

    return result;
  }

  private async saveOffer(
    detailUrl: string,
    listTitle: string,
  ): Promise<boolean> {
    const html = await this.fetchHtml(detailUrl);
    this.logger.log(`Detalle obtenido OK (${html.length} chars).`);

    let title: string;
    let description: string;
    try {
      const $ = cheerio.load(html);
      const detailTitle = clean($('.ads-details-wrapper h2').first().text());
      title = clean(listTitle) || detailTitle;
      description = clean($('.ads-details-info').first().text());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Falló el parseo Cheerio de ${detailUrl}: ${message}`);
    }

    const payload: Prisma.JobVacancyUncheckedCreateInput = {
      title,
      description,
      // ponytail: model is JobVacancy, not JobOffer; the spec's isActive/isPaid/
      // municipio/modality/vacancies map onto the columns the app already reads.
      companyId: COMPANY_ID,
      status: 'ACTIVE',
      paymentStatus: 'APPROVED',
      location: 'Pasto',
      contractType: 'Indefinido',
      modality: 'Presencial',
      availablePositions: 1,
      salary: 0,
    };

    this.logger.log(`Payload a insertar en JobVacancy: ${JSON.stringify(payload)}`);

    try {
      const existing = await this.prisma.jobVacancy.findFirst({
        where: { companyId: COMPANY_ID, title },
      });
      if (existing) {
        this.logger.log(`Oferta ya existe en BD, se omite: ${title}`);
        return false;
      }

      await this.prisma.jobVacancy.create({ data: payload });
      this.logger.log(`Oferta insertada en BD: ${title}`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Falló la transacción Prisma al insertar "${title}": ${message}`,
      );
    }
  }

  private async fetchHtml(url: string): Promise<string> {
    this.logger.log(`HTTP GET: ${url}`);
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
