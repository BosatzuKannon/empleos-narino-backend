import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DeleteServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async deleteService(userId: string, serviceId: string) {
    try {
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service) {
        throw new NotFoundException('No se encontró el servicio.');
      }

      if (service.userId !== userId) {
        throw new ForbiddenException(
          'No tienes permisos para eliminar este servicio.',
        );
      }

      await this.prisma.service.delete({
        where: { id: serviceId },
      });

      return {
        statusCode: 200,
        message: 'Servicio eliminado exitosamente.',
        service_id: serviceId,
      };
    } catch (error) {
      console.error('Error al eliminar el servicio:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al eliminar el servicio.',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
}
