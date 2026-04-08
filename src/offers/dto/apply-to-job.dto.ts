import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class ApplyToJobDto {
  @IsString()
  @IsNotEmpty({ message: 'El ID de la oferta es obligatorio.' })
  offer_id: string;

  @IsString()
  @IsNotEmpty({ message: 'El título de la oferta es obligatorio.' })
  offer_title: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre de la empresa es obligatorio.' })
  empresa: string;

  @IsUrl({}, { message: 'Debe ser una URL válida para la hoja de vida.' })
  @IsNotEmpty({ message: 'El enlace de la hoja de vida es obligatorio.' })
  resume_url: string;
}
