import { Injectable } from '@nestjs/common';
import { StorageService, type UploadFile } from '../common/storage/storage.service';

@Injectable()
export class ClientUploadService {
  constructor(private readonly storage: StorageService) {}

  uploadImage(file: UploadFile) {
    return this.storage.uploadImage(file);
  }
}
