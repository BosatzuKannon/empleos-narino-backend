import { Test, TestingModule } from '@nestjs/testing';
import { GeneratePresignedUrlService } from './generate-presigned-url.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

jest.mock('@supabase/supabase-js', () => {
  const mockCreateSignedUploadUrl = jest.fn().mockResolvedValue({
    data: {
      signedUrl: 'https://signed-test-url.com',
      path: 'offers/images/test.jpg',
    },
    error: null,
  });

  return {
    createClient: jest.fn(() => ({
      storage: {
        from: jest.fn().mockReturnValue({
          createSignedUploadUrl: mockCreateSignedUploadUrl,
        }),
      },
    })),
    __mockCreateSignedUploadUrl: mockCreateSignedUploadUrl,
  };
});

describe('GeneratePresignedUrlService', () => {
  let service: GeneratePresignedUrlService;
  let mockCreateSignedUploadUrl: jest.Mock;

  beforeEach(async () => {
    const supabaseModule = require('@supabase/supabase-js');
    mockCreateSignedUploadUrl = supabaseModule.__mockCreateSignedUploadUrl;
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: {
        signedUrl: 'https://signed-test-url.com',
        path: 'offers/images/test.jpg',
      },
      error: null,
    });

    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SUPABASE_URL: 'https://mock-url.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
          SUPABASE_STORAGE_BUCKET: 'mock-bucket',
        };
        return config[key];
      }),
      get: jest.fn((key: string) => {
        if (key === 'SUPABASE_URL') return 'https://mock-url.supabase.co';
        return undefined;
      }),
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
    expect(mockCreateSignedUploadUrl).toHaveBeenCalledTimes(1);
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
