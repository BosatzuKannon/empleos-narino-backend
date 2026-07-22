import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import sgMail from '@sendgrid/mail';
import { UpdateOfferStatusDto } from '../dto/update-offer-status.dto';
import { EntityStatus } from '@prisma/client';

@Injectable()
export class UpdateOfferStatusService {
  private readonly SENDER_EMAIL: string;

  constructor(
    private configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.SENDER_EMAIL = this.configService.getOrThrow<string>(
      'SENDGRID_SENDER_EMAIL',
    );

    const sendgridApiKey =
      this.configService.getOrThrow<string>('SENDGRID_API_KEY');
    sgMail.setApiKey(sendgridApiKey);
  }

  async updateOfferStatus(
    offerId: string,
    updatedBy: string,
    dto: UpdateOfferStatusDto,
  ) {
    const { status, creatorEmail } = dto;

    try {
      const updatedOffer = await this.prisma.jobVacancy.update({
        where: { id: offerId },
        data: {
          status: status as EntityStatus,
        },
      });

      // Fix: Explicitly type the array as EntityStatus[]
      const notifyStatuses: EntityStatus[] = [
        EntityStatus.ACTIVE,
        EntityStatus.INACTIVE,
        EntityStatus.PENDING_PAYMENT,
      ];
      const shouldNotify = notifyStatuses.includes(status as EntityStatus);

      if (creatorEmail && shouldNotify && updatedOffer) {
        await this.sendOfferStatusUpdateEmail(
          creatorEmail,
          updatedOffer,
          status as EntityStatus,
        );
      }

      return {
        statusCode: 200,
        message: 'Estado de la oferta actualizado exitosamente.',
        offer_id: updatedOffer.id,
        new_status: updatedOffer.status,
        updated_at: updatedOffer.updatedAt,
      };
    } catch (error) {
      console.error('Error al actualizar el estado de la oferta:', error);
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al actualizar el estado.',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }

  private async sendOfferStatusUpdateEmail(
    to: string,
    offerDetails: Record<string, any>,
    status: EntityStatus,
  ) {
    let subject = '';
    let htmlContent = '';
    const title = offerDetails.title || 'Tu oferta';

    switch (status) {
      case EntityStatus.ACTIVE:
        subject = `✅ Tu oferta "${title}" ha sido APROBADA y está activa`;
        htmlContent = `<p>Hola, tu pago ha sido verificado y tu oferta <strong>${title}</strong> ya está visible.</p>`;
        break;
      case EntityStatus.PENDING_PAYMENT:
        subject = `⚠️ Problema con el pago de tu oferta "${title}"`;
        htmlContent = `<p>Hola, detectamos un problema con el comprobante de pago de tu oferta.</p>`;
        break;
      case EntityStatus.INACTIVE:
        subject = `⏸️ Tu oferta "${title}" ha sido pausada/inactivada`;
        htmlContent = `<p>Hola, la oferta <strong>${title}</strong> ya no está recibiendo postulaciones.</p>`;
        break;
      default:
        return;
    }

    try {
      await sgMail.send({
        to,
        from: this.SENDER_EMAIL,
        subject,
        html: htmlContent,
      });
    } catch (error) {
      console.error('Error enviando correo de SendGrid:', error);
    }
  }
}
