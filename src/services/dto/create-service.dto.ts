import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ServicePriceType } from '@prisma/client';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  categoryId: string;

  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  description: string;

  @IsString()
  @IsNotEmpty({ message: 'El municipio es obligatorio' })
  municipality: string;

  @IsNumber()
  @Min(0, { message: 'El precio debe ser un número positivo' })
  @Max(99999999.99, {
    message: 'El precio supera el valor máximo permitido',
  })
  @IsOptional()
  price?: number;

  @IsEnum(ServicePriceType, { message: 'Tipo de precio inválido' })
  @IsOptional()
  priceType?: ServicePriceType;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
