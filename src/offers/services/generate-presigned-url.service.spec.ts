import { Test, TestingModule } from '@nestjs/testing';
import { GeneratePresignedUrlService } from './generate-presigned-url.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-test-url.com'),
}));

describe('GeneratePresignedUrlService', () => {
  let service: GeneratePresignedUrlService;

  beforeEach(async () => {
    const mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('dummy-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeneratePresignedUrlService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GeneratePresignedUrlService>(
      GeneratePresignedUrlService,
    );
  });

  it('debería generar una URL firmada exitosamente', async () => {
    const dto = {
      fileName: 'foto.jpg',
      fileType: 'image/jpeg',
      fileCategory: 'images',
    };
    const result = await service.generatePresignedUrl(dto);

    expect(result.statusCode).toBe(200);
    expect(result.signedUrl).toBe('https://signed-test-url.com');
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('debería lanzar BadRequestException para categoría inválida', async () => {
    const dto = {
      fileName: 'test.jpg',
      fileType: 'image/jpeg',
      fileCategory: 'invalido',
    };
    await expect(service.generatePresignedUrl(dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('debería lanzar BadRequestException para tipo de archivo no permitido', async () => {
    const dto = {
      fileName: 'virus.exe',
      fileType: 'application/x-msdownload',
      fileCategory: 'images',
    };
    await expect(service.generatePresignedUrl(dto)).rejects.toThrow(
      BadRequestException,
    );
  });
});
