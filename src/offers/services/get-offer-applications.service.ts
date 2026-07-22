import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GetOfferApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOfferApplications(offerId: string) {
    try {
      const applications = await this.prisma.application.findMany({
        where: {
          jobId: offerId,
        },
        include: {
          user: true, // Includes the candidate's profile data
        },
      });

      return {
        statusCode: 200,
        count: applications.length,
        candidates: applications,
      };
    } catch (error) {
      console.error('Error al obtener candidatos de la oferta:', error);
      throw new InternalServerErrorException(
        'Error interno al obtener los candidatos.',
      );
    }
  }
}
