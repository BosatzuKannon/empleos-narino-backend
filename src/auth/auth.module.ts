import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SignupService } from './services/signup.service';
import { SigninService } from './services/signin.service';
import { PasswordRecoveryService } from './services/password-recovery.service';

@Module({
  controllers: [AuthController],
  providers: [SignupService, SigninService, PasswordRecoveryService],
})
export class AuthModule {}
