import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MarketingMaterialsController } from './marketing-materials.controller';
import { MarketingMaterialsService } from './marketing-materials.service';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [MarketingMaterialsController],
  providers: [MarketingMaterialsService],
})
export class MarketingMaterialsModule {}
