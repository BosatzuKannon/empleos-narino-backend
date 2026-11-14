import { IsString, IsIn, IsNotEmpty, IsOptional } from 'class-validator';

const VALID_STATUSES = ['activo', 'inactivo'];

export class UpdateOfferStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(VALID_STATUSES, {
    message: `El estado debe ser uno de: ${VALID_STATUSES.join(', ')}`,
  })
  status: string;

  @IsString()
  @IsOptional()
  creatorEmail?: string;
}
