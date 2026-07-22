import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service'; // Adjust the import path as needed

@Injectable()
export class GetProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    try {
      // Replaced DynamoDB GetCommand with Prisma's findUnique
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException({
          message: 'No se encontró el perfil de usuario.',
        });
      }

      return {
        statusCode: 200,
        profile: user,
      };
    } catch (error) {
      console.error('Error al obtener el perfil de usuario:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido de Prisma';
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al obtener el perfil de usuario.',
        error: errorMessage,
      });
    }
  }
}
