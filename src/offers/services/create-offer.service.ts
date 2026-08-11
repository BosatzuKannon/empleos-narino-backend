import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PushNotificationService } from '../../push-notifications/push-notifications.service';
import { CreateOfferDto } from '../dto/create-offer.dto';

@Injectable()
export class CreateOfferService {
  constructor(
    private prisma: PrismaService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async createOffer(userId: string, createOfferDto: CreateOfferDto) {
    const {
      titulo,
      descripcion,
      ubicacion,
      salario,
      tipo_contrato,
      requisitos,
      cupos,
    } = createOfferDto;

    try {
      // Look up the company owned by this user — companyId must reference Company.id, not User.id
      const company = await this.prisma.company.findFirst({
        where: { ownerId: userId },
      });

      if (!company) {
        throw new NotFoundException(
          'No se encontró una empresa asociada a este usuario. Debe crear una empresa antes de publicar ofertas.',
        );
      }

      const offer = await this.prisma.jobVacancy.create({
        data: {
          title: titulo,
          description: descripcion,
          location: ubicacion,
          salary: salario,
          contractType: tipo_contrato,
          requirements: requisitos ?? '',
          availablePositions: cupos,
          status: 'PENDING_PAYMENT',
          companyId: company.id,
        },
      });

      // Evento C: avisa a todos los candidatos con push habilitado
      await this.pushNotificationService.sendToCandidates({
        title: 'Nueva oferta en Empleos Nariño',
        body: `${offer.title} — ¡Postúlate ya!`,
        data: {
          type: 'new_offer',
          route: '/(tabs)',
          offerId: offer.id,
          offerTitle: offer.title,
          companyName: company.name,
        },
      });

      return {
        statusCode: 201,
        message: 'Oferta creada exitosamente.',
        offer: offer,
      };
    } catch (error) {
      console.error('Error al crear la oferta:', error);

      if (error instanceof NotFoundException) throw error;

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido de Prisma';
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al crear la oferta.',
        error: errorMessage,
      });
    }
  }
}
