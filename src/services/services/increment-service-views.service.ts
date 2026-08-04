import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class IncrementServiceViewsService {
  constructor(private readonly prisma: PrismaService) {}

  async incrementViews(serviceId: string) {
    try {
      const service = await this.prisma.service.update({
        where: { id: serviceId },
        data: {
          viewsCount: { increment: 1 },
        },
      });

      return {
        statusCode: 200,
        message: 'Vistas incrementadas.',
        viewsCount: service.viewsCount,
      };
    } catch (error) {
      console.error('Error al incrementar las vistas del servicio:', error);
      throw new NotFoundException('No se encontró el servicio.');
    }
  }
}
