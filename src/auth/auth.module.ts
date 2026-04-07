import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SignupService } from './services/signup.service';
import { SigninService } from './services/signin.service';

@Module({
  controllers: [AuthController],
  providers: [SignupService, SigninService],
})
export class AuthModule {}
