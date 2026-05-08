import { Injectable } from '@nestjs/common';

@Injectable()
export class ClientUploadService {
  buildImageResponse(filename: string) {
    const url = `/uploads/${filename}`;

    return {
      url,
    };
  }
}
