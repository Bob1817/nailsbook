import { ArtistInvitationController } from './artist-invitation.controller';
import { ArtistInteractionsController } from './artist-interactions.controller';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TechnicianWorksController } from './technician-works.controller';
import { PublicWorksController } from './public-works.controller';
import { PublicArtistController } from './public-artist.controller';
import { TechnicianWorksService } from './technician-works.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ClientArtistFollowsController } from './client-artist-follows.controller';
import { QualificationsController } from './qualifications.controller';
import { ReviewsController } from './reviews.controller';
import { WorkShareCodeService } from './work-share-code.service';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [
    TechnicianWorksController,
    ArtistInteractionsController,
    ArtistInvitationController,
    PublicWorksController,
    PublicArtistController,
    ClientArtistFollowsController,
    QualificationsController,
    ReviewsController,
  ],
  providers: [TechnicianWorksService, WorkShareCodeService],
})
export class TechnicianWorksModule {}
