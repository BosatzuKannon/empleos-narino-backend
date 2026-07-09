import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GeneratePresignedUrlDto } from '../dto/generate-presigned-url.dto';

@Injectable()
export class GeneratePresignedUrlService {
  private s3Client: S3Client;
  private readonly BUCKET_NAME: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    this.BUCKET_NAME = this.configService.getOrThrow<string>('S3_BUCKET_NAME');

    this.s3Client = new S3Client({ region });
  }

  async generatePresignedUrl(dto: GeneratePresignedUrlDto) {
    const { fileName, fileType, fileCategory = 'images' } = dto;

    interface CategoryConfig {
      folder: string;
      allowedTypes: string[];
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
        folder: 'users/resumes',
        allowedTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        errorMessage:
          'Tipo de archivo no permitido para hojas de vida. Solo PDF o DOC/DOCX.',
      },
    };

    const config = categoryConfig[fileCategory];

    if (!config) {
      throw new BadRequestException('Categoría de archivo no válida.');
    }

    if (!config.allowedTypes.includes(fileType)) {
      throw new BadRequestException(config.errorMessage);
    }

    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const key = `${config.folder}/${uniqueFileName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
        ContentType: fileType,
        Metadata: {
          category: fileCategory,
          uploadedBy: 'job-portal-api',
          uploadedAt: new Date().toISOString(),
        },
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 900,
      });
      const region = await this.s3Client.config.region();

      return {
        statusCode: 200,
        signedUrl,
        key,
        url: `https://${this.BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`,
        category: fileCategory,
      };
    } catch (error) {
      console.error('Error generando URL firmada:', error);
      throw new InternalServerErrorException({
        message: 'Error al generar la URL firmada.',
        error: error instanceof Error ? error.message : 'S3 Error',
      });
    }
  }
}
