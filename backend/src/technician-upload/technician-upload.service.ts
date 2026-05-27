import { Injectable } from '@nestjs/common';

const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || '';

@Injectable()
export class TechnicianUploadService {
  buildImageResponse(filename: string) {
    const path = `/uploads/${filename}`;
    return {
      url: UPLOAD_BASE_URL ? `${UPLOAD_BASE_URL}${path}` : path,
    };
  }
}
