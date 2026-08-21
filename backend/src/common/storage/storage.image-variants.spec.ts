import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { StorageService } from './storage.service';

describe('StorageService image variants', () => {
  it('压缩图片并生成高清、中图和缩略图', async () => {
    const taskDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'nailart-image-'),
    );
    const previousDirectory = process.cwd();
    process.chdir(taskDirectory);
    try {
      const source = await sharp({
        create: {
          width: 2400,
          height: 1600,
          channels: 3,
          background: '#ec4899',
        },
      })
        .png()
        .toBuffer();
      const config = {
        get: jest.fn((_key: string, fallback?: unknown) => fallback),
      };
      const service = new StorageService(config as never);

      const result = await service.uploadImage({
        buffer: source,
        mimetype: 'image/png',
        originalname: 'source.png',
        size: source.length,
      });

      expect(result).toEqual(
        expect.objectContaining({
          url: expect.stringMatching(/-medium\.webp$/),
          highUrl: expect.stringMatching(/-high\.webp$/),
          mediumUrl: expect.stringMatching(/-medium\.webp$/),
          thumbnailUrl: expect.stringMatching(/-thumb\.webp$/),
          bytesStored: expect.any(Number),
        }),
      );
      const thumbnail = await sharp(
        path.join(taskDirectory, result.thumbnailUrl),
      ).metadata();
      expect(thumbnail.width).toBeLessThanOrEqual(480);
      expect(thumbnail.format).toBe('webp');
    } finally {
      process.chdir(previousDirectory);
      fs.rmSync(taskDirectory, { recursive: true, force: true });
    }
  });
});
