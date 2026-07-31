import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

const DEFAULT_PREFERENCES = {
  emailTransactional: true,
  emailMarketing: false,
  pushNotifications: true,
};

@Injectable()
export class GetUserPreferencesService {
  constructor(private prisma: PrismaService) {}

  async getUserPreferences(userId: string) {
    try {
      const preferences = await this.prisma.userPreference.findUnique({
        where: { userId },
      });

      if (!preferences) {
        return {
          statusCode: 200,
          preferences: { ...DEFAULT_PREFERENCES },
        };
      }

      return {
        statusCode: 200,
        preferences: {
          emailTransactional: preferences.emailTransactional,
          emailMarketing: preferences.emailMarketing,
          pushNotifications: preferences.pushNotifications,
        },
      };
    } catch (error) {
      console.error('Error al obtener las preferencias del usuario:', error);
      throw new InternalServerErrorException({
        message:
          'Error interno del servidor al obtener las preferencias del usuario.',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
}
