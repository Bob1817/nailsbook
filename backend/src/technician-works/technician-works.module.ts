import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TechnicianWorksController } from './technician-works.controller';
import { PublicWorksController } from './public-works.controller';
import { PublicArtistController } from './public-artist.controller';
import { TechnicianWorksService } from './technician-works.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ClientArtistFollowsController } from './client-artist-follows.controller';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [
    TechnicianWorksController,
    PublicWorksController,
    PublicArtistController,
    ClientArtistFollowsController,
  ],
  providers: [TechnicianWorksService],
})
export class TechnicianWorksModule {}
