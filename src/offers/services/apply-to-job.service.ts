import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ApplyToJobDto } from '../dto/apply-to-job.dto';

@Injectable()
export class ApplyToJobService {
  constructor(private readonly prisma: PrismaService) {}

  async applyToJob(userId: string, applyToJobDto: ApplyToJobDto) {
    try {
      // 1. Verify the applicant exists and is a candidate
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException({
          message: 'No se encontró el usuario que intenta postularse.',
        });
      }

      if (user.role !== 'CANDIDATE') {
        throw new ForbiddenException({
          message: 'Solo los postulantes pueden aplicar a ofertas de empleo.',
        });
      }

      // 2. Verify the offer exists and is active
      const offer = await this.prisma.jobVacancy.findUnique({
        where: { id: applyToJobDto.offer_id },
      });

      if (!offer) {
        throw new NotFoundException({
          message: 'La oferta a la que intentas postularte no existe.',
        });
      }

      if (offer.status !== 'ACTIVE') {
        throw new BadRequestException({
          message:
            'Esta oferta ya no acepta postulaciones porque no se encuentra activa.',
        });
      }

      // 3. Require an uploaded resume before applying
      if (!user.resume) {
        throw new BadRequestException({
          message:
            'Debes cargar tu hoja de vida en tu perfil antes de postularte.',
        });
      }

      // 4. Create the application
      const application = await this.prisma.application.create({
        data: {
          userId: userId,
          jobId: applyToJobDto.offer_id,
          status: 'SENT',
        },
      });

      return {
        statusCode: 201,
        message: 'Postulación enviada exitosamente.',
        application,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Prisma P2002 -> duplicate application (unique userId + jobId)
      if (
        error instanceof Error &&
        'code' in error &&
        (error as any).code === 'P2002'
      ) {
        throw new ConflictException({
          message: 'Ya te has postulado a esta oferta anteriormente.',
        });
      }

      console.error('Error al aplicar a la oferta:', error);
      throw new InternalServerErrorException({
        message: 'Error interno al enviar la postulación.',
        error: error instanceof Error ? error.message : 'Prisma Error',
      });
    }
  }
}
