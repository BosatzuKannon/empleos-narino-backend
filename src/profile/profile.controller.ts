import { Controller, Get, Put, Param, Body } from '@nestjs/common';
// import { GetProfileService } from './services/get-profile.service';
// import { UpdateProfileService } from './services/update-profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profile')
export class ProfileController {
  constructor(
    // private readonly getProfileService: GetProfileService,
    // private readonly updateProfileService: UpdateProfileService,
  ) {}

  @Get(':cognito_id')
  async getProfile(@Param('cognito_id') cognitoId: string) {
    // return this.getProfileService.getProfile(cognitoId);
  }

  @Put(':cognito_id')
  async updateProfile(
    @Param('cognito_id') cognitoId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    // return this.updateProfileService.updateProfile(cognitoId, updateProfileDto);
  }
}
