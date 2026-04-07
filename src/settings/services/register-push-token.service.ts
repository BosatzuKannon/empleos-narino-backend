import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { RegisterPushTokenDto } from '../dto/register-push-token.dto';

@Injectable()
export class RegisterPushTokenService {
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

  async registerPushToken(registerPushTokenDto: RegisterPushTokenDto) {
    const { user_id, token, platform, permission_status } =
      registerPushTokenDto;

    try {
      const item = {
        pk: `USER#${user_id}`,
        sk: `PUSH_TOKEN#${platform}`,
        entity_type: 'PUSH_TOKEN',
        token: token || null,
        platform: platform,
        permission_status: permission_status,
        updated_at: new Date().toISOString(),
      };

      const command = new PutCommand({
        TableName: this.TABLE_NAME,
        Item: item,
      });

      await this.docClient.send(command);

      return {
        statusCode: 201,
        message: 'Push Token registrado/actualizado exitosamente.',
        status: permission_status,
        token_sk: item.sk,
      };
    } catch (error) {
      console.error('Error al registrar el Push Token:', error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido de DynamoDB';
      throw new InternalServerErrorException({
        message: 'Error interno del servidor al registrar el Push Token.',
        error: errorMessage,
      });
    }
  }
}
