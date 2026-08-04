import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { CreateServiceCategoryDto } from '../dto/create-service-category.dto';

@Injectable()
export class CreateServiceCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createServiceCategory(dto: CreateServiceCategoryDto) {
    try {
      const category = await this.prisma.serviceCategory.create({
        data: {
          name: dto.name.trim(),
        },
      });

      return {
        statusCode: 201,
        message: 'Categoría creada exitosamente.',
        category: category,
      };
    } catch (error) {
      console.error('Error al crear la categoría de servicios:', error);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe una categoría con ese nombre.');
      }

      throw new InternalServerErrorException({
        message:
          'Error interno del servidor al crear la categoría de servicios.',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
}
