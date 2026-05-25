import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { clientUploadMulterOptions } from './client-upload.config';
import { ClientUploadService } from './client-upload.service';

@Controller('client/uploads')
@UseGuards(ClientJwtAuthGuard)
@ApiTags('客户端-上传')
@ApiBearerAuth()
export class ClientUploadController {
  constructor(private readonly clientUploadService: ClientUploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', clientUploadMulterOptions))
  @ApiOperation({ summary: '上传图片' })
  @ApiResponse({ status: 200, description: '上传成功，返回图片URL' })
  @ApiResponse({ status: 400, description: '未选择图片文件' })
  uploadImage(@UploadedFile() file: { filename: string } | undefined) {
    if (!file) {
      throw new BadRequestException('请选择图片文件');
    }

    return this.clientUploadService.buildImageResponse(file.filename);
  }
}
