import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import {
  technicianUploadMulterOptions,
  technicianUploadAudioMulterOptions,
} from './technician-upload.config';
import { TechnicianUploadService } from './technician-upload.service';

@ApiTags('美甲师-上传')
@ApiBearerAuth()
@Controller('technician/uploads')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
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
  uploadImage(
    @Req() request: { user: { technicianId: number } },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('请选择图片文件');
    }

    return this.technicianUploadService.uploadImage(
      request.user.technicianId,
      file,
    );
  }

  @Post('audio')
  @UseInterceptors(FileInterceptor('file', technicianUploadAudioMulterOptions))
  @ApiOperation({ summary: '上传语音' })
  @ApiResponse({ status: 200, description: '语音上传成功' })
  @ApiResponse({ status: 400, description: '请选择音频文件' })
  @ApiResponse({ status: 401, description: '未授权' })
  uploadAudio(
    @Req() request: { user: { technicianId: number } },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('请选择音频文件');
    }

    return this.technicianUploadService.uploadAudio(
      request.user.technicianId,
      file,
    );
  }
}
