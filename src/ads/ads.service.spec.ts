import { ForbiddenException } from '@nestjs/common';
import { AdsService } from './ads.service';
import { PrismaService } from '../prisma.service';

describe('AdsService', () => {
  const advertisement = {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const prisma = { advertisement } as unknown as PrismaService;

  let service: AdsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdsService(prisma);
  });

  it('solo devuelve anuncios activos y vigentes', async () => {
    advertisement.findMany.mockResolvedValue([]);

    await service.findActive();

    expect(advertisement.findMany).toHaveBeenCalledWith({
      where: { isActive: true, expiresAt: { gt: expect.any(Date) } },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('rechaza operaciones de administración para correos no autorizados', async () => {
    await expect(service.findAll('otro@correo.com')).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    await expect(
      service.create('otro@correo.com', {
        name: 'Ad',
        description: 'Desc',
        imageUrl: 'https://img',
        expiresAt: '2030-01-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(advertisement.create).not.toHaveBeenCalled();
  });

  it('crea el anuncio normalizando campos opcionales vacíos', async () => {
    advertisement.create.mockResolvedValue({ id: 'ad-1' });

    await service.create('zeus6281@gmail.com', {
      name: 'Promo',
      description: 'Descripción',
      imageUrl: 'https://img',
      expiresAt: '2030-01-01T00:00:00.000Z',
    });

    expect(advertisement.create).toHaveBeenCalledWith({
      data: {
        name: 'Promo',
        description: 'Descripción',
        imageUrl: 'https://img',
        redirectUrl: null,
        whatsapp: null,
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        isActive: true,
      },
    });
  });
});
