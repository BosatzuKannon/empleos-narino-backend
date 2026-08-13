import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MESSAGE_TITLE = '¡Nuevas ofertas de empleo!';
const MESSAGE_BODY =
  'Revisa las vacantes publicadas hoy en Empleos Nariño.';
const CHUNK_SIZE = 100;

const isValidPushToken = (token: string): boolean =>
  token.startsWith('ExponentPushToken[');

interface ExpoPushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data: { url: string };
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 7 * * *', { timeZone: 'America/Bogota' })
  async sendMorningOfferNotification(): Promise<void> {
    console.log('[NotificationService] Cron matutino iniciado (7:00 AM).');
    try {
      const devices = await this.prisma.device.findMany({
        where: { user: { role: 'CANDIDATE' } },
      });

      const tokens = devices
        .map((device) => device.pushToken)
        .filter(isValidPushToken);

      if (tokens.length === 0) {
        console.log(
          '[NotificationService] No hay tokens push válidos de candidatos. Se omite el envío.',
        );
        return;
      }

      const messages = tokens.map((token) => ({
        to: token,
        sound: 'default',
        title: MESSAGE_TITLE,
        body: MESSAGE_BODY,
        data: { url: '/offers' },
      }));

      const chunks: ExpoPushMessage[][] = [];
      for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
        chunks.push(messages.slice(i, i + CHUNK_SIZE));
      }

      console.log(
        `[NotificationService] Enviando ${messages.length} notificación(es) en ${chunks.length} lote(s).`,
      );
      await Promise.all(chunks.map((chunk) => this.sendChunk(chunk)));
      console.log(
        `[NotificationService] Lote(s) completado(s) con éxito: ${messages.length} notificación(es).`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[NotificationService] Error en el cron matutino: ${message}`,
      );
    }
  }

  private async sendChunk(chunk: ExpoPushMessage[]): Promise<void> {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        throw new Error(`Expo respondió HTTP ${response.status}`);
      }

      const json = (await response.json()) as { data?: { status?: string }[] };
      const okCount = (json.data ?? []).filter(
        (ticket) => ticket.status === 'ok',
      ).length;
      console.log(
        `[NotificationService] Lote OK: ${okCount}/${chunk.length} ticket(s) aceptados.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[NotificationService] Fallo al enviar un lote de notificaciones: ${message}`,
      );
    }
  }
}
