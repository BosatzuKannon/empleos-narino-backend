import { IsString, IsIn, IsNotEmpty, IsEmail } from 'class-validator';

const VALID_APP_STATUSES = [
  'enviada',
  'en_revision',
  'entrevista',
  'rechazada',
  'seleccionado',
];

export class UpdateApplicationStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(VALID_APP_STATUSES, {
    message: `El estado debe ser uno de: ${VALID_APP_STATUSES.join(', ')}`,
  })
  status: string;

  @IsEmail(
    {},
    {
      message: 'Debe proporcionar un correo electrónico válido del candidato.',
    },
  )
  @IsNotEmpty()
  candidateEmail: string;

  @IsString()
  @IsNotEmpty()
  offerTitle: string;
}
