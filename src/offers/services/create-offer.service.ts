import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateOfferDto } from '../dto/create-offer.dto';

@Injectable()
export class CreateOfferService {
  constructor(private prisma: PrismaService) {}

  async createOffer(userId: string, createOfferDto: CreateOfferDto) {
    // 1. Extract the Spanish fields from the DTO
    const {
      titulo,
      descripcion,
      ubicacion,
      salario,
      tipo_contrato,
      requisitos,
      // 'empresa' is likely handled by the companyId relation now, 
      // but you can add it to the mapping below if your schema requires it!
    } = createOfferDto;

    try {
      // 2. Map them strictly to the English Prisma schema properties
      const offer = await this.prisma.jobVacancy.create({
        data: {
          title: titulo,
          description: descripcion,
          location: ubicacion,
          salary: salario, 
          contractType: tipo_contrato,
          requirements: requisitos,
          status: 'ACTIVE', 
          companyId: userId, // I see you adjusted this in your screenshot to link correctly!
        },
      });

      return {
        statusCode: 201,
        message: 'Oferta creada exitosamente.',
        offer: offer,
      };
    } catch (error) {
      console.error('Error al crear la oferta:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido de Prisma';
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al crear la oferta.',
        error: errorMessage,
      });
    }
  }
}