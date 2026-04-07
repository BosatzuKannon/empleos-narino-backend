import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ConfirmNewPasswordDto {
  @IsEmail({}, { message: 'El formato del correo no es válido' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6, {
    message: 'La nueva contraseña debe tener al menos 6 caracteres',
  })
  newPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'El código de confirmación es obligatorio' })
  confirmationCode: string;
}
