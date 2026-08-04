import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GetActiveServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveServices() {
    try {
      const services = await this.prisma.service.findMany({
        where: {
          status: 'ACTIVE',
        },
        orderBy: {
          createdAt: 'desc',
        },
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

      return {
        statusCode: 200,
        services: services,
      };
    } catch (error) {
      console.error('Error al obtener servicios activos:', error);
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al obtener los servicios.',
        error:
          error instanceof Error
            ? error.message
            : 'Error desconocido de Prisma',
      });
    }
  }
}
