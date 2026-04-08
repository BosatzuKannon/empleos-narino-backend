import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

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
  @IsNotEmpty({ message: 'Los requisitos son obligatorios' })
  requisitos: string;
}
