import { Module } from '@nestjs/common';
import { ClientUploadController } from './client-upload.controller';
import { ClientUploadService } from './client-upload.service';

@Module({
  controllers: [ClientUploadController],
  providers: [ClientUploadService],
})
export class ClientUploadModule {}
