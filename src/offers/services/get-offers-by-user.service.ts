import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class GetOffersByUserService {
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

  async getOffersByUser(cognitoId: string) {
    try {
      const command = new ScanCommand({
        TableName: this.TABLE_NAME,
        FilterExpression: 'createdBy = :uid',
        ExpressionAttributeValues: {
          ':uid': `USER#${cognitoId}`,
        },
      });

      const result = await this.docClient.send(command);

      return {
        statusCode: 200,
        count: result.Count || 0,
        data: result.Items || [],
      };
    } catch (error) {
      console.error('Error al obtener ofertas por usuario:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido de DynamoDB';
      throw new InternalServerErrorException({
        message:
          'Error interno del servidor al obtener las ofertas del usuario.',
        error: errorMessage,
      });
    }
  }
}
