import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GetUserApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserApplications(userId: string) {
    try {
      const applications = await this.prisma.application.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          appliedAt: 'desc',
        },
        include: {
          jobVacancy: {
            include: {
              company: true, // Includes the company name of the job applied to
            },
          },
        },
      });

      return {
        statusCode: 200,
        count: applications.length,
        applications: applications,
      };
    } catch (error) {
      console.error('Error al obtener las postulaciones del usuario:', error);
      throw new InternalServerErrorException(
        'Error interno al obtener las postulaciones.',
      );
    }
  }
}
