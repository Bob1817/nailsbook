import { BadRequestException } from '@nestjs/common';
import {
  CLIENT_UPLOAD_IMAGE_LIMIT_BYTES,
  clientUploadFileFilter,
  clientUploadMulterOptions,
  clientUploadStorage,
} from './client-upload.config';

describe('client-upload config', () => {
  it('accepts only allowlisted image mime and extension pairs', () => {
    const callback = jest.fn();

    clientUploadFileFilter(
      {} as never,
      {
        mimetype: 'image/png',
        originalname: 'design.png',
      } as never,
      callback,
    );

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('rejects files with a mismatched or disallowed extension', () => {
    const callback = jest.fn();

    clientUploadFileFilter(
      {} as never,
      {
        mimetype: 'image/png',
        originalname: 'design.svg',
      } as never,
      callback,
    );

    expect(callback).toHaveBeenCalledWith(
      expect.any(BadRequestException),
      false,
    );
  });

  it('normalizes generated filenames to safe allowlisted extensions', () => {
    const callback = jest.fn();

    clientUploadStorage.getFilename(
      {
        originalname: 'My Design.JPEG',
        mimetype: 'image/jpeg',
      } as never,
      callback,
    );

    expect(callback).toHaveBeenCalledWith(
      null,
      expect.stringMatching(/^\d+-[0-9a-f]{8}\.jpg$/),
    );
  });

  it('exposes a finite file size limit for uploaded images', () => {
    expect(CLIENT_UPLOAD_IMAGE_LIMIT_BYTES).toBeGreaterThan(0);
    expect(clientUploadMulterOptions.limits).toEqual({
      fileSize: CLIENT_UPLOAD_IMAGE_LIMIT_BYTES,
    });
  });
});
