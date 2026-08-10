import {
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma.service';
import { GenerateCheckoutDto, PlanType } from './dto/generate-checkout.dto';

const CURRENCY = 'COP';
const PLAN_AMOUNTS: Record<PlanType, number> = {
  STANDARD: 500_000,
  FEATURED: 800_000,
};
const FEATURED_MIN_CENTS = PLAN_AMOUNTS.FEATURED;
const SUBSCRIPTION_DAYS = 30;

@Injectable()
export class WompiService {
  private readonly logger = new Logger(WompiService.name);

  constructor(private readonly prisma: PrismaService) {}

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
    return `${base}/?${query.toString()}`;
  }

  async generateCheckout(userId: string, dto: GenerateCheckoutDto) {
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      select: { id: true, userId: true },
    });

    if (!service) {
      throw new NotFoundException('No se encontró el servicio seleccionado.');
    }
    if (service.userId !== userId) {
      throw new ForbiddenException(
        'No puedes generar un pago para un servicio que no te pertenece.',
      );
    }

    const amountInCents = PLAN_AMOUNTS[dto.planType];
    const reference = randomUUID();
    const { integritySecret, publicKey } = this.getKeys();

    const signature = createHash('sha256')
      .update(`${reference}${amountInCents}${CURRENCY}${integritySecret}`)
      .digest('hex');

    await this.prisma.transaction.create({
      data: {
        reference,
        userId,
        serviceId: service.id,
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
      }),
    };
  }

  // ponytail: verificación oficial (docs Wompi): SHA-256 de las propiedades
  // del evento + timestamp + secret. Las propiedades se toman del payload.
  private getByPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object' && key in acc
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      obj,
    );
  }

  private resolveEventValue(body: any, path: string): unknown {
    const data = body?.data ?? body;
    const v = this.getByPath(data, path);
    return v !== undefined ? v : this.getByPath(body, path);
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
      return false;
    }

    const toHash =
      signature.properties
        .map((p: string) => String(this.resolveEventValue(body, p) ?? ''))
        .join('') + `${body.timestamp}${secret}`;

    const computed = createHash('sha256').update(toHash).digest('hex');

    const checksums = [signature.checksum];
    if (headerChecksum) checksums.push(headerChecksum);

    return checksums.some((checksum) => {
      try {
        return timingSafeEqual(
          Buffer.from(computed, 'hex'),
          Buffer.from(checksum, 'hex'),
        );
      } catch {
        return false;
      }
    });
  }

  async handleWebhook(body: any, headerChecksum?: string) {
    if (!this.isSignatureValid(body, headerChecksum)) {
      this.logger.warn('Evento Wompi con firma inválida; rechazado.');
      throw new UnauthorizedException('Invalid Wompi event signature.');
    }

    if (body?.event !== 'transaction.updated') {
      return { received: true };
    }

    const wompiTx = body?.data?.transaction;
    if (wompiTx?.status === 'APPROVED' && wompiTx?.reference) {
      await this.approveTransaction(wompiTx);
    }

    return { received: true };
  }

  private async approveTransaction(wompiTx: {
    id: string;
    reference: string;
  }) {
    const existing = await this.prisma.transaction.findUnique({
      where: { reference: wompiTx.reference },
      select: { id: true, status: true, amountInCents: true, serviceId: true },
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
    const isFeatured = existing.amountInCents >= FEATURED_MIN_CENTS;

    await this.prisma.$transaction([
      this.prisma.transaction.update({
        where: { id: existing.id },
        data: { status: 'APPROVED', wompiTransactionId: wompiTx.id },
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
    ]);

    this.logger.log(
      `Pago aprobado: ref=${wompiTx.reference} serviceId=${existing.serviceId ?? '-'} featured=${isFeatured}`,
    );
  }
}
