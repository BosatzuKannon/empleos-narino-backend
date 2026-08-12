import {
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import {
  EntityType,
  GenerateCheckoutDto,
  PlanType,
} from './dto/generate-checkout.dto';

const CURRENCY = 'COP';
// Precios en centavos de COP (7000 COP = 700_000, 10000 COP = 1_000_000).
const SERVICE_PLAN_AMOUNTS: Record<PlanType, number> = {
  STANDARD: 500_000,
  FEATURED: 800_000,
};
const OFFER_PLAN_AMOUNTS: Record<PlanType, number> = {
  STANDARD: 700_000,
  FEATURED: 1_000_000,
};
const SUBSCRIPTION_DAYS = 30;

const PLANS_BY_ENTITY: Record<EntityType, Record<PlanType, number>> = {
  [EntityType.SERVICE]: SERVICE_PLAN_AMOUNTS,
  [EntityType.OFFER]: OFFER_PLAN_AMOUNTS,
};

@Injectable()
export class WompiService {
  private readonly logger = new Logger(WompiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private getKeys() {
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
    const publicKey = process.env.WOMPI_PUBLIC_KEY;
    if (!integritySecret || !publicKey) {
      throw new InternalServerErrorException(
        'Configuración de Wompi incompleta: faltan WOMPI_INTEGRITY_SECRET o WOMPI_PUBLIC_KEY.',
      );
    }
    return { integritySecret, publicKey };
  }

  private buildCheckoutUrl(params: {
    publicKey: string;
    signature: string;
    reference: string;
    amountInCents: number;
    redirectUrl?: string;
  }): string {
    const base = (
      process.env.WOMPI_CHECKOUT_BASE_URL || 'https://checkout.wompi.co/p/'
    ).replace(/\/+$/, '');
    const query = new URLSearchParams({
      'public-key': params.publicKey,
      'signature:integrity': params.signature,
      reference: params.reference,
      currency: CURRENCY,
      'amount-in-cents': String(params.amountInCents),
    });
    if (params.redirectUrl) {
      query.set('redirect-url', params.redirectUrl);
    }
    return `${base}/?${query.toString()}`;
  }

  async generateCheckout(userId: string, dto: GenerateCheckoutDto) {
    const isOffer = dto.entityType === EntityType.OFFER;

    // Valida que la publicación exista y pertenezca al usuario
    // (o a una empresa que el usuario administra).
    const entity = isOffer
      ? await this.prisma.jobVacancy.findUnique({
          where: { id: dto.entityId },
          select: {
            id: true,
            companyId: true,
            company: { select: { ownerId: true } },
          },
        })
      : await this.prisma.service.findUnique({
          where: { id: dto.entityId },
          select: { id: true, userId: true },
        });

    const ownerId = isOffer
      ? (entity as { company?: { ownerId?: string } } | null)?.company?.ownerId
      : (entity as { userId?: string } | null)?.userId;

    if (!entity) {
      throw new NotFoundException(
        isOffer
          ? 'No se encontró la oferta seleccionada.'
          : 'No se encontró el servicio seleccionado.',
      );
    }
    if (ownerId !== userId) {
      throw new ForbiddenException(
        'No puedes generar un pago para una publicación que no te pertenece.',
      );
    }

    const amountInCents = PLANS_BY_ENTITY[dto.entityType][dto.planType];
    const reference = randomUUID();
    const { integritySecret, publicKey } = this.getKeys();

    const signature = createHash('sha256')
      .update(`${reference}${amountInCents}${CURRENCY}${integritySecret}`)
      .digest('hex');

    await this.prisma.transaction.create({
      data: {
        reference,
        userId,
        ...(isOffer ? { offerId: entity.id } : { serviceId: entity.id }),
        amountInCents,
        status: 'PENDING',
      },
    });

    return {
      reference,
      amountInCents,
      currency: CURRENCY,
      signature,
      checkoutUrl: this.buildCheckoutUrl({
        publicKey,
        signature,
        reference,
        amountInCents,
        redirectUrl: dto.redirectUrl,
      }),
    };
  }

  // ponytail: verificación oficial (docs Wompi): SHA-256 de las propiedades
  // del evento + timestamp + secret. Las propiedades se toman del payload.
  private getByPath(obj: unknown, path: string): unknown {
    return path
      .split('.')
      .reduce<unknown>(
        (acc, key) =>
          acc && typeof acc === 'object' && key in acc
            ? (acc as Record<string, unknown>)[key]
            : undefined,
        obj,
      );
  }

  private resolveEventValue(body: any, path: string): unknown {
    const data = body?.data ?? body;
    // transaction.updated: las properties apuntan al objeto data.transaction
    // (p.ej. "amount_in_cents"), no a data.<path>. Otros eventos (payout.*)
    // ya traen el path completo (p.ej. "payout.id"). Probar en orden.
    const transaction = data?.transaction;
    const candidates = [
      transaction ? this.getByPath(transaction, path) : undefined,
      this.getByPath(data, path),
      this.getByPath(body, path),
    ];
    return candidates.find((v) => v !== undefined);
  }

  private isSignatureValid(body: any, headerChecksum?: string): boolean {
    const secret = process.env.WOMPI_EVENTS_SECRET;
    const signature = body?.signature;
    if (
      !secret ||
      !signature ||
      !Array.isArray(signature.properties) ||
      !signature.checksum ||
      body.timestamp == null
    ) {
      this.logger.warn('Firma inválida — estructura incompleta del evento:');
      this.logger.warn(
        `  WOMPI_EVENTS_SECRET: ${secret ? 'configurado' : 'FALTA'}`,
      );
      this.logger.warn(`  signature presente: ${signature ? 'sí' : 'NO'}`);
      this.logger.warn(
        `  signature.properties: ${signature?.properties ? JSON.stringify(signature.properties) : '-'}`,
      );
      this.logger.warn(`  signature.checksum: ${signature?.checksum ?? '-'}`);
      this.logger.warn(`  body.timestamp: ${body?.timestamp ?? '-'}`);
      return false;
    }

    const toHash =
      signature.properties
        .map((p: string) => String(this.resolveEventValue(body, p) ?? ''))
        .join('') + `${body.timestamp}${secret}`;

    const computed = createHash('sha256').update(toHash).digest('hex');

    const checksums = [signature.checksum];
    if (headerChecksum) checksums.push(headerChecksum);

    if (
      !checksums.some((checksum) => {
        try {
          return timingSafeEqual(
            Buffer.from(computed, 'hex'),
            Buffer.from(checksum, 'hex'),
          );
        } catch {
          return false;
        }
      })
    ) {
      this.logger.warn('Firma inválida — checksum no coincide:');
      this.logger.warn(
        `  properties resueltos: ${JSON.stringify(signature.properties.map((p: string) => [p, this.resolveEventValue(body, p)]))}`,
      );
      this.logger.warn(`  toHash: "${toHash}"`);
      this.logger.warn(`  computed: ${computed}`);
      this.logger.warn(`  signature.checksum: ${signature.checksum}`);
      this.logger.warn(`  header x-event-checksum: ${headerChecksum ?? '-'}`);
      return false;
    }

    return true;
  }

  async handleWebhook(body: any, headerChecksum?: string) {
    this.logger.log(
      `Webhook recibido. event=${body?.event ?? '-'} timestamp=${body?.timestamp ?? '-'} ` +
        `headerChecksum=${headerChecksum ?? '-'} transactionStatus=${body?.data?.transaction?.status ?? '-'} ` +
        `reference=${body?.data?.transaction?.reference ?? '-'}`,
    );

    if (!this.isSignatureValid(body, headerChecksum)) {
      this.logger.warn('Evento Wompi con firma inválida; rechazado.');
      throw new UnauthorizedException('Invalid Wompi event signature.');
    }

    if (body?.event !== 'transaction.updated') {
      return { received: true };
    }

    const wompiTx = body?.data?.transaction;
    if (wompiTx?.status === 'APPROVED' && wompiTx?.reference) {
      await this.approveTransaction({
        id: wompiTx.id,
        reference: wompiTx.reference,
        paymentMethodType: wompiTx.payment_method_type,
        paymentMethod: wompiTx.payment_method,
      });
    }

    return { received: true };
  }

  private async approveTransaction(wompiTx: {
    id: string;
    reference: string;
    paymentMethodType?: string | null;
    paymentMethod?: unknown;
  }) {
    const existing = await this.prisma.transaction.findUnique({
      where: { reference: wompiTx.reference },
      select: {
        id: true,
        status: true,
        amountInCents: true,
        userId: true,
        serviceId: true,
        offerId: true,
        service: { select: { title: true } },
        jobVacancy: { select: { title: true } },
      },
    });

    if (!existing) {
      this.logger.warn(
        `Evento APPROVED para referencia desconocida: ${wompiTx.reference}`,
      );
      return;
    }
    if (existing.status === 'APPROVED') {
      return;
    }

    const expiresAt = new Date(
      Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const planAmounts = existing.offerId
      ? OFFER_PLAN_AMOUNTS
      : SERVICE_PLAN_AMOUNTS;
    const isFeatured = existing.amountInCents >= planAmounts.FEATURED;

    await this.prisma.$transaction([
      this.prisma.transaction.update({
        where: { id: existing.id },
        data: {
          status: 'APPROVED',
          wompiTransactionId: wompiTx.id,
          paymentMethodType: wompiTx.paymentMethodType ?? null,
          // Solo metadata segura de Wompi: last_four, franchise/brand,
          // bin, institución. Nada de PAN/CVV/NIP en este objeto.
          paymentMethodExtra: wompiTx.paymentMethod
            ? (wompiTx.paymentMethod as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      }),
      ...(existing.serviceId
        ? [
            this.prisma.service.update({
              where: { id: existing.serviceId },
              data: {
                paymentStatus: 'APPROVED',
                status: 'ACTIVE',
                isFeatured,
                expiresAt,
              },
            }),
          ]
        : []),
      ...(existing.offerId
        ? [
            this.prisma.jobVacancy.update({
              where: { id: existing.offerId },
              data: {
                paymentStatus: 'APPROVED',
                status: 'ACTIVE',
                isFeatured,
                expiresAt,
              },
            }),
          ]
        : []),
    ]);

    this.logger.log(
      `Pago aprobado: ref=${wompiTx.reference} serviceId=${existing.serviceId ?? '-'} offerId=${existing.offerId ?? '-'} featured=${isFeatured}`,
    );

    await this.sendPaymentReceipt(existing, wompiTx.reference);
  }

  private async sendPaymentReceipt(
    tx: {
      userId: string | null;
      amountInCents: number;
      serviceId: string | null;
      offerId: string | null;
      service?: { title: string | null } | null;
      jobVacancy?: { title: string | null } | null;
    },
    reference: string,
  ) {
    const itemName = tx.offerId
      ? (tx.jobVacancy?.title ?? 'Oferta de trabajo')
      : (tx.service?.title ?? 'Servicio');

    const buyer = tx.userId
      ? await this.prisma.user.findUnique({
          where: { id: tx.userId },
          select: { email: true },
        })
      : null;

    if (!buyer?.email) {
      this.logger.warn(
        `Sin destinatario para el recibo de pago: ref=${reference}`,
      );
      return;
    }

    await this.emailService.sendPaymentReceiptEmail({
      to: buyer.email,
      itemName,
      reference,
      amountInCents: tx.amountInCents,
    });
  }
}
