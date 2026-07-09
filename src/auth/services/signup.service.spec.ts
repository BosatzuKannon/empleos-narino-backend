import { Test, TestingModule } from '@nestjs/testing';
import { SignupService } from './signup.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException, BadRequestException } from '@nestjs/common';

describe('SignupService', () => {
  let service: SignupService;

  beforeEach(async () => {
    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SUPABASE_URL: 'https://mock-url.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignupService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SignupService>(SignupService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
    const mockDto = {
      email: 'prueba@empleosnarino.com',
      password: 'Password123!',
      nombres: 'Carlos',
      apellidos: 'Jaramillo',
      telefono: '3175345577',
      user_type: 'candidato',
      fecha_nacimiento: '1988-05-15',
      ciudad: 'Pasto',
      nombre_empresa: '',
    };

    it('debería registrar un usuario exitosamente en Supabase', async () => {
      const supabaseCreateMock = jest
        .spyOn(service['supabaseAdmin'].auth.admin, 'createUser')
        .mockResolvedValueOnce({ data: { user: { id: 'mock-id' } }, error: null } as any);

      const result = await service.signUp(mockDto);

      expect(result).toEqual({
        statusCode: 201, // Or 200 depending on what your service returns
        message: 'Registro exitoso. El usuario puede iniciar sesión.',
      });
      expect(supabaseCreateMock).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar BadRequestException si el correo ya está registrado', async () => {
      jest
        .spyOn(service['supabaseAdmin'].auth.admin, 'createUser')
        .mockResolvedValueOnce({
          data: { user: null },
          error: { message: 'A user with this email address has already been registered' },
        } as any);

      await expect(service.signUp(mockDto)).rejects.toThrow(BadRequestException);
    });
    
    it('debería lanzar InternalServerErrorException si ocurre un error general', async () => {
      jest
        .spyOn(service['supabaseAdmin'].auth.admin, 'createUser')
        .mockRejectedValueOnce(new Error('Fallo de conexión a Supabase'));

      await expect(service.signUp(mockDto)).rejects.toThrow(InternalServerErrorException);
    });
  });
});