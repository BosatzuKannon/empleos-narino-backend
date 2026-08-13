import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

export class CreateOfferDto {
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  titulo: string;

  @IsString()
  @IsNotEmpty({ message: 'La empresa es obligatoria' })
  empresa: string;

  @IsString()
  @IsNotEmpty({ message: 'La ubicación es obligatoria' })
  ubicacion: string;

  @IsNumber()
  @Min(0, { message: 'El salario debe ser un número positivo' })
  salario: number;

  @IsString()
  @IsNotEmpty({ message: 'El tipo de contrato es obligatorio' })
  tipo_contrato: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  descripcion: string;

  @IsString()
  @IsOptional()
  modality?: string;

  @IsString()
  @IsOptional()
  requisitos?: string;

  @IsNumber()
  @Min(1, { message: 'Debe haber al menos 1 cupo disponible' })
  cupos: number;
}
