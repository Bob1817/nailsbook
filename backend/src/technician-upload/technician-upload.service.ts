import { Injectable } from '@nestjs/common';
import {
  StorageService,
  type UploadFile,
} from '../common/storage/storage.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TechnicianUploadService {
  constructor(
    private readonly storage: StorageService,
    private readonly subscriptions: SubscriptionsService,
    private readonly prisma: PrismaService,
  ) {}

  async uploadImage(technicianId: number, file: UploadFile) {
    const bytes = file.size ?? file.buffer.length;
    await this.subscriptions.assertCanUseStorage(technicianId, bytes * 3);
    const result = await this.storage.uploadImage(file);
    await this.subscriptions.recordStorageUsage(
      technicianId,
      result.bytesStored,
    );
    const asset = await this.prisma.uploadedAsset.create({
      data: {
        technicianId,
        url: result.url,
        highUrl: result.highUrl,
        mediumUrl: result.mediumUrl,
        thumbnailUrl: result.thumbnailUrl,
        bytesStored: result.bytesStored,
      },
    });
    return { ...result, assetId: asset.id };
  }

  async uploadAudio(technicianId: number, file: UploadFile) {
    const bytes = file.size ?? file.buffer.length;
    await this.subscriptions.assertCanUseStorage(technicianId, bytes);
    const result = await this.storage.uploadAudio(file);
    await this.subscriptions.recordStorageUsage(technicianId, bytes);
    return result;
  }
}
