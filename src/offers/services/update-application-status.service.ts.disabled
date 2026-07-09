import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as sgMail from '@sendgrid/mail';
import { UpdateApplicationStatusDto } from '../dto/update-application-status.dto';

@Injectable()
export class UpdateApplicationStatusService {
  private docClient: DynamoDBDocumentClient;
  private readonly TABLE_NAME: string;
  private readonly SENDER_EMAIL: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    this.TABLE_NAME = this.configService.getOrThrow<string>(
      'DYNAMODB_TABLE_NAME',
    );
    this.SENDER_EMAIL = this.configService.getOrThrow<string>(
      'SENDGRID_SENDER_EMAIL',
    );

    const sendgridApiKey =
      this.configService.getOrThrow<string>('SENDGRID_API_KEY');
    sgMail.setApiKey(sendgridApiKey);

    const ddbClient = new DynamoDBClient({ region });
    this.docClient = DynamoDBDocumentClient.from(ddbClient);
  }

  async updateApplicationStatus(
    cognitoId: string,
    offerId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    const { status, candidateEmail, offerTitle } = dto;

    try {
      const command = new UpdateCommand({
        TableName: this.TABLE_NAME,
        Key: {
          pk: `USER#${cognitoId}`,
          sk: `APPLICATION#${offerId}`,
        },
        UpdateExpression: 'set #status = :s, updated_at = :u',
        ExpressionAttributeNames: {
          '#status': 'status', // 'status' es palabra reservada en Dynamo, usamos alias
        },
        ExpressionAttributeValues: {
          ':s': status,
          ':u': new Date().toISOString(),
        },
        ReturnValues: 'UPDATED_NEW',
      });

      await this.docClient.send(command);

      // Enviamos correo informativo al candidato si el estado es relevante
      await this.sendStatusEmail(candidateEmail, offerTitle, status);

      return {
        statusCode: 200,
        message: 'Estado de postulación actualizado.',
        new_status: status,
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
    status: string,
  ) {
    let subject = '';
    let htmlContent = '';

    switch (status) {
      case 'en_revision':
        subject = `👀 Tu postulación para "${offerTitle}" está en revisión`;
        htmlContent = `<p>Hola, la empresa ha comenzado a revisar tu hoja de vida para la vacante de <strong>${offerTitle}</strong>. ¡Mucho éxito!</p>`;
        break;
      case 'entrevista':
        subject = `🎉 ¡Buenas noticias! Has avanzado a la fase de entrevista para "${offerTitle}"`;
        htmlContent = `<p>Felicidades, tu perfil ha destacado. Pronto la empresa se pondrá en contacto contigo para los siguientes pasos.</p>`;
        break;
      case 'rechazada':
        subject = `Actualización de tu postulación para "${offerTitle}"`;
        htmlContent = `<p>Hola, agradecemos tu interés. En esta ocasión la empresa ha decidido continuar con otros candidatos. ¡No te desanimes y sigue postulándote!</p>`;
        break;
      case 'seleccionado':
        subject = `🏆 ¡Felicidades! Has sido seleccionado para "${offerTitle}"`;
        htmlContent = `<p>¡Enhorabuena! Has sido elegido para la vacante. Revisa tu correo o teléfono, te contactarán pronto.</p>`;
        break;
      default:
        return; // No enviamos correo para 'enviada' u otros no contemplados
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
      // No lanzamos excepción para no bloquear la app
    }
  }
}
