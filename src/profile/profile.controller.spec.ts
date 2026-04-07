import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { GetProfileService } from './services/get-profile.service';
import { UpdateProfileService } from './services/update-profile.service';

describe('ProfileController', () => {
  let controller: ProfileController;

  const mockGetProfileService = {
    getProfile: jest.fn().mockResolvedValue({
      statusCode: 200,
      profile: { nombres: 'Carlos', apellidos: 'Jaramillo' },
    }),
  };

  const mockUpdateProfileService = {
    updateProfile: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'Perfil de usuario actualizado exitosamente.',
      updatedAttributes: {
        nombres: 'Carlos',
        apellidos: 'Jaramillo',
        telefono: '3001234567',
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: GetProfileService,
          useValue: mockGetProfileService,
        },
        {
          provide: UpdateProfileService,
          useValue: mockUpdateProfileService,
        },
      ],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });
});
