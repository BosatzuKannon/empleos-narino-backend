import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import sgMail from '@sendgrid/mail';
import { UpdateApplicationStatusDto } from '../dto/update-application-status.dto';
import { ApplicationStatus } from '@prisma/client';

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
    userId: string,
    offerId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    const { status, candidateEmail, offerTitle } = dto;
    // Note: status should now be of type ApplicationStatus

    try {
      const updatedApplication = await this.prisma.application.update({
        where: {
          userId_jobId: {
            userId: userId,
            jobId: offerId,
          },
        },
        data: {
          status: status as ApplicationStatus,
        },
      });

      // Enviamos correo informativo al candidato si el estado es relevante
      await this.sendStatusEmail(candidateEmail, offerTitle, status as ApplicationStatus);

      return {
        statusCode: 200,
        message: 'Estado de postulación actualizado.',
        new_status: updatedApplication.status,
      };
    } catch (error) {
      console.error('Error al actualizar el estado de la postulación:', error);
      throw new InternalServerErrorException(
        'Error interno al actualizar la postulación.',
      );
    }
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