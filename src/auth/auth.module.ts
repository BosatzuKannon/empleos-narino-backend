import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SignupService } from './services/signup.service';

@Module({
  controllers: [AuthController],
  providers: [SignupService]
})
export class AuthModule {}
