import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CreateOfferDto } from '../dto/create-offer.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CreateOfferService {
  private docClient: DynamoDBDocumentClient;
  private readonly TABLE_NAME: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    this.TABLE_NAME = this.configService.getOrThrow<string>(
      'DYNAMODB_TABLE_NAME',
    );

    const ddbClient = new DynamoDBClient({ region });
    this.docClient = DynamoDBDocumentClient.from(ddbClient);
  }

  async createOffer(cognitoId: string, createOfferDto: CreateOfferDto) {
    const offerId = uuidv4();
    const createdAt = new Date().toISOString();

    const item = {
      pk: `USER#${cognitoId}`,
      sk: `OFFER#${offerId}`,
      entity_type: 'OFFER',
      offer_id: offerId,
      status: 'activa', // Por defecto, al crear es activa
      created_at: createdAt,
      ...createOfferDto,
    };

    try {
      const command = new PutCommand({
        TableName: this.TABLE_NAME,
        Item: item,
      });

      await this.docClient.send(command);

      return {
        statusCode: 201,
        message: 'Oferta creada exitosamente.',
        offer: item,
      };
    } catch (error) {
      console.error('Error al crear la oferta:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido de DynamoDB';
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al crear la oferta.',
        error: errorMessage,
      });
    }
  }
}
