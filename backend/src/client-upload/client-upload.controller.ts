import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { clientUploadMulterOptions } from './client-upload.config';
import { ClientUploadService } from './client-upload.service';

@Controller('client/uploads')
@UseGuards(ClientJwtAuthGuard)
export class ClientUploadController {
  constructor(private readonly clientUploadService: ClientUploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', clientUploadMulterOptions))
  uploadImage(@UploadedFile() file: { filename: string } | undefined) {
    if (!file) {
      throw new BadRequestException('请选择图片文件');
    }

    return this.clientUploadService.buildImageResponse(file.filename);
  }
}
