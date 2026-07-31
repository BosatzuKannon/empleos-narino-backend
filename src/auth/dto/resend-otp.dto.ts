import { IsEmail } from 'class-validator';

export class ResendOtpDto {
  @IsEmail({}, { message: 'El formato del correo no es válido' })
  email: string;
}
