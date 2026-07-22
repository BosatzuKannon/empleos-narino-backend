import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { GetProfileService } from './services/get-profile.service';
import { UpdateProfileService } from './services/update-profile.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ProfileController],
  providers: [PrismaService, GetProfileService, UpdateProfileService],
})
export class ProfileModule {}
