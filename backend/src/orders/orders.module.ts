import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ClientOrdersService } from './client-orders.service';
import { TechnicianOrdersController } from './technician-orders.controller';
import { ClientOrdersController } from './client-orders.controller';
import { OrdersScheduler } from './orders.scheduler';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [PrismaModule, ChatModule],
  controllers: [TechnicianOrdersController, ClientOrdersController],
  providers: [OrdersService, ClientOrdersService, OrdersScheduler],
  exports: [OrdersService, ClientOrdersService],
})
export class OrdersModule {}
