import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
// import { GetProfileService } from './services/get-profile.service';
// import { UpdateProfileService } from './services/update-profile.service';

@Module({
  controllers: [ProfileController],
  providers: [
    // GetProfileService, 
    // UpdateProfileService
  ],
})
export class ProfileModule {}
