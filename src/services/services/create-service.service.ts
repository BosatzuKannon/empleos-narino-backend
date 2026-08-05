import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { PushNotificationService } from '../../push-notifications/push-notifications.service';
import { CreateServiceDto } from '../dto/create-service.dto';

const ALLOWED_SERVICE_ROLES: UserRole[] = [UserRole.CANDIDATE];

@Injectable()
export class CreateServiceService {
  private readonly logger = new Logger(CreateServiceService.name);

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
      // Las excepciones HTTP ya resueltas (404/403) se re-lanzan tal cual.
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // ponytail: errores Prisma conocidos -> respuestas específicas (no 500 genérico)
        switch (error.code) {
          case 'P2002':
            this.logger.warn(
              `Violación de unicidad al crear servicio: ${error.code}`,
            );
            throw new ConflictException(
              'Ya existe un servicio con esos datos.',
            );
          case 'P2003':
            this.logger.warn(
              `Clave foránea inválida al crear servicio: ${String(error.meta?.field_name ?? '')}`,
            );
            throw new BadRequestException(
              'El usuario o la categoría seleccionada no son válidos.',
            );
          case 'P2004':
          case 'P2019':
            this.logger.warn(
              `Valor fuera de rango (Decimal) al crear servicio: ${error.code}`,
            );
            throw new BadRequestException(
              'El precio ingresado supera el valor máximo permitido.',
            );
        }
      }

      this.logger.error(
        `Error no manejado al crear servicio. userId=${userId} categoryId=${categoryId}`,
        error instanceof Error ? error.stack : error,
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido de Prisma';
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al crear el servicio.',
        error: errorMessage,
      });
    }
  }
}
