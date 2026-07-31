import { IsEmail, IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail({}, { message: 'El formato del correo no es válido' })
  email: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'El código debe ser un número de 6 dígitos',
  })
  code: string;
}
