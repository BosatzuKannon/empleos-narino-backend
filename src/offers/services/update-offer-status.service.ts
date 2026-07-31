import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../../email/email.service';
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

      if (creatorEmail && shouldNotify && updatedOffer) {
        await this.emailService.sendOfferStatusEmail({
          to: creatorEmail,
          offerTitle: updatedOffer.title,
          status: targetStatus,
        });
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
}
