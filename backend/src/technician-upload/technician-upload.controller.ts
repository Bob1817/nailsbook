import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { technicianUploadMulterOptions } from './technician-upload.config';
import { TechnicianUploadService } from './technician-upload.service';

@Controller('technician/uploads')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianUploadController {
  constructor(private readonly technicianUploadService: TechnicianUploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', technicianUploadMulterOptions))
  uploadImage(@UploadedFile() file: { filename: string } | undefined) {
    if (!file) {
      throw new BadRequestException('请选择图片文件');
    }

    return this.technicianUploadService.buildImageResponse(file.filename);
  }
}
