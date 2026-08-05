import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { PushNotificationService } from '../../push-notifications/push-notifications.service';
import { CreateServiceDto } from '../dto/create-service.dto';

const ALLOWED_SERVICE_ROLES: UserRole[] = [UserRole.CANDIDATE];

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
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user) {
        throw new NotFoundException('No se encontró el usuario autenticado.');
      }

      if (!ALLOWED_SERVICE_ROLES.includes(user.role)) {
        throw new ForbiddenException(
          'Solo los candidatos pueden publicar servicios.',
        );
      }

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

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido de Prisma';
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al crear el servicio.',
        error: errorMessage,
      });
    }
  }
}
