import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GetServiceByIdService {
  constructor(private readonly prisma: PrismaService) {}

  async getServiceById(serviceId: string) {
    try {
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
        include: {
          category: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              city: true,
            },
          },
        },
      });

      if (!service) {
        throw new NotFoundException('No se encontró el servicio.');
      }

      return {
        statusCode: 200,
        service: service,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error al obtener el servicio:', error);
      throw error;
    }
  }
}
