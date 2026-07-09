import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as sgMail from '@sendgrid/mail';
import { UpdateOfferStatusDto } from '../dto/update-offer-status.dto';

interface OfferAttributes {
  titulo?: string;
  updated_at?: string;
  [key: string]: unknown;
}

@Injectable()
export class UpdateOfferStatusService {
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

  async updateOfferStatus(
    offerId: string,
    updatedBy: string,
    dto: UpdateOfferStatusDto,
  ) {
    const { status, creatorEmail } = dto;

    try {
      const command = new UpdateCommand({
        TableName: this.TABLE_NAME,
        Key: {
          pk: `OFFER#${offerId}`,
          sk: 'METADATA',
        },
        UpdateExpression: 'set estado = :s, updated_at = :u, updated_by = :ub',
        ExpressionAttributeValues: {
          ':s': status,
          ':u': new Date().toISOString(),
          ':ub': updatedBy || 'SYSTEM',
        },
        ReturnValues: 'ALL_NEW',
      });

      const result = await this.docClient.send(command);
      const newOfferDetails = result.Attributes as OfferAttributes | undefined;

      // Evaluar envío de correo
      const shouldNotify = ['activo', 'inactivo', 'pago_incorrecto'].includes(
        status,
      );
      if (creatorEmail && shouldNotify && newOfferDetails) {
        await this.sendOfferStatusUpdateEmail(
          creatorEmail,
          newOfferDetails,
          status,
        );
      }

      return {
        statusCode: 200,
        message: 'Estado de la oferta actualizado exitosamente.',
        offer_id: offerId,
        new_status: status,
        updated_at: newOfferDetails?.updated_at,
      };
    } catch (error) {
      console.error('Error al actualizar el estado de la oferta:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al actualizar el estado.',
        error: errorMessage,
      });
    }
  }

  private async sendOfferStatusUpdateEmail(
    to: string,
    offerDetails: Record<string, any>,
    status: string,
  ) {
    let subject = '';
    let htmlContent = '';
    const title = (offerDetails.titulo as string) || 'Tu oferta';

    switch (status) {
      case 'activo':
        subject = `✅ Tu oferta "${title}" ha sido APROBADA y está activa`;
        htmlContent = `<p>Hola, tu pago ha sido verificado y tu oferta <strong>${title}</strong> ya está visible.</p>`;
        break;
      case 'pago_incorrecto':
        subject = `⚠️ Problema con el pago de tu oferta "${title}"`;
        htmlContent = `<p>Hola, detectamos un problema con el comprobante de pago de tu oferta.</p>`;
        break;
      case 'inactivo':
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
      // No lanzamos error aquí para no bloquear la actualización en BD si falla el correo
    }
  }
}
