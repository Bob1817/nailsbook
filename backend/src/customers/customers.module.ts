import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { TechnicianCustomersController } from './technician-customers.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomersController, TechnicianCustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
