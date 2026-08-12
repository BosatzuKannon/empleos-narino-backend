import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SetRoleDto } from './dto/set-role.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async setRole(userId: string, setRoleDto: SetRoleDto) {
    const { role } = setRoleDto;

    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new NotFoundException('No se encontró el usuario.');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      let companyName = '';
      if (role === 'COMPANY_ADMIN') {
        const company = await this.prisma.company.findFirst({
          where: { ownerId: userId },
          select: { name: true },
        });
        companyName = company?.name || '';
      }

      return {
        statusCode: 200,
        message: 'Perfil actualizado exitosamente.',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          emailVerified: updatedUser.isVerified,
          nombre: updatedUser.firstName,
          apellido: updatedUser.lastName || '',
          role: updatedUser.role,
          telefono: updatedUser.phone || '',
          ciudad: updatedUser.city || '',
          avatarUrl: updatedUser.avatarUrl || '',
          companyName,
        },
      };
    } catch (error) {
      console.error('Error al actualizar el rol del usuario:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al actualizar el rol.',
        error: errorMessage,
      });
    }
  }
}
