import { IsString, IsNotEmpty, IsIn, ValidateIf } from 'class-validator';

const VALID_PERMISSIONS = ['granted', 'denied', 'undetermined'];
const VALID_PLATFORMS = ['ios', 'android', 'web'];

export class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'El campo user_id es obligatorio.' })
  user_id: string;

  @IsString()
  @IsIn(VALID_PLATFORMS, {
    message: `Plataforma inválida. Válidas: ${VALID_PLATFORMS.join(', ')}`,
  })
  @IsNotEmpty({ message: 'El campo platform es obligatorio.' })
  platform: string;

  @IsString()
  @IsIn(VALID_PERMISSIONS, {
    message: `Estado de permiso inválido. Válidos: ${VALID_PERMISSIONS.join(', ')}`,
  })
  @IsNotEmpty({ message: 'El campo permission_status es obligatorio.' })
  permission_status: string;

  @ValidateIf((o: RegisterPushTokenDto) => o.permission_status === 'granted')
  @IsString()
  @IsNotEmpty({
    message:
      'El campo token es obligatorio cuando permission_status es "granted".',
  })
  token?: string;
}
