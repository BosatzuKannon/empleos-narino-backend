import { IsEnum, IsNotEmpty } from 'class-validator';
import { ServiceStatus } from '@prisma/client';

export class UpdateServiceStatusDto {
  @IsEnum(ServiceStatus, { message: 'Estado inválido' })
  @IsNotEmpty({ message: 'El estado es obligatorio' })
  status: ServiceStatus;
}
