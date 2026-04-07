import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'El campo nombres es obligatorio.' })
  nombres: string;

  @IsString()
  @IsNotEmpty({ message: 'El campo apellidos es obligatorio.' })
  apellidos: string;

  @IsString()
  @IsNotEmpty({ message: 'El campo telefono es obligatorio.' })
  telefono: string;

  @IsString()
  @IsOptional()
  fecha_nacimiento?: string;

  @IsString()
  @IsOptional()
  ciudad?: string;

  @IsString()
  @IsOptional()
  nombre_empresa?: string;

  @IsUrl({}, { message: 'La URL de la hoja de vida no es válida.' })
  @IsOptional()
  resume_url?: string;
}
