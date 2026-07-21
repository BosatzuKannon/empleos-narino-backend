import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GetActiveOffersService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveOffers() {
    try {
      const offers = await this.prisma.jobVacancy.findMany({
        where: {
          status: 'ACTIVE',
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          company: true, // Includes the company data tied to the offer
        }
      });

      return {
        statusCode: 200,
        offers: offers,
      };
    } catch (error) {
      console.error('Error al obtener ofertas activas:', error);
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al obtener las ofertas.',
        error: error instanceof Error ? error.message : 'Error desconocido de Prisma',
      });
    }
  }
}