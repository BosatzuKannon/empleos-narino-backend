import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';

// ponytail: dueño único del mini-CMS; si algún día hay más admins, mover a UserRole.
export const ADS_ADMIN_EMAIL = 'zeus6281@gmail.com';

@Injectable()
export class AdsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureAdmin(email?: string) {
    if (email !== ADS_ADMIN_EMAIL) {
      throw new ForbiddenException(
        'No tienes permisos para administrar anuncios.',
      );
    }
  }

  async findActive() {
    const advertisements = await this.prisma.advertisement.findMany({
      where: { isActive: true, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    return { statusCode: 200, advertisements };
  }

  async findAll(email?: string) {
    this.ensureAdmin(email);

    const advertisements = await this.prisma.advertisement.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return { statusCode: 200, advertisements };
  }

  async create(email: string | undefined, dto: CreateAdvertisementDto) {
    this.ensureAdmin(email);

    const advertisement = await this.prisma.advertisement.create({
      data: {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        redirectUrl: dto.redirectUrl ?? null,
        whatsapp: dto.whatsapp ?? null,
        expiresAt: new Date(dto.expiresAt),
        isActive: dto.isActive ?? true,
      },
    });

    return {
      statusCode: 201,
      message: 'Anuncio creado exitosamente.',
      advertisement,
    };
  }

  async update(
    email: string | undefined,
    id: string,
    dto: UpdateAdvertisementDto,
  ) {
    this.ensureAdmin(email);

    try {
      const advertisement = await this.prisma.advertisement.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          imageUrl: dto.imageUrl,
          redirectUrl: dto.redirectUrl,
          whatsapp: dto.whatsapp,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          isActive: dto.isActive,
        },
      });

      return {
        statusCode: 200,
        message: 'Anuncio actualizado exitosamente.',
        advertisement,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('El anuncio indicado no existe.');
      }
      throw new InternalServerErrorException(
        'Error interno al actualizar el anuncio.',
      );
    }
  }

  async remove(email: string | undefined, id: string) {
    this.ensureAdmin(email);

    try {
      await this.prisma.advertisement.delete({ where: { id } });
      return { statusCode: 200, message: 'Anuncio eliminado exitosamente.' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('El anuncio indicado no existe.');
      }
      throw new InternalServerErrorException(
        'Error interno al eliminar el anuncio.',
      );
    }
  }
}
