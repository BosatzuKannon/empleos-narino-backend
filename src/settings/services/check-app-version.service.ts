import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class CheckAppVersionService {
  constructor(private prisma: PrismaService) {}

  async checkAppVersion() {
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key: 'APP_VERSION' },
      });

      if (!config) {
        return {
          statusCode: 200,
          min_version_code: 1,
          message_es: 'Configuración de versión por defecto.',
        };
      }

      return {
        statusCode: 200,
        min_version_code: config.minVersionCode,
        message_es: config.messageEs || 'Hay una actualización obligatoria para continuar.',
        app_status: config.appStatus,
        app_status_message: config.appStatusMessage,
      };
    } catch (error) {
      console.error('Error fetching app version configuration:', error);
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al verificar la versión.',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
}