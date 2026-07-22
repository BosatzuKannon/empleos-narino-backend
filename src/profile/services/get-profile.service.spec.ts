import { Test, TestingModule } from '@nestjs/testing';
import { GetProfileService } from './get-profile.service';
import { PrismaService } from '../../prisma.service';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

describe('GetProfileService', () => {
  let service: GetProfileService;
  let prismaMock: { user: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetProfileService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<GetProfileService>(GetProfileService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    const userId = 'usuario-123';

    it('debería obtener el perfil exitosamente', async () => {
      const mockProfile = {
        id: userId,
        firstName: 'Carlos',
        lastName: 'Jaramillo',
      };
      prismaMock.user.findUnique.mockResolvedValueOnce(mockProfile);

      const result = await service.getProfile(userId);

      expect(result).toEqual({
        statusCode: 200,
        profile: mockProfile,
      });
      expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('debería lanzar NotFoundException si no se encuentra el perfil', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.getProfile(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar InternalServerErrorException en caso de error de Prisma', async () => {
      prismaMock.user.findUnique.mockRejectedValueOnce(
        new Error('Fallo de conexión'),
      );

      await expect(service.getProfile(userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
