import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SignupService } from './services/signup.service';
//import { SigninService } from './services/signin.service.ts.disabled';
//import { PasswordRecoveryService } from './services/password-recovery.service.ts.disabled';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [AuthController],
  providers: [
    PrismaService,
    SignupService, 
    //SigninService, 
    //PasswordRecoveryService
    ],
})
export class AuthModule {}
