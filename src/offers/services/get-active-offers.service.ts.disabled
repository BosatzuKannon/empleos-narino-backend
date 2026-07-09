import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class GetActiveOffersService {
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

  async getActiveOffers() {
    try {
      const command = new QueryCommand({
        TableName: this.TABLE_NAME,
        IndexName: 'status-created_at-index',
        KeyConditionExpression: '#status = :statusVal',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':statusVal': 'activa',
        },
        ScanIndexForward: false, // Ordenar de más reciente a más antiguo
      });

      const result = await this.docClient.send(command);

      return {
        statusCode: 200,
        offers: result.Items || [],
      };
    } catch (error) {
      console.error('Error al obtener ofertas activas:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido de DynamoDB';
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al obtener las ofertas.',
        error: errorMessage,
      });
    }
  }
}
