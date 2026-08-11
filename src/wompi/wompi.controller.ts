import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { WompiService } from './wompi.service';
import { GenerateCheckoutDto } from './dto/generate-checkout.dto';

@Controller('wompi')
export class WompiController {
  private readonly logger = new Logger(WompiController.name);

  constructor(private readonly wompiService: WompiService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate-checkout')
  generateCheckout(@Req() req: any, @Body() dto: GenerateCheckoutDto) {
    return this.wompiService.generateCheckout(req.user.userId, dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('webhook')
  handleWebhook(@Body() body: any, @Headers() headers: Record<string, string>) {
    // Debug: ver EXACTAMENTE qué llega de Wompi y qué esperamos firmar.
    this.logger.log('--- Webhook Wompi: headers ---');
    this.logger.log(JSON.stringify(headers));
    this.logger.log('--- Webhook Wompi: body (crudo) ---');
    this.logger.log(JSON.stringify(body));
    this.logger.log(
      `x-event-checksum header: ${headers['x-event-checksum'] ?? 'NO ENVIADO'}`,
    );

    return this.wompiService.handleWebhook(body, headers['x-event-checksum']);
  }

  // Proxy para el deep link de la app: Wompi valida que redirect-url sea
  // una URL http(s), así que el checkout apunta a este endpoint y él hace
  // un 302 al esquema real de la app (exp:// o EmpleosNarino://).
  @Public()
  @Get('app-redirect')
  redirectAppLink(@Query('link') link: string, @Res() res: Response) {
    if (!link || /^https?:\/\//i.test(link)) {
      throw new BadRequestException(
        'Parámetro "link" inválido. Solo se permiten deep links de la app.',
      );
    }
    res.redirect(link);
  }
}
