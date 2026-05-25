import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { technicianUploadMulterOptions } from './technician-upload.config';
import { TechnicianUploadService } from './technician-upload.service';

@ApiTags('美甲师-上传')
@ApiBearerAuth()
@Controller('technician/uploads')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianUploadController {
  constructor(
    private readonly technicianUploadService: TechnicianUploadService,
  ) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', technicianUploadMulterOptions))
  @ApiOperation({ summary: '上传图片' })
  @ApiResponse({ status: 200, description: '图片上传成功' })
  @ApiResponse({ status: 400, description: '请选择图片文件' })
  @ApiResponse({ status: 401, description: '未授权' })
  uploadImage(@UploadedFile() file: { filename: string } | undefined) {
    if (!file) {
      throw new BadRequestException('请选择图片文件');
    }

    return this.technicianUploadService.buildImageResponse(file.filename);
  }
}
