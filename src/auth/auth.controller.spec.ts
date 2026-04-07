import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { SignupService } from './services/signup.service';
import { SigninService } from './services/signin.service';
import { PasswordRecoveryService } from './services/password-recovery.service';

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
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });
});
