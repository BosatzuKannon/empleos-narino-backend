import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { GetProfileService } from './services/get-profile.service';
import { UpdateProfileService } from './services/update-profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profile')
export class ProfileController {
  constructor(
    private readonly getProfileService: GetProfileService,
    private readonly updateProfileService: UpdateProfileService,
  ) {}

  // 1. GET Request: Keeps the ID in the URL for the frontend
  // (Renamed 'cognito_id' to just 'id' to reflect our new Postgres architecture)
  @Get(':id')
  async getProfile(@Param('id') id: string) {
    return this.getProfileService.getProfile(id);
  }

  // 2. PUT Request: No ID in the URL. We extract it securely from the JWT token!
  @Put()
  async updateProfile(
    @Headers('authorization') authHeader: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'No se proporcionó un token de autorización válido.',
      );
    }

    try {
      // Extract the JWT token string
      const token = authHeader.split(' ')[1];

      // Decode the middle part of the JWT (the payload) to get the user data
      const payloadBase64 = token.split('.')[1];
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString(
        'utf-8',
      );
      const payload = JSON.parse(payloadJson);

      // In Supabase JWTs, the user's UUID is stored in the "sub" (subject) field
      const userId = payload.sub;

      if (!userId) {
        throw new UnauthorizedException(
          'El token no contiene un ID de usuario válido.',
        );
      }

      // Pass the extracted ID to your service!
      return this.updateProfileService.updateProfile(userId, updateProfileDto);
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado.');
    }
  }
}
