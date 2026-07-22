import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RegisterPushTokenDto } from '../dto/register-push-token.dto';

@Injectable()
export class RegisterPushTokenService {
  constructor(private prisma: PrismaService) {}

  async registerPushToken(
    userId: string,
    registerPushTokenDto: RegisterPushTokenDto,
  ) {
    const { token, platform } = registerPushTokenDto;

    if (!token) {
      return {
        statusCode: 200,
        message: 'No push token provided, skipping registration.',
      };
    }

    try {
      const device = await this.prisma.device.upsert({
        where: { pushToken: token },
        update: {
          userId: userId,
          platform: platform,
          updatedAt: new Date(),
        },
        create: {
          pushToken: token,
          platform: platform,
          userId: userId,
        },
      });

      return {
        statusCode: 201,
        message: 'Push Token registrado/actualizado exitosamente.',
        deviceId: device.id,
      };
    } catch (error) {
      console.error('Error al registrar el Push Token:', error);
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al registrar el Push Token.',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
}
