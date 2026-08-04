import { IsString, IsNotEmpty } from 'class-validator';

export class CreateServiceCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  name: string;
}
