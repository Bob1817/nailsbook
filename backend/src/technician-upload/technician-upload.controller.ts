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
import {
  technicianUploadMulterOptions,
  technicianUploadAudioMulterOptions,
} from './technician-upload.config';
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
  uploadImage(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('请选择图片文件');
    }

    return this.technicianUploadService.uploadImage(file);
  }

  @Post('audio')
  @UseInterceptors(FileInterceptor('file', technicianUploadAudioMulterOptions))
  @ApiOperation({ summary: '上传语音' })
  @ApiResponse({ status: 200, description: '语音上传成功' })
  @ApiResponse({ status: 400, description: '请选择音频文件' })
  @ApiResponse({ status: 401, description: '未授权' })
  uploadAudio(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('请选择音频文件');
    }

    return this.technicianUploadService.uploadAudio(file);
  }
}
