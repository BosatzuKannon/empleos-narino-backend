import {
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GetOfferApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOfferApplications(userId: string, offerId: string) {
    try {
      // 1. Verify the offer exists and belongs to the caller's company
      const offer = await this.prisma.jobVacancy.findUnique({
        where: { id: offerId },
      });

      if (!offer) {
        throw new NotFoundException({
          message: 'La oferta indicada no existe.',
        });
      }

      const company = await this.prisma.company.findFirst({
        where: { ownerId: userId },
      });

      if (!company || offer.companyId !== company.id) {
        throw new ForbiddenException({
          message:
            'No tienes permisos para ver los postulados de esta oferta.',
        });
      }

      const applications = await this.prisma.application.findMany({
        where: {
          jobId: offerId,
        },
        include: {
          user: true, // Includes the candidate's profile data
        },
        orderBy: {
          appliedAt: 'desc',
        },
      });

      return {
        statusCode: 200,
        count: applications.length,
        candidates: applications,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error al obtener candidatos de la oferta:', error);
      throw new InternalServerErrorException(
        'Error interno al obtener los candidatos.',
      );
    }
  }
}
