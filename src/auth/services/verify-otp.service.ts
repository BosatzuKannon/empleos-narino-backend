import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { verifyOtp } from '../../common/utils/otp.util';

@Injectable()
export class VerifyOtpService {
  constructor(private prisma: PrismaService) {}

  async verifyOtp(dto: VerifyOtpDto) {
    const email = dto.email.toLowerCase();
    const { code } = dto;

    try {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user || !user.otpCode || !user.otpExpiresAt) {
        throw new BadRequestException({
          message:
            'No hay un código pendiente de verificación para este correo. Solicita uno nuevo.',
        });
      }

      if (user.isVerified) {
        throw new BadRequestException({
          message:
            'La cuenta ya se encuentra verificada. Puedes iniciar sesión.',
        });
      }

      if (user.otpExpiresAt.getTime() < Date.now()) {
        throw new BadRequestException({
          message: 'El código ha expirado. Solicita uno nuevo.',
        });
      }

      if (!verifyOtp(code, user.otpCode)) {
        throw new BadRequestException({
          message: 'El código ingresado es incorrecto.',
        });
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true, otpCode: null, otpExpiresAt: null },
      });

      return {
        statusCode: 200,
        message: 'Cuenta verificada exitosamente. Ya puedes iniciar sesión.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error('Error al verificar el código OTP:', error);
      throw new InternalServerErrorException({
        message: 'Error interno al verificar el código.',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
}
