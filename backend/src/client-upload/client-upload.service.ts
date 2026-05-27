import { Injectable } from '@nestjs/common';

@Injectable()
export class ClientUploadService {
  buildImageResponse(filename: string) {
    // 返回相对路径，由前端通过同源/vite proxy 解析
    return { url: `/uploads/${filename}` };
  }
}
