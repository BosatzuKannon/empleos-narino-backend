import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GetOffersByUserService {
  constructor(private prisma: PrismaService) {}

  async getOffersByUser(userId: string) {
    try {
      // companyId references Company.id, not User.id — find the company first
      const company = await this.prisma.company.findFirst({
        where: { ownerId: userId },
      });

      if (!company) {
        return { statusCode: 200, count: 0, data: [] };
      }

      const offers = await this.prisma.jobVacancy.findMany({
        where: { companyId: company.id },
        orderBy: { createdAt: 'desc' },
        include: {
          company: true,
          _count: {
            select: { applications: true },
          },
        },
      });

      return {
        statusCode: 200,
        count: offers.length,
        data: offers,
      };
    } catch (error) {
      console.error('Error al obtener ofertas por usuario:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido de Prisma';
      throw new InternalServerErrorException({
        message:
          'Error interno del servidor al obtener las ofertas del usuario.',
        error: errorMessage,
      });
    }
  }
}
