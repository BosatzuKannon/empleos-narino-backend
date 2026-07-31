import { Controller, Post, Body } from '@nestjs/common';
import { SignupService } from './services/signup.service';
import { SigninService } from './services/signin.service';
import { PasswordRecoveryService } from './services/password-recovery.service';
import { VerifyOtpService } from './services/verify-otp.service';
import { ResendOtpService } from './services/resend-otp.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ConfirmNewPasswordDto } from './dto/confirm-new-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: SignupService,
    private readonly signinService: SigninService,
    private readonly passwordRecoveryService: PasswordRecoveryService,
    private readonly verifyOtpService: VerifyOtpService,
    private readonly resendOtpService: ResendOtpService,
  ) {}

  @Post('signup')
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('signin')
  async signIn(@Body() signInDto: SignInDto) {
    return this.signinService.signIn(signInDto);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.verifyOtpService.verifyOtp(verifyOtpDto);
  }

  @Post('resend-otp')
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.resendOtpService.resendOtp(resendOtpDto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.passwordRecoveryService.forgotPassword(forgotPasswordDto);
  }

  @Post('confirm-new-password')
  async confirmNewPassword(
    @Body() confirmNewPasswordDto: ConfirmNewPasswordDto,
  ) {
    return this.passwordRecoveryService.confirmNewPassword(
      confirmNewPasswordDto,
    );
  }
}
