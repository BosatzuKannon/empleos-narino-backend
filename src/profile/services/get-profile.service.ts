import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class GetProfileService {
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

  async getProfile(cognitoId: string) {
    try {
      const command = new GetCommand({
        TableName: this.TABLE_NAME,
        Key: {
          pk: `USER#${cognitoId}`,
          sk: 'METADATA',
        },
      });

      const result = await this.docClient.send(command);

      if (!result.Item) {
        throw new NotFoundException({
          message: 'No se encontró el perfil de usuario.',
        });
      }

      return {
        statusCode: 200,
        profile: result.Item,
      };
    } catch (error) {
      console.error('Error al obtener el perfil de usuario:', error);

      // Si el error ya es una excepción de Nest (como NotFoundException), la relanzamos
      if (error instanceof NotFoundException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido de DynamoDB';
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al obtener el perfil de usuario.',
        error: errorMessage,
      });
    }
  }
}
