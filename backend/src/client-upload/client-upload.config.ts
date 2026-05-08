import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { diskStorage } from 'multer';
import * as path from 'path';

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const CLIENT_UPLOAD_IMAGE_LIMIT_BYTES = 5 * 1024 * 1024;

export const clientUploadStorage = {
  getDestination() {
    return path.resolve(process.cwd(), 'uploads');
  },
  getFilename(
    file: {
      mimetype: string;
      originalname?: string;
    },
    callback: (error: Error | null, filename: string) => void,
  ) {
    const extension = getSafeImageExtension(file);
    callback(
      null,
      `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${extension}`,
    );
  },
};

export function clientUploadFileFilter(
  _request: unknown,
  file: {
    mimetype: string;
    originalname?: string;
  },
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  try {
    getSafeImageExtension(file);
    callback(null, true);
  } catch (error) {
    callback(error as Error, false);
  }
}

export const clientUploadMulterOptions = {
  storage: diskStorage({
    destination: clientUploadStorage.getDestination(),
    filename: (_request, file, callback) => {
      clientUploadStorage.getFilename(file, callback);
    },
  }),
  fileFilter: clientUploadFileFilter,
  limits: {
    fileSize: CLIENT_UPLOAD_IMAGE_LIMIT_BYTES,
  },
};

function getSafeImageExtension(file: {
  mimetype: string;
  originalname?: string;
}) {
  const expectedExtension = ALLOWED_IMAGE_TYPES[file.mimetype];
  const originalExtension = path.extname(file.originalname ?? '').toLowerCase();

  if (!expectedExtension || !originalExtension) {
    throw new BadRequestException('仅支持 jpg/jpeg/png/webp 图片上传');
  }

  if (expectedExtension === '.jpg') {
    if (originalExtension !== '.jpg' && originalExtension !== '.jpeg') {
      throw new BadRequestException('仅支持 jpg/jpeg/png/webp 图片上传');
    }

    return '.jpg';
  }

  if (originalExtension !== expectedExtension) {
    throw new BadRequestException('仅支持 jpg/jpeg/png/webp 图片上传');
  }

  return expectedExtension;
}
