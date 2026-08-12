import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    company: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prismaMock = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      company: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería actualizar el rol y devolver el usuario actualizado', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'ana@example.com',
      firstName: 'Ana',
      lastName: 'Gómez',
      role: 'PENDING',
    });
    prismaMock.user.update.mockResolvedValueOnce({
      id: 'user-1',
      email: 'ana@example.com',
      firstName: 'Ana',
      lastName: 'Gómez',
      role: 'CANDIDATE',
      isVerified: true,
      phone: '',
      city: '',
      avatarUrl: '',
    });
    prismaMock.company.findFirst.mockResolvedValueOnce(null);

    const result = await service.setRole('user-1', { role: 'CANDIDATE' });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'CANDIDATE' },
    });
    expect(result.user.role).toBe('CANDIDATE');
  });

  it('debería lanzar NotFoundException si el usuario no existe', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.setRole('user-1', { role: 'CANDIDATE' }),
    ).rejects.toThrow(NotFoundException);
  });
});
