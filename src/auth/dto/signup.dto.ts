import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class SignUpDto {
  @IsEmail({}, { message: 'El formato del correo no es válido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsString()
  @IsNotEmpty()
  nombres: string;

  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;

  @IsString()
  @IsNotEmpty()
  user_type: string;

  @IsString()
  @IsNotEmpty()
  fecha_nacimiento: string;

  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @IsString()
  @IsOptional()
  nombre_empresa?: string;
}
