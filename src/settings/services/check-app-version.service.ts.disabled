import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class CheckAppVersionService {
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

  async checkAppVersion() {
    try {
      const command = new GetCommand({
        TableName: this.TABLE_NAME,
        Key: {
          pk: 'CONFIG#APP',
          sk: 'VERSION',
        },
      });

      const result = await this.docClient.send(command);

      if (!result.Item) {
        return {
          statusCode: 200,
          min_version_code: 5,
          message_es:
            'Error al cargar la configuración de versión. Intenta actualizar tu app.',
        };
      }

      // Casteamos el resultado de DynamoDB a una estructura tipada
      const item = result.Item as {
        min_version_code?: number;
        message_es?: string;
        app_status?: string;
        app_status_message?: string;
        app_status_type?: string;
      };

      return {
        statusCode: 200,
        min_version_code: item.min_version_code || 1,
        message_es:
          item.message_es ||
          'Hay una actualización obligatoria para continuar.',
        app_status: item.app_status,
        app_status_message: item.app_status_message,
        app_status_type: item.app_status_type,
      };
    } catch (error) {
      console.error('Error fetching app version configuration:', error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido de DynamoDB';
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al verificar la versión.',
        error: errorMessage,
      });
    }
  }
}
