import { BadRequestException } from '@nestjs/common';
import {
  CLIENT_UPLOAD_IMAGE_LIMIT_BYTES,
  clientUploadFileFilter,
  clientUploadMulterOptions,
} from './client-upload.config';

describe('client-upload config', () => {
  it('accepts only allowlisted image mime and extension pairs', () => {
    const callback = jest.fn();

    clientUploadFileFilter(
      {},
      {
        mimetype: 'image/png',
        originalname: 'design.png',
      },
      callback,
    );

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('rejects files with a mismatched or disallowed extension', () => {
    const callback = jest.fn();

    clientUploadFileFilter(
      {},
      {
        mimetype: 'image/png',
        originalname: 'design.svg',
      },
      callback,
    );

    expect(callback).toHaveBeenCalledWith(
      expect.any(BadRequestException),
      false,
    );
  });

  it('exposes a finite file size limit for uploaded images', () => {
    expect(CLIENT_UPLOAD_IMAGE_LIMIT_BYTES).toBeGreaterThan(0);
    expect(clientUploadMulterOptions.limits).toEqual({
      fileSize: CLIENT_UPLOAD_IMAGE_LIMIT_BYTES,
    });
  });

  it('uses memory storage for OSS upload pipeline', () => {
    // memoryStorage() 返回的存储引擎不包含 getDestination 和 getFilename
    // 文件 buffer 直接交由 StorageService 处理
    expect(clientUploadMulterOptions.storage).toBeDefined();
    expect(typeof clientUploadMulterOptions.fileFilter).toBe('function');
  });
});
