import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { SignupService } from './services/signup.service';

describe('AuthController', () => {
  let controller: AuthController;

  // Creamos un mock de nuestro servicio
  const mockSignupService = {
    signUp: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'Registro exitoso. El usuario puede iniciar sesión.',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        // Le inyectamos el mock al controlador
        {
          provide: SignupService,
          useValue: mockSignupService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });
});