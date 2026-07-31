import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SignupService } from './services/signup.service';
import { SigninService } from './services/signin.service';
import { PasswordRecoveryService } from './services/password-recovery.service';
import { VerifyOtpService } from './services/verify-otp.service';
import { ResendOtpService } from './services/resend-otp.service';
import { PrismaService } from '../prisma.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [AuthController],
  providers: [
    PrismaService,
    SignupService,
    SigninService,
    PasswordRecoveryService,
    VerifyOtpService,
    ResendOtpService,
  ],
})
export class AuthModule {}
