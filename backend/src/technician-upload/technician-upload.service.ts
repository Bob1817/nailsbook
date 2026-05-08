import { Injectable } from '@nestjs/common';

@Injectable()
export class TechnicianUploadService {
  buildImageResponse(filename: string) {
    const url = `/uploads/${filename}`;

    return {
      url,
    };
  }
}
