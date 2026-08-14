import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma.service';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.bosatzu.empleosnarino';
const APP_SCHEME = 'empleosnarino';
const APP_WEB_URL = 'https://empleos-narino-backend.onrender.com';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

@Controller('share')
export class ShareController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(':type/:id')
  async share(
    @Param('type') type: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    if (type !== 'offer' && type !== 'service') {
      throw new BadRequestException('Tipo de contenido no válido');
    }

    let title = 'Empleos Nariño';
    let description =
      'Encuentra tu próximo empleo o servicio profesional en Nariño.';

    if (type === 'offer') {
      const offer = await this.prisma.jobVacancy.findUnique({ where: { id } });
      if (offer) {
        title = offer.title;
        description = offer.description;
      }
    } else {
      const service = await this.prisma.service.findUnique({ where: { id } });
      if (service) {
        title = service.title;
        description = service.description;
      }
    }

    const shareUrl = `${APP_WEB_URL}/share/${type}/${id}`;
    const deepLink = JSON.stringify(`${APP_SCHEME}://${type}/${id}`);
    const playStore = JSON.stringify(PLAY_STORE_URL);
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle} - Empleos Nariño</title>
  <meta property="og:site_name" content="Empleos Nariño" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:url" content="${shareUrl}" />
  <script>
    (function () {
      window.location.href = ${deepLink};
      setTimeout(function () {
        window.location.href = ${playStore};
      }, 1500);
    })();
  </script>
</head>
<body style="margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f7faf2; color: #333; display: flex; align-items: center; justify-content: center; height: 100vh;">
  <p style="font-size: 18px;">Abriendo Empleos Nariño...</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
