import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { SignupService } from './services/signup.service';
import { SigninService } from './services/signin.service';
import { PasswordRecoveryService } from './services/password-recovery.service';
import { VerifyOtpService } from './services/verify-otp.service';
import { ResendOtpService } from './services/resend-otp.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockSignupService = {
    signUp: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'Registro exitoso. El usuario puede iniciar sesión.',
    }),
  };

  const mockSigninService = {
    signIn: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'Inicio de sesión exitoso',
      authenticationResult: { AccessToken: 'mock-jwt-token' },
    }),
  };

  // Creamos el mock para el nuevo servicio de recuperación
  const mockPasswordRecoveryService = {
    forgotPassword: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'Código de recuperación de contraseña enviado al email.',
    }),
    confirmNewPassword: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'Contraseña actualizada exitosamente.',
    }),
  };

  const mockVerifyOtpService = {
    verifyOtp: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'Cuenta verificada exitosamente.',
    }),
  };

  const mockResendOtpService = {
    resendOtp: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'Se ha enviado un nuevo código de verificación a tu correo.',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: SignupService,
          useValue: mockSignupService,
        },
        {
          provide: SigninService,
          useValue: mockSigninService,
        },
        // Inyectamos el nuevo mock
        {
          provide: PasswordRecoveryService,
          useValue: mockPasswordRecoveryService,
        },
        {
          provide: VerifyOtpService,
          useValue: mockVerifyOtpService,
        },
        {
          provide: ResendOtpService,
          useValue: mockResendOtpService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debería verificar el OTP', async () => {
    const result = await controller.verifyOtp({
      email: 'prueba@empleosnarino.com',
      code: '123456',
    });
    expect(result.statusCode).toBe(200);
    expect(mockVerifyOtpService.verifyOtp).toHaveBeenCalledTimes(1);
  });

  it('debería reenviar el OTP', async () => {
    const result = await controller.resendOtp({
      email: 'prueba@empleosnarino.com',
    });
    expect(result.statusCode).toBe(200);
    expect(mockResendOtpService.resendOtp).toHaveBeenCalledTimes(1);
  });
});
