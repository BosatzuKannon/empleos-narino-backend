import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../../email/email.service';
import { ResendOtpDto } from '../dto/resend-otp.dto';
import {
  generateOtp,
  hashOtp,
  OTP_EXPIRATION_MS,
} from '../../common/utils/otp.util';

@Injectable()
export class ResendOtpService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async resendOtp(dto: ResendOtpDto) {
    const email = dto.email.toLowerCase();

    try {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        throw new NotFoundException({
          message: 'No existe una cuenta registrada con este correo.',
        });
      }

      if (user.isVerified) {
        throw new BadRequestException({
          message:
            'La cuenta ya se encuentra verificada. Puedes iniciar sesión.',
        });
      }

      const otp = generateOtp();
      const otpExpiresAt = new Date(Date.now() + OTP_EXPIRATION_MS);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: false,
          otpCode: hashOtp(otp),
          otpExpiresAt,
        },
      });

      await this.emailService.sendOtpEmail({
        to: email,
        name: user.firstName || '',
        otp,
      });

      return {
        statusCode: 200,
        message: 'Se ha enviado un nuevo código de verificación a tu correo.',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error al reenviar el código OTP:', error);
      throw new InternalServerErrorException({
        message: 'Error interno al reenviar el código.',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
}
