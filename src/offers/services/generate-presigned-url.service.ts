import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { GeneratePresignedUrlDto } from '../dto/generate-presigned-url.dto';

@Injectable()
export class GeneratePresignedUrlService {
  private supabase: ReturnType<typeof createClient>;
  private readonly BUCKET_NAME: string;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const supabaseKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    this.BUCKET_NAME = this.configService.getOrThrow<string>(
      'SUPABASE_STORAGE_BUCKET',
    );

    // Initialize Supabase Storage client
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async generatePresignedUrl(dto: GeneratePresignedUrlDto) {
    const { fileName, fileType, fileCategory = 'images', fileSize } = dto;

    const MAX_RESUME_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

    interface CategoryConfig {
      folder: string;
      allowedTypes: string[];
      maxSizeBytes?: number;
      errorMessage: string;
    }

    const categoryConfig: Record<string, CategoryConfig> = {
      images: {
        folder: 'offers/images',
        allowedTypes: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
        ],
        errorMessage:
          'Tipo de archivo no permitido. Solo se permiten imágenes.',
      },
      payments: {
        folder: 'offers/payments',
        allowedTypes: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'application/pdf',
        ],
        errorMessage:
          'Tipo de archivo no permitido. Solo se permiten imágenes o PDF.',
      },
      resumes: {
        folder: 'users/cvs',
        allowedTypes: ['application/pdf'],
        maxSizeBytes: MAX_RESUME_SIZE_BYTES,
        errorMessage:
          'Tipo de archivo no permitido para hojas de vida. Solo se aceptan archivos PDF.',
      },
    };

    const config = categoryConfig[fileCategory];

    if (!config) {
      throw new BadRequestException('Categoría de archivo no válida.');
    }

    if (!config.allowedTypes.includes(fileType)) {
      throw new BadRequestException(config.errorMessage);
    }

    if (
      config.maxSizeBytes &&
      fileSize !== undefined &&
      fileSize > config.maxSizeBytes
    ) {
      throw new BadRequestException(
        `El archivo supera el tamaño máximo permitido de 2 MB.`,
      );
    }

    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const key = `${config.folder}/${uniqueFileName}`;

    try {
      // Replaced AWS S3 SDK with Supabase Signed Upload URL
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUploadUrl(key);

      if (error) {
        throw new Error(error.message);
      }

      // Reconstruct the public retrieval URL for your frontend
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      const publicRetrievalUrl = `${supabaseUrl}/storage/v1/object/public/${this.BUCKET_NAME}/${key}`;

      return {
        statusCode: 200,
        signedUrl: data.signedUrl,
        key: data.path,
        url: publicRetrievalUrl,
        category: fileCategory,
      };
    } catch (error) {
      console.error('Error generando URL firmada:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Supabase Storage Error';
      throw new InternalServerErrorException({
        message: 'Error al generar la URL firmada.',
        error: errorMessage,
      });
    }
  }
}
