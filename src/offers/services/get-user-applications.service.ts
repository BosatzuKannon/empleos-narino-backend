import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class GetUserApplicationsService {
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

  async getUserApplications(cognitoId: string) {
    try {
      const command = new QueryCommand({
        TableName: this.TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': `USER#${cognitoId}`,
          ':skPrefix': 'APPLICATION#',
        },
      });

      const result = await this.docClient.send(command);

      return {
        statusCode: 200,
        count: result.Count || 0,
        applications: result.Items || [],
      };
    } catch (error) {
      console.error('Error al obtener las postulaciones del usuario:', error);
      throw new InternalServerErrorException(
        'Error interno al obtener las postulaciones.',
      );
    }
  }
}
