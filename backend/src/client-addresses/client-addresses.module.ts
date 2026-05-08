import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ClientAddressesController } from './client-addresses.controller';
import { ClientAddressesService } from './client-addresses.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClientAddressesController],
  providers: [ClientAddressesService],
})
export class ClientAddressesModule {}
