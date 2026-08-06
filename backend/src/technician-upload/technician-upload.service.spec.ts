import { TechnicianUploadService } from './technician-upload.service';

describe('TechnicianUploadService subscription storage', () => {
  it('上传成功后按实际文件大小记录存储用量', async () => {
    const storage = {
      uploadImage: jest.fn().mockResolvedValue({
        url: '/uploads/test-medium.webp',
        highUrl: '/uploads/test-high.webp',
        mediumUrl: '/uploads/test-medium.webp',
        thumbnailUrl: '/uploads/test-thumb.webp',
        bytesStored: 4,
      }),
    };
    const subscriptions = {
      assertCanUseStorage: jest.fn().mockResolvedValue(undefined),
      recordStorageUsage: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = {
      uploadedAsset: { create: jest.fn().mockResolvedValue({ id: 13 }) },
    };
    const service = new TechnicianUploadService(
      storage as never,
      subscriptions as never,
      prisma as never,
    );
    const file = {
      buffer: Buffer.from('image'),
      mimetype: 'image/jpeg',
      size: 5,
    };

    await expect(service.uploadImage(7, file)).resolves.toMatchObject({
      url: '/uploads/test-medium.webp',
      bytesStored: 4,
    });
    expect(subscriptions.assertCanUseStorage).toHaveBeenCalledWith(7, 15);
    expect(subscriptions.recordStorageUsage).toHaveBeenCalledWith(7, 4);
    expect(prisma.uploadedAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ technicianId: 7, bytesStored: 4 }),
    });
  });
});
