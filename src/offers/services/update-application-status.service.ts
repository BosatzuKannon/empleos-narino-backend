import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import sgMail from '@sendgrid/mail';
import { UpdateApplicationStatusDto } from '../dto/update-application-status.dto';
import { ApplicationStatus } from '@prisma/client';

const STATUS_MAP: Record<string, ApplicationStatus> = {
  enviada: ApplicationStatus.SENT,
  en_revision: ApplicationStatus.REVIEWED,
  entrevista: ApplicationStatus.INTERVIEWING,
  rechazada: ApplicationStatus.REJECTED,
  seleccionado: ApplicationStatus.HIRED,
  cancelada: ApplicationStatus.CANCELED,
};

const ACTIVE_PROCESS_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.SENT,
  ApplicationStatus.REVIEWED,
  ApplicationStatus.INTERVIEWING,
];

@Injectable()
export class UpdateApplicationStatusService {
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

  async updateApplicationStatus(
    currentUserId: string,
    applicationId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    const { status, candidateEmail, offerTitle } = dto;
    const targetStatus = STATUS_MAP[status];

    if (!targetStatus) {
      throw new BadRequestException({
        message: `El estado "${status}" no es válido.`,
      });
    }

    try {
      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: { jobVacancy: true },
      });

      if (!application) {
        throw new NotFoundException({
          message: 'La postulación indicada no existe.',
        });
      }

      const offer = application.jobVacancy;

      if (application.status === ApplicationStatus.CANCELED) {
        throw new BadRequestException({
          message:
            'El candidato ha cancelado su postulación. Esta no puede ser modificada.',
        });
      }

      if (targetStatus === ApplicationStatus.CANCELED) {
        // Solo el propio candidato puede cancelar su postulación
        if (application.userId !== currentUserId) {
          throw new ForbiddenException({
            message: 'Solo el postulante puede cancelar su postulación.',
          });
        }

        if (!ACTIVE_PROCESS_STATUSES.includes(application.status)) {
          throw new BadRequestException({
            message:
              'No se puede cancelar una postulación que ya finalizó su proceso.',
          });
        }

        const canceled = await this.prisma.application.update({
          where: { id: applicationId },
          data: { status: ApplicationStatus.CANCELED },
        });

        await this.sendStatusEmail(
          candidateEmail,
          offerTitle,
          ApplicationStatus.CANCELED,
        );

        return {
          statusCode: 200,
          message: 'Postulación cancelada exitosamente.',
          new_status: canceled.status,
        };
      }

      // Resto de cambios de estado: solo la empresa dueña de la oferta
      const company = await this.prisma.company.findFirst({
        where: { ownerId: currentUserId },
      });

      if (!company || offer.companyId !== company.id) {
        throw new ForbiddenException({
          message:
            'No tienes permisos para modificar esta postulación.',
        });
      }

      if (offer.status !== 'ACTIVE') {
        throw new BadRequestException({
          message:
            'No se puede modificar postulaciones de una oferta que ya no está activa.',
        });
      }

      if (targetStatus === ApplicationStatus.HIRED) {
        return this.handleHire(applicationId, offer, candidateEmail, offerTitle);
      }

      const updatedApplication = await this.prisma.application.update({
        where: { id: applicationId },
        data: { status: targetStatus },
      });

      await this.sendStatusEmail(
        candidateEmail,
        offerTitle,
        targetStatus,
      );

      return {
        statusCode: 200,
        message: 'Estado de postulación actualizado.',
        new_status: updatedApplication.status,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error al actualizar el estado de la postulación:', error);
      throw new InternalServerErrorException(
        'Error interno al actualizar la postulación.',
      );
    }
  }

  private async handleHire(
    applicationId: string,
    offer: { id: string; title: string; availablePositions: number | null },
    candidateEmail: string,
    offerTitle: string,
  ) {
    const availablePositions = offer.availablePositions ?? 1;

    const hiredCount = await this.prisma.application.count({
      where: {
        jobId: offer.id,
        status: ApplicationStatus.HIRED,
      },
    });

    if (hiredCount >= availablePositions) {
      throw new BadRequestException({
        message:
          'La oferta ya alcanzó el número máximo de cupos disponibles.',
      });
    }

    const fillsLastPosition = hiredCount + 1 >= availablePositions;

    if (fillsLastPosition) {
      // La última vacante se llenó: cerrar la oferta y rechazar a los demás
      await this.prisma.$transaction([
        this.prisma.application.update({
          where: { id: applicationId },
          data: { status: ApplicationStatus.HIRED },
        }),
        this.prisma.application.updateMany({
          where: {
            jobId: offer.id,
            id: { not: applicationId },
            status: { in: ACTIVE_PROCESS_STATUSES },
          },
          data: { status: ApplicationStatus.REJECTED },
        }),
        this.prisma.jobVacancy.update({
          where: { id: offer.id },
          data: { status: 'CLOSED' },
        }),
      ]);

      await this.sendStatusEmail(
        candidateEmail,
        offerTitle,
        ApplicationStatus.HIRED,
      );

      // Avisa a los demás candidatos que quedaron rechazados
      const rejected = await this.prisma.application.findMany({
        where: {
          jobId: offer.id,
          id: { not: applicationId },
          status: ApplicationStatus.REJECTED,
        },
        include: { user: true },
      });

      for (const app of rejected) {
        await this.sendStatusEmail(
          app.user.email,
          offerTitle,
          ApplicationStatus.REJECTED,
        );
      }

      return {
        statusCode: 200,
        message:
          '¡Felicidades! Candidato seleccionado. La oferta se cerró y los demás postulantes fueron notificados.',
        new_status: ApplicationStatus.HIRED,
      };
    }

    const updatedApplication = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.HIRED },
    });

    await this.sendStatusEmail(
      candidateEmail,
      offerTitle,
      ApplicationStatus.HIRED,
    );

    return {
      statusCode: 200,
      message:
        'Candidato seleccionado. Quedan cupos disponibles en la oferta.',
      new_status: updatedApplication.status,
    };
  }

  private async sendStatusEmail(
    to: string,
    offerTitle: string,
    status: ApplicationStatus,
  ) {
    let subject = '';
    let htmlContent = '';

    switch (status) {
      case ApplicationStatus.REVIEWED:
        subject = `👀 Tu postulación para "${offerTitle}" está en revisión`;
        htmlContent = `<p>Hola, la empresa ha comenzado a revisar tu hoja de vida para la vacante de <strong>${offerTitle}</strong>. ¡Mucho éxito!</p>`;
        break;
      case ApplicationStatus.INTERVIEWING:
        subject = `🎉 ¡Buenas noticias! Has avanzado a la fase de entrevista para "${offerTitle}"`;
        htmlContent = `<p>Felicidades, tu perfil ha destacado. Pronto la empresa se pondrá en contacto contigo para los siguientes pasos.</p>`;
        break;
      case ApplicationStatus.REJECTED:
        subject = `Actualización de tu postulación para "${offerTitle}"`;
        htmlContent = `<p>Hola, agradecemos tu interés. En esta ocasión la empresa ha decidido continuar con otros candidatos. ¡No te desanimes y sigue postulándote!</p>`;
        break;
      case ApplicationStatus.HIRED:
        subject = `🏆 ¡Felicidades! Has sido seleccionado para "${offerTitle}"`;
        htmlContent = `<p>¡Enhorabuena! Has sido elegido para la vacante. Revisa tu correo o teléfono, te contactarán pronto.</p>`;
        break;
      case ApplicationStatus.CANCELED:
        subject = `Postulación cancelada para "${offerTitle}"`;
        htmlContent = `<p>Has cancelado tu postulación para la vacante de <strong>${offerTitle}</strong>. Si fue un error, puedes volver a postularte mientras la oferta siga activa.</p>`;
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
