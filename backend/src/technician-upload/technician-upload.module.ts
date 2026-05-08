import { Module } from '@nestjs/common';
import { TechnicianUploadController } from './technician-upload.controller';
import { TechnicianUploadService } from './technician-upload.service';

@Module({
  controllers: [TechnicianUploadController],
  providers: [TechnicianUploadService],
})
export class TechnicianUploadModule {}
