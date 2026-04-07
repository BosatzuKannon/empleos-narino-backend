import { Controller, Post, Body } from '@nestjs/common';
import { SignupService } from './services/signup.service';
import { SigninService } from './services/signin.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: SignupService,
    private readonly signinService: SigninService,
  ) {}

  @Post('signup')
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('signin')
  async signIn(@Body() signInDto: SignInDto) {
    return this.signinService.signIn(signInDto);
  }
}
