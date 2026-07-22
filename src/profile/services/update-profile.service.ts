import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service'; // Adjust the import path as needed
import { UpdateProfileDto } from '../dto/update-profile.dto';

interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  birthDate?: Date;
}

@Injectable()
export class UpdateProfileService {
  constructor(private prisma: PrismaService) {}

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const { nombres, apellidos, telefono, fecha_nacimiento, ciudad } =
      updateProfileDto;

    try {
      // 1. Verify the user actually exists first
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new NotFoundException({
          message:
            'No se encontró el perfil de usuario o no se realizaron cambios.',
        });
      }

      // 2. Map the Spanish DTO keys to your Prisma schema column names
      const dataToUpdate: ProfileUpdateData = {};
      if (nombres) dataToUpdate.firstName = nombres;
      if (apellidos) dataToUpdate.lastName = apellidos;
      if (telefono) dataToUpdate.phone = telefono;
      if (ciudad) dataToUpdate.city = ciudad;

      // Prisma expects a Date object for DateTime columns
      if (fecha_nacimiento) {
        dataToUpdate.birthDate = new Date(fecha_nacimiento);
      }

      // 3. Execute the clean Prisma update
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
      });

      return {
        statusCode: 200,
        message: 'Perfil de usuario actualizado exitosamente.',
        updatedAttributes: updatedUser,
      };
    } catch (error) {
      console.error('Error al actualizar el perfil de usuario:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido de Prisma';
      throw new InternalServerErrorException({
        message:
          'Error interno del servidor al actualizar el perfil de usuario.',
        error: errorMessage,
      });
    }
  }
}
