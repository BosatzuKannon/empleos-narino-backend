import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SignUpDto } from '../dto/signup.dto';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SignupService {
  private cognitoClient: CognitoIdentityProviderClient;
  private docClient: DynamoDBDocumentClient;
  private readonly TABLE_NAME: string;
  private readonly CLIENT_ID: string;
  private readonly USER_POOL_ID: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    
    this.TABLE_NAME = this.configService.getOrThrow<string>('DYNAMODB_TABLE_NAME');
    this.CLIENT_ID = this.configService.getOrThrow<string>('COGNITO_CLIENT_ID');
    this.USER_POOL_ID = this.configService.getOrThrow<string>('COGNITO_USER_POOL_ID');

    this.cognitoClient = new CognitoIdentityProviderClient({ region });
    this.docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  }

  async signUp(signUpDto: SignUpDto) {
    const { email, password, nombres, apellidos, telefono, user_type, fecha_nacimiento, ciudad, nombre_empresa } = signUpDto;

    try {
      const cognitoParams = {
        ClientId: this.CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'given_name', Value: nombres },
          { Name: 'family_name', Value: apellidos },
          { Name: 'phone_number', Value: telefono },
          { Name: 'custom:user_type', Value: user_type },
        ],
      };

      const signUpResponse = await this.cognitoClient.send(new SignUpCommand(cognitoParams));
      const cognito_id = signUpResponse.UserSub;

      await this.cognitoClient.send(new AdminConfirmSignUpCommand({
        UserPoolId: this.USER_POOL_ID,
        Username: email,
      }));

      await this.cognitoClient.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: this.USER_POOL_ID,
        Username: email,
        UserAttributes: [{ Name: 'email_verified', Value: 'true' }],
      }));

      const userItem = {
        pk: `USER#${cognito_id || email}`,
        sk: 'METADATA',
        cognito_id: cognito_id || email,
        email,
        nombres,
        apellidos,
        telefono,
        user_type,
        fecha_nacimiento,
        ciudad,
        nombre_empresa,
        created_at: new Date().toISOString(),
      };

      await this.docClient.send(new PutCommand({
        TableName: this.TABLE_NAME,
        Item: userItem,
      }));

      return {
        statusCode: 200,
        message: 'Registro exitoso. El usuario puede iniciar sesión.',
      };

    } catch (error) {
      console.error('Error durante el registro del usuario:', error);
      throw new InternalServerErrorException({
        message: 'Error al registrar el usuario.',
        error: error.message,
      });
    }
  }
}