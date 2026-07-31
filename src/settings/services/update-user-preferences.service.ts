import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateUserPreferencesDto } from '../dto/update-user-preferences.dto';

const DEFAULT_PREFERENCES = {
  emailTransactional: true,
  emailMarketing: false,
  pushNotifications: true,
};

@Injectable()
export class UpdateUserPreferencesService {
  constructor(private prisma: PrismaService) {}

  async updateUserPreferences(
    userId: string,
    updateUserPreferencesDto: UpdateUserPreferencesDto,
  ) {
    const hasChanges = Object.keys(updateUserPreferencesDto).length > 0;

    try {
      if (!hasChanges) {
        return {
          statusCode: 200,
          message: 'No se recibieron cambios para aplicar.',
          preferences: { ...DEFAULT_PREFERENCES },
        };
      }

      const preferences = await this.prisma.userPreference.upsert({
        where: { userId },
        update: { ...updateUserPreferencesDto },
        create: { userId, ...updateUserPreferencesDto },
      });

      return {
        statusCode: 200,
        message: 'Preferencias actualizadas exitosamente.',
        preferences: {
          emailTransactional: preferences.emailTransactional,
          emailMarketing: preferences.emailMarketing,
          pushNotifications: preferences.pushNotifications,
        },
      };
    } catch (error) {
      console.error('Error al actualizar las preferencias del usuario:', error);
      throw new InternalServerErrorException({
        message:
          'Error interno del servidor al actualizar las preferencias del usuario.',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
}
