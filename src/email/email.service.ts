import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { ApplicationStatus, EntityStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { renderEmailTemplate } from './templates/render-email';

interface SendOtpParams {
  to: string;
  name: string;
  otp: string;
}

interface SendOfferStatusParams {
  to: string;
  offerTitle: string;
  status: EntityStatus;
}

interface SendApplicationStatusParams {
  to: string;
  offerTitle: string;
  status: ApplicationStatus;
}

@Injectable()
export class EmailService {
  private readonly SENDER_EMAIL: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.SENDER_EMAIL = this.configService.getOrThrow<string>(
      'SENDGRID_SENDER_EMAIL',
    );
    sgMail.setApiKey(this.configService.getOrThrow<string>('SENDGRID_API_KEY'));
  }

  // ---------------------------------------------------------------------------
  // AUTH-CRITICAL EMAILS (always sent, not gated by preferences)
  // ---------------------------------------------------------------------------

  async sendOtpEmail({ to, name, otp }: SendOtpParams): Promise<void> {
    const html = renderEmailTemplate({
      title: 'Verifica tu correo',
      greeting: `Hola ${name},`,
      contentHtml: `
        <p>Has creado una cuenta en Empleos Nariño. Para activarla y poder empezar a
        usar todos los beneficios de la plataforma, ingresa el siguiente código de
        verificación:</p>
      `,
      highlight: otp,
      highlightLabel: 'Tu código de verificación',
      footerNote:
        'El código expira en 15 minutos. Si no creaste esta cuenta, puedes ignorar este correo.',
    });

    await this.send(to, 'Confirma tu cuenta en Empleos Nariño', html);
  }

  // ---------------------------------------------------------------------------
  // TRANSACTIONAL EMAILS (gated by UserPreference.emailTransactional)
  // ---------------------------------------------------------------------------

  async sendOfferStatusEmail({
    to,
    offerTitle,
    status,
  }: SendOfferStatusParams): Promise<void> {
    if (!(await this.canSendTransactional(to))) {
      return;
    }

    let subject = '';
    let contentHtml = '';

    switch (status) {
      case EntityStatus.ACTIVE:
        subject = `Tu oferta "${offerTitle}" está activa`;
        contentHtml = `
          <p>Tu pago ha sido verificado y tu oferta <strong>${offerTitle}</strong> ya
          está visible para todos los postulantes. ¡Mucho éxito en tu búsqueda!</p>
        `;
        break;
      case EntityStatus.PENDING_PAYMENT:
        subject = `Problema con el pago de tu oferta "${offerTitle}"`;
        contentHtml = `
          <p>Detectamos un problema con el comprobante de pago de tu oferta
          <strong>${offerTitle}</strong>. Por favor, revisa la información del pago y
          vuelve a enviar el comprobante para activar tu oferta.</p>
        `;
        break;
      case EntityStatus.INACTIVE:
        subject = `Tu oferta "${offerTitle}" ha sido pausada`;
        contentHtml = `
          <p>La oferta <strong>${offerTitle}</strong> ya no está recibiendo postulaciones.
          Puedes volver a activarla cuando lo necesites.</p>
        `;
        break;
      default:
        return;
    }

    const html = renderEmailTemplate({
      title: subject,
      greeting: 'Hola,',
      contentHtml,
    });

    await this.send(to, subject, html);
  }

  async sendApplicationStatusEmail({
    to,
    offerTitle,
    status,
  }: SendApplicationStatusParams): Promise<void> {
    if (!(await this.canSendTransactional(to))) {
      return;
    }

    let subject = '';
    let contentHtml = '';

    switch (status) {
      case ApplicationStatus.REVIEWED:
        subject = `Tu postulación para "${offerTitle}" está en revisión`;
        contentHtml = `
          <p>La empresa ha comenzado a revisar tu hoja de vida para la vacante de
          <strong>${offerTitle}</strong>. ¡Mucho éxito!</p>
        `;
        break;
      case ApplicationStatus.INTERVIEWING:
        subject = `¡Buenas noticias! Avanzaste a entrevista para "${offerTitle}"`;
        contentHtml = `
          <p>Felicidades, tu perfil ha destacado. Pronto la empresa se pondrá en
          contacto contigo para coordinar los siguientes pasos del proceso.</p>
        `;
        break;
      case ApplicationStatus.REJECTED:
        subject = `Actualización de tu postulación para "${offerTitle}"`;
        contentHtml = `
          <p>Agradecemos tu interés en la vacante de <strong>${offerTitle}</strong>.
          En esta ocasión la empresa ha decidido continuar con otros candidatos.
          ¡No te desanimes y sigue postulándote!</p>
        `;
        break;
      case ApplicationStatus.HIRED:
        subject = `¡Felicidades! Has sido seleccionado para "${offerTitle}"`;
        contentHtml = `
          <p>¡Enhorabuena! Has sido elegido para la vacante de
          <strong>${offerTitle}</strong>. La empresa se pondrá en contacto contigo
          muy pronto.</p>
        `;
        break;
      case ApplicationStatus.CANCELED:
        subject = `Postulación cancelada para "${offerTitle}"`;
        contentHtml = `
          <p>Has cancelado tu postulación para la vacante de <strong>${offerTitle}</strong>.
          Si fue un error, puedes volver a postularte mientras la oferta siga activa.</p>
        `;
        break;
      default:
        return;
    }

    const html = renderEmailTemplate({
      title: subject,
      greeting: 'Hola,',
      contentHtml,
    });

    await this.send(to, subject, html);
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async canSendTransactional(email: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: { preferences: true },
      });

      if (!user) {
        this.logger.warn(
          `No se encontró un usuario para el email "${email}". No se enviará el correo transaccional.`,
        );
        return false;
      }

      return user.preferences?.emailTransactional ?? true;
    } catch (error) {
      this.logger.error(
        `Error al consultar preferencias para "${email}":`,
        error,
      );
      // Fallback seguro: si no podemos conocer la preferencia, mantenemos el envío
      return true;
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await sgMail.send({
        to,
        from: this.SENDER_EMAIL,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(`Error enviando correo de SendGrid a "${to}":`, error);
    }
  }
}
