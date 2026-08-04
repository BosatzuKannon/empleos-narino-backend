import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateServiceStatusDto } from '../dto/update-service-status.dto';

@Injectable()
export class UpdateServiceStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async updateServiceStatus(
    userId: string,
    serviceId: string,
    dto: UpdateServiceStatusDto,
  ) {
    try {
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service) {
        throw new NotFoundException('No se encontró el servicio.');
      }

      if (service.userId !== userId) {
        throw new ForbiddenException(
          'No tienes permisos para modificar este servicio.',
        );
      }

      const updated = await this.prisma.service.update({
        where: { id: serviceId },
        data: {
          status: dto.status,
        },
      });

      return {
        statusCode: 200,
        message: 'Estado del servicio actualizado exitosamente.',
        service_id: updated.id,
        new_status: updated.status,
        updated_at: updated.updatedAt,
      };
    } catch (error) {
      console.error('Error al actualizar el estado del servicio:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al actualizar el estado.',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
}
