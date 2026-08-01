import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../../email/email.service';
import { PushNotificationService } from '../../push-notifications/push-notifications.service';
import { UpdateOfferStatusDto } from '../dto/update-offer-status.dto';
import { EntityStatus } from '@prisma/client';

const STATUS_MAP: Record<string, EntityStatus> = {
  verificando_pago: EntityStatus.PENDING_PAYMENT,
  activo: EntityStatus.ACTIVE,
  inactivo: EntityStatus.INACTIVE,
  pago_incorrecto: EntityStatus.PENDING_PAYMENT,
};

@Injectable()
export class UpdateOfferStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async updateOfferStatus(
    offerId: string,
    updatedBy: string,
    dto: UpdateOfferStatusDto,
  ) {
    const { status, creatorEmail } = dto;
    const targetStatus = STATUS_MAP[status];

    try {
      const updatedOffer = await this.prisma.jobVacancy.update({
        where: { id: offerId },
        data: {
          status: targetStatus,
        },
      });

      // Fix: Explicitly type the array as EntityStatus[]
      const notifyStatuses: EntityStatus[] = [
        EntityStatus.ACTIVE,
        EntityStatus.INACTIVE,
        EntityStatus.PENDING_PAYMENT,
      ];
      const shouldNotify = notifyStatuses.includes(targetStatus);

      if (shouldNotify && updatedOffer) {
        if (creatorEmail) {
          await this.emailService.sendOfferStatusEmail({
            to: creatorEmail,
            offerTitle: updatedOffer.title,
            status: targetStatus,
          });
        }

        await this.pushNotificationService.sendToUser(
          updatedBy,
          this.buildOfferStatusPush(
            targetStatus,
            updatedOffer.title,
            updatedOffer.id,
          ),
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

  private buildOfferStatusPush(
    status: EntityStatus,
    offerTitle: string,
    offerId: string,
  ): { title: string; body: string; data: Record<string, unknown> } {
    const data: Record<string, unknown> = {
      type: 'offer_status',
      route: '/(tabs)/offers',
      offerId,
      offerTitle,
      status,
    };

    switch (status) {
      case EntityStatus.ACTIVE:
        return {
          title: 'Tu oferta está activa',
          body: `La oferta "${offerTitle}" ya está visible para todos los postulantes. ¡Mucho éxito!`,
          data,
        };
      case EntityStatus.INACTIVE:
        return {
          title: 'Tu oferta ha sido pausada',
          body: `La oferta "${offerTitle}" ya no está recibiendo postulaciones. Puedes reactivarla cuando lo necesites.`,
          data,
        };
      case EntityStatus.PENDING_PAYMENT:
        return {
          title: 'Problema con el pago de tu oferta',
          body: `Detectamos un problema con el comprobante de pago de "${offerTitle}". Revisa la información del pago.`,
          data,
        };
      default:
        return {
          title: 'Actualización de tu oferta',
          body: `La oferta "${offerTitle}" cambió de estado.`,
          data,
        };
    }
  }
}
