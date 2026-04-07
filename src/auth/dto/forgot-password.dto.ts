import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'El formato del correo no es válido' })
  @IsNotEmpty()
  email: string;
}
