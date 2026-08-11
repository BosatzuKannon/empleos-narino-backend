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

export class GenerateCheckoutDto {
  @IsString()
  @IsNotEmpty({ message: 'El ID del servicio es obligatorio.' })
  @IsUUID()
  serviceId: string;

  @IsEnum(PlanType, { message: 'Plan inválido. Use STANDARD o FEATURED.' })
  planType: PlanType;

  // Deep link de la app (EmpleosNarino://...) al que Wompi redirige
  // tras terminar el flujo de pago en el checkout.
  @IsOptional()
  @IsString()
  redirectUrl?: string;
}
