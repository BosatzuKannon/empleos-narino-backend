import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class UpdateProfileService {
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

  async updateProfile(cognitoId: string, updateProfileDto: UpdateProfileDto) {
    const {
      nombres,
      apellidos,
      telefono,
      fecha_nacimiento,
      ciudad,
      nombre_empresa,
      resume_url,
    } = updateProfileDto;

    let updateExpression = 'set nombres = :n, apellidos = :a, telefono = :t';
    const expressionAttributeValues: Record<string, any> = {
      ':n': nombres,
      ':a': apellidos,
      ':t': telefono,
    };

    if (fecha_nacimiento) {
      updateExpression += ', fecha_nacimiento = :fn';
      expressionAttributeValues[':fn'] = fecha_nacimiento;
    }

    if (ciudad) {
      updateExpression += ', ciudad = :c';
      expressionAttributeValues[':c'] = ciudad;
    }

    if (nombre_empresa) {
      updateExpression += ', nombre_empresa = :ne';
      expressionAttributeValues[':ne'] = nombre_empresa;
    }

    if (resume_url) {
      updateExpression += ', resume_url = :ru';
      expressionAttributeValues[':ru'] = resume_url;
    }

    try {
      const command = new UpdateCommand({
        TableName: this.TABLE_NAME,
        Key: {
          pk: `USER#${cognitoId}`,
          sk: 'METADATA',
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });

      const result = await this.docClient.send(command);

      if (!result.Attributes) {
        throw new NotFoundException({
          message:
            'No se encontró el perfil de usuario o no se realizaron cambios.',
        });
      }

      return {
        statusCode: 200,
        message: 'Perfil de usuario actualizado exitosamente.',
        updatedAttributes: result.Attributes,
      };
    } catch (error) {
      console.error('Error al actualizar el perfil de usuario:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido de DynamoDB';
      throw new InternalServerErrorException({
        message:
          'Error interno del servidor al actualizar el perfil de usuario.',
        error: errorMessage,
      });
    }
  }
}
