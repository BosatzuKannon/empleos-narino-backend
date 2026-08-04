import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PrismaService } from '../prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushNotificationService {
  private readonly expo: Expo;
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.expo = new Expo({
      accessToken: this.configService.get<string>('EXPO_ACCESS_TOKEN'),
    });
  }

  // ---------------------------------------------------------------------------
  // EVENTOS INDIVIDUALES (A: postulación, B: oferta) — gated por preferencias
  // ---------------------------------------------------------------------------

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { preferences: true, devices: true },
      });

      if (!user) {
        this.logger.warn(
          `No se encontró el usuario "${userId}". Se omite el push.`,
        );
        return;
      }

      if (user.preferences?.pushNotifications === false) {
        this.logger.log(
          `El usuario "${userId}" desactivó las notificaciones push. Se omite.`,
        );
        return;
      }

      const tokens = this.getValidTokens(user.devices);
      if (tokens.length === 0) {
        this.logger.log(
          `El usuario "${userId}" no tiene tokens push válidos. Se omite.`,
        );
        return;
      }

      await this.sendChunked(tokens, payload);
    } catch (error) {
      this.logger.error(`Error al enviar push al usuario "${userId}":`, error);
    }
  }

  // ---------------------------------------------------------------------------
  // EVENTO MASIVO (C: nueva oferta para todos los candidatos)
  // ---------------------------------------------------------------------------

  async sendToCandidates(payload: PushPayload): Promise<void> {
    try {
      const candidates = await this.prisma.user.findMany({
        where: { role: 'CANDIDATE' },
        include: { preferences: true, devices: true },
      });

      const tokens: string[] = [];
      for (const candidate of candidates) {
        if (candidate.preferences?.pushNotifications === false) {
          continue;
        }
        tokens.push(...this.getValidTokens(candidate.devices));
      }

      if (tokens.length === 0) {
        this.logger.log(
          'No hay candidatos con tokens push válidos. Se omite el envío masivo.',
        );
        return;
      }

      await this.sendChunked(tokens, payload);
    } catch (error) {
      this.logger.error('Error al enviar push masivo a candidatos:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // EVENTO MASIVO (D: nuevo servicio para todas las empresas)
  // ---------------------------------------------------------------------------

  async sendToCompanies(payload: PushPayload): Promise<void> {
    try {
      const companies = await this.prisma.user.findMany({
        where: { role: 'COMPANY_ADMIN' },
        include: { preferences: true, devices: true },
      });

      const tokens: string[] = [];
      for (const company of companies) {
        if (company.preferences?.pushNotifications === false) {
          continue;
        }
        tokens.push(...this.getValidTokens(company.devices));
      }

      if (tokens.length === 0) {
        this.logger.log(
          'No hay empresas con tokens push válidos. Se omite el envío masivo.',
        );
        return;
      }

      await this.sendChunked(tokens, payload);
    } catch (error) {
      this.logger.error('Error al enviar push masivo a empresas:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private getValidTokens(devices: { pushToken: string }[]): string[] {
    return devices
      .map((device) => device.pushToken)
      .filter((token) => Expo.isExpoPushToken(token));
  }

  private async sendChunked(
    tokens: string[],
    payload: PushPayload,
  ): Promise<void> {
    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      sound: 'default',
      data: payload.data ?? {},
    }));

    // Expo permite hasta 100 mensajes por lote. chunkPushNotifications lo divide.
    const chunks = this.expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        await this.handleTickets(tickets, chunk);
      } catch (error) {
        this.logger.error(
          'Error al enviar un lote de notificaciones push:',
          error,
        );
      }
    }
  }

  private async handleTickets(
    tickets: ExpoPushTicket[],
    messages: ExpoPushMessage[],
  ): Promise<void> {
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const message = messages[i];
      if (!ticket) continue;

      if (ticket.status === 'ok') continue;

      if (ticket.details?.error === 'DeviceNotRegistered' && message) {
        // Token obsoleto/desinstalado: lo eliminamos para no enviar en el futuro
        const token = typeof message.to === 'string' ? message.to : '';
        if (token) {
          await this.prisma.device.deleteMany({ where: { pushToken: token } });
          this.logger.warn(
            `Token push eliminado por DeviceNotRegistered: ${token}`,
          );
        }
      } else {
        this.logger.warn(
          `Error de envío push: ${ticket.details?.error ?? ticket.message}`,
        );
      }
    }
  }
}
