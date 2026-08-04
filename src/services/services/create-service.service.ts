import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PushNotificationService } from '../../push-notifications/push-notifications.service';
import { CreateServiceDto } from '../dto/create-service.dto';

@Injectable()
export class CreateServiceService {
  constructor(
    private prisma: PrismaService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async createService(userId: string, createServiceDto: CreateServiceDto) {
    const {
      categoryId,
      title,
      description,
      municipality,
      price,
      priceType,
      imageUrl,
    } = createServiceDto;

    try {
      const category = await this.prisma.serviceCategory.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        throw new NotFoundException(
          'No se encontró la categoría seleccionada.',
        );
      }

      const service = await this.prisma.service.create({
        data: {
          userId,
          categoryId,
          title,
          description,
          municipality,
          price,
          priceType,
          imageUrl,
          status: 'ACTIVE',
        },
        include: {
          category: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              city: true,
            },
          },
        },
      });

      await this.pushNotificationService.sendToCompanies({
        title: 'Nuevo servicio en Empleos Nariño',
        body: `${service.title} — ¡Contrata talento local!`,
        data: {
          type: 'new_service',
          route: '/(tabs)',
          serviceId: service.id,
          serviceTitle: service.title,
          categoryName: category.name,
        },
      });

      return {
        statusCode: 201,
        message: 'Servicio creado exitosamente.',
        service: service,
      };
    } catch (error) {
      console.error('Error al crear el servicio:', error);

      if (error instanceof NotFoundException) throw error;

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido de Prisma';
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al crear el servicio.',
        error: errorMessage,
      });
    }
  }
}
