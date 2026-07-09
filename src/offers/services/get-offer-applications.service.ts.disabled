import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class GetOfferApplicationsService {
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

  async getOfferApplications(offerId: string) {
    try {
      const command = new ScanCommand({
        TableName: this.TABLE_NAME,
        FilterExpression: 'entity_type = :entityType AND offer_id = :offerId',
        ExpressionAttributeValues: {
          ':entityType': 'APPLICATION',
          ':offerId': offerId,
        },
      });

      const result = await this.docClient.send(command);

      return {
        statusCode: 200,
        count: result.Count || 0,
        candidates: result.Items || [],
      };
    } catch (error) {
      console.error('Error al obtener candidatos de la oferta:', error);
      throw new InternalServerErrorException(
        'Error interno al obtener los candidatos.',
      );
    }
  }
}
