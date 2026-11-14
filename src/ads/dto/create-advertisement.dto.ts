import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAdvertisementDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del anuncio es obligatorio.' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción del anuncio es obligatoria.' })
  description: string;

  @IsString()
  @IsNotEmpty({ message: 'La imagen del anuncio es obligatoria.' })
  imageUrl: string;

  @IsString()
  @IsOptional()
  redirectUrl?: string;

  @IsString()
  @IsOptional()
  whatsapp?: string;

  @IsDateString({}, { message: 'La fecha de expiración no es válida.' })
  expiresAt: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
