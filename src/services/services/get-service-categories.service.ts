import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GetServiceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getServiceCategories() {
    try {
      const categories = await this.prisma.serviceCategory.findMany({
        orderBy: {
          name: 'asc',
        },
        include: {
          _count: {
            select: { services: true },
          },
        },
      });

      return {
        statusCode: 200,
        count: categories.length,
        data: categories,
      };
    } catch (error) {
      console.error('Error al obtener las categorías de servicios:', error);
      throw new InternalServerErrorException({
        message:
          'Error interno del servidor al obtener las categorías de servicios.',
        error:
          error instanceof Error
            ? error.message
            : 'Error desconocido de Prisma',
      });
    }
  }
}
