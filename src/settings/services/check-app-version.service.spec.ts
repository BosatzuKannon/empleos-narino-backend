import { Test, TestingModule } from '@nestjs/testing';
import { CheckAppVersionService } from './check-app-version.service';
import { PrismaService } from '../../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('CheckAppVersionService', () => {
  let service: CheckAppVersionService;
  let prismaMock: { systemConfig: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prismaMock = {
      systemConfig: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckAppVersionService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CheckAppVersionService>(CheckAppVersionService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('checkAppVersion', () => {
    it('debería devolver la configuración de la app si existe en la base de datos', async () => {
      const mockConfig = {
        minVersionCode: 10,
        messageEs: 'Actualización requerida',
        appStatus: 'ACTIVE',
        appStatusMessage: null,
      };

      prismaMock.systemConfig.findUnique.mockResolvedValueOnce(mockConfig);

      const result = await service.checkAppVersion();

      expect(result).toEqual({
        statusCode: 200,
        min_version_code: 10,
        message_es: 'Actualización requerida',
        app_status: 'ACTIVE',
        app_status_message: null,
      });
      expect(prismaMock.systemConfig.findUnique).toHaveBeenCalledTimes(1);
      expect(prismaMock.systemConfig.findUnique).toHaveBeenCalledWith({
        where: { key: 'APP_VERSION' },
      });
    });

    it('debería devolver valores por defecto si no encuentra el item', async () => {
      prismaMock.systemConfig.findUnique.mockResolvedValueOnce(null);

      const result = await service.checkAppVersion();

      expect(result).toEqual({
        statusCode: 200,
        min_version_code: 1,
        message_es: 'Configuración de versión por defecto.',
      });
    });

    it('debería lanzar InternalServerErrorException si Prisma falla', async () => {
      prismaMock.systemConfig.findUnique.mockRejectedValueOnce(
        new Error('Fallo de conexión'),
      );

      await expect(service.checkAppVersion()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
