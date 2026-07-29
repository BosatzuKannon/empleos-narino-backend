import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { SignUpDto } from '../dto/signup.dto';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../../prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class SignupService {
  private supabaseAdmin: ReturnType<typeof createClient>;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async signUp(signUpDto: SignUpDto) {
    const {
      email,
      password,
      nombres,
      apellidos,
      telefono,
      user_type,
      fecha_nacimiento,
      ciudad,
      nombre_empresa,
    } = signUpDto;

    try {
      // 1. Determine the final role for metadata
      const finalRole =
        user_type === 'COMPANY_ADMIN'
          ? UserRole.COMPANY_ADMIN
          : UserRole.CANDIDATE;

      // 2. Create and auto-confirm user in Supabase Auth Cloud
      const { data: authData, error: authError } =
        await this.supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            firstName: nombres,
            lastName: apellidos,
            role: finalRole,
          },
        });

      if (authError || !authData.user) {
        console.log('Supabase Rejection:', authError);
        throw new BadRequestException(
          authError?.message || 'Error creating auth user.',
        );
      }

      const supabaseUid = authData.user.id;

      // 3. Complete the rich user profile via Prisma
      // Note: The database trigger created the baseline row, so we update the extended fields here.
      await this.prisma.user.update({
        where: { id: supabaseUid },
        data: {
          lastName: apellidos,
          phone: telefono,
          city: ciudad,
          birthDate: fecha_nacimiento ? new Date(fecha_nacimiento) : null,
          role: finalRole,
        },
      });

      // 4. Conditional Entity Creation: If they are a company owner, create their Company record
      if (finalRole === UserRole.COMPANY_ADMIN && nombre_empresa) {
        await this.prisma.company.create({
          data: {
            name: nombre_empresa,
            ownerId: supabaseUid,
          },
        });
      }

      return {
        statusCode: 201,
        message:
          'Registro exitoso. El usuario puede iniciar sesión inmediatamente.',
        userId: supabaseUid,
      };
    } catch (error) {
      console.error('Error durante el registro del usuario:', error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido de Supabase/Prisma';
      throw new InternalServerErrorException({
        message: 'Error al registrar el usuario en la nueva infraestructura.',
        error: errorMessage,
      });
    }
  }
}
