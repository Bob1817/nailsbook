import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminReleasesController, PublicReleasesController } from './releases.controller';
import { ReleasesService } from './releases.service';
@Module({imports:[PrismaModule,AuthModule],controllers:[AdminReleasesController,PublicReleasesController],providers:[ReleasesService]})
export class ReleasesModule {}
