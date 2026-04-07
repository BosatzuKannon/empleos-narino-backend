import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { SignupService } from './services/signup.service';
import { SigninService } from './services/signin.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockSignupService = {
    signUp: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'Registro exitoso. El usuario puede iniciar sesión.',
    }),
  };

  // 1. Creamos el mock para el nuevo servicio
  const mockSigninService = {
    signIn: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'Inicio de sesión exitoso',
      authenticationResult: { AccessToken: 'mock-jwt-token' },
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
        // 2. Inyectamos el mock del SigninService en el módulo de pruebas
        {
          provide: SigninService,
          useValue: mockSigninService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });
});
