import { Injectable } from '@nestjs/common';

@Injectable()
export class TechnicianUploadService {
  buildImageResponse(filename: string) {
    return { url: `/uploads/${filename}` };
  }
}
