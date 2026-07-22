import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service'; // Adjust path if needed

@Injectable()
export class GetOffersByUserService {
  constructor(private prisma: PrismaService) {}

  async getOffersByUser(userId: string) {
    try {
      // Replaced DynamoDB Scan with Prisma findMany
      const offers = await this.prisma.jobVacancy.findMany({
        where: { companyId: userId }, // Change to company: { userId } if needed by your schema
        orderBy: { createdAt: 'desc' },
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
