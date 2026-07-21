import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ApplyToJobDto } from '../dto/apply-to-job.dto';

@Injectable()
export class ApplyToJobService {
  constructor(private readonly prisma: PrismaService) {}

  async applyToJob(userId: string, applyToJobDto: ApplyToJobDto) {
    try {
      const application = await this.prisma.application.create({
        data: {
          userId: userId,
          jobId: applyToJobDto.offer_id, 
          status: 'SENT',
          // Map any other properties from applyToJobDto here if they exist in your Prisma schema
        },
      });

      return {
        statusCode: 201,
        message: 'Postulación enviada exitosamente.',
        application,
      };
    } catch (error) {
      console.error('Error al aplicar a la oferta:', error);
      throw new InternalServerErrorException({
        message: 'Error interno al enviar la postulación.',
        error: error instanceof Error ? error.message : 'Prisma Error',
      });
    }
  }
}