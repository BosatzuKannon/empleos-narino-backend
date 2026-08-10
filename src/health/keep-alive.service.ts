import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class KeepAliveService {
  private readonly logger = new Logger(KeepAliveService.name);

  constructor(private readonly httpService: HttpService) {}

  private getHealthUrl(): string {
    const baseUrl = process.env.BACKEND_PUBLIC_URL;
    if (baseUrl) {
      return `${baseUrl.replace(/\/+$/, '')}/health`;
    }
    return `http://localhost:${process.env.PORT || 3000}/health`;
  }

  @Cron('*/14 * * * *')
  async pingHealth() {
    const url = this.getHealthUrl();
    try {
      await this.httpService.axiosRef.get(url);
    } catch (error) {
      this.logger.warn(`Keep-alive ping to ${url} failed: ${error}`);
    }
  }
}
