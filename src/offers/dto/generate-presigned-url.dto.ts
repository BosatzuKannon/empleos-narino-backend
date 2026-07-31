import { IsNumber, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class GeneratePresignedUrlDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del archivo (fileName) es obligatorio.' })
  fileName: string;

  @IsString()
  @IsNotEmpty({ message: 'El tipo de archivo (fileType) es obligatorio.' })
  fileType: string;

  @IsString()
  @IsOptional()
  fileCategory?: string;

  @IsNumber()
  @IsOptional()
  fileSize?: number;
}
