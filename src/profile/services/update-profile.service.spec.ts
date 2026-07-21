import { Test, TestingModule } from '@nestjs/testing';
import { UpdateProfileService } from './update-profile.service';
import { PrismaService } from '../../prisma.service';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

describe('UpdateProfileService', () => {
  let service: UpdateProfileService;
  let prismaMock: { user: { findUnique: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateProfileService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UpdateProfileService>(UpdateProfileService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('updateProfile', () => {
    const userId = 'usuario-123';
    const mockDto = {
      nombres: 'Carlos',
      apellidos: 'Jaramillo',
      telefono: '3001234567',
      ciudad: 'Pasto',
    };

    it('debería actualizar el perfil exitosamente', async () => {
      const mockExistingUser = { id: userId, firstName: 'Old' };
      prismaMock.user.findUnique.mockResolvedValueOnce(mockExistingUser);

      const mockUpdatedUser = {
        id: userId,
        firstName: 'Carlos',
        lastName: 'Jaramillo',
        phone: '3001234567',
        city: 'Pasto',
      };
      prismaMock.user.update.mockResolvedValueOnce(mockUpdatedUser);

      const result = await service.updateProfile(userId, mockDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Perfil de usuario actualizado exitosamente.',
        updatedAttributes: mockUpdatedUser,
      });
      expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
      expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.updateProfile(userId, mockDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar InternalServerErrorException en caso de error de Prisma', async () => {
      prismaMock.user.findUnique.mockRejectedValueOnce(new Error('Fallo de conexión'));

      await expect(service.updateProfile(userId, mockDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
