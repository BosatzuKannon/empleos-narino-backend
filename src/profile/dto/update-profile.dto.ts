import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';

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

  @ValidateIf((o) => o.resume_url != null && o.resume_url !== '')
  @IsUrl({}, { message: 'La URL de la hoja de vida no es válida.' })
  @IsOptional()
  resume_url?: string;
}
