import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum PlanType {
  STANDARD = 'STANDARD',
  FEATURED = 'FEATURED',
}

export enum EntityType {
  SERVICE = 'SERVICE',
  OFFER = 'OFFER',
}

export class GenerateCheckoutDto {
  @IsEnum(EntityType, { message: 'Tipo inválido. Use SERVICE u OFFER.' })
  entityType: EntityType;

  @IsString()
  @IsNotEmpty({ message: 'El ID de la publicación es obligatorio.' })
  @IsUUID()
  entityId: string;

  @IsEnum(PlanType, { message: 'Plan inválido. Use STANDARD o FEATURED.' })
  planType: PlanType;

  // Deep link de la app (EmpleosNarino://...) al que Wompi redirige
  // tras terminar el flujo de pago en el checkout.
  @IsOptional()
  @IsString()
  redirectUrl?: string;
}
