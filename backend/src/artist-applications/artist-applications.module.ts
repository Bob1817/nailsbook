import { Module } from '@nestjs/common';
import { ArtistApplicationsController } from './artist-applications.controller';
import { ArtistApplicationsService } from './artist-applications.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { WechatOfficialModule } from '../wechat-official/wechat-official.module';

@Module({
  imports: [WechatOfficialModule],
  controllers: [ArtistApplicationsController],
  providers: [ArtistApplicationsService, PrismaService],
})
export class ArtistApplicationsModule {}
