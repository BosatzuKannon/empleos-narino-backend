import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsBoolean({ message: 'El campo emailTransactional debe ser un booleano.' })
  emailTransactional?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'El campo emailMarketing debe ser un booleano.' })
  emailMarketing?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'El campo pushNotifications debe ser un booleano.' })
  pushNotifications?: boolean;
}
