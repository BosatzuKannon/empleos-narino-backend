import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GetServicesByUserService {
  constructor(private prisma: PrismaService) {}

  async getServicesByUser(userId: string) {
    try {
      const services = await this.prisma.service.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
        },
      });

      return {
        statusCode: 200,
        count: services.length,
        data: services,
      };
    } catch (error) {
      console.error('Error al obtener servicios por usuario:', error);
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
