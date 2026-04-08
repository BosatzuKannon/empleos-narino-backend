import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ApplyToJobDto } from '../dto/apply-to-job.dto';

@Injectable()
export class ApplyToJobService {
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

  async applyToJob(cognitoId: string, applyToJobDto: ApplyToJobDto) {
    try {
      const item = {
        pk: `USER#${cognitoId}`,
        sk: `APPLICATION#${applyToJobDto.offer_id}`,
        entity_type: 'APPLICATION',
        status: 'enviada',
        applied_at: new Date().toISOString(),
        ...applyToJobDto,
      };

      const command = new PutCommand({
        TableName: this.TABLE_NAME,
        Item: item,
      });

      await this.docClient.send(command);

      return {
        statusCode: 201,
        message: 'Postulación enviada exitosamente.',
        application: item,
      };
    } catch (error) {
      console.error('Error al aplicar a la oferta:', error);
      throw new InternalServerErrorException({
        message: 'Error interno al enviar la postulación.',
        error: error instanceof Error ? error.message : 'DynamoDB Error',
      });
    }
  }
}
