import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TechniciansModule } from './technicians/technicians.module';
import { CustomersModule } from './customers/customers.module';
import { QuotesModule } from './quotes/quotes.module';
import { BookingsModule } from './bookings/bookings.module';
import { RevenuesModule } from './revenues/revenues.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OperationLogsModule } from './operation-logs/operation-logs.module';
import { SchedulesModule } from './schedules/schedules.module';
import { TechnicianAuthModule } from './technician-auth/technician-auth.module';
import { ClientAuthModule } from './client-auth/client-auth.module';
import { ClientHomeModule } from './client-home/client-home.module';
import { ClientAddressesModule } from './client-addresses/client-addresses.module';
import { ClientUploadModule } from './client-upload/client-upload.module';
import { ClientDesignsModule } from './client-designs/client-designs.module';
import { TechnicianUploadModule } from './technician-upload/technician-upload.module';
import { ClientBookingsModule } from './client-bookings/client-bookings.module';
import { ClientMessagesModule } from './client-messages/client-messages.module';
import { TechnicianMessagesModule } from './technician-messages/technician-messages.module';
import { TechnicianWorksModule } from './technician-works/technician-works.module';
import { TechnicianServicesModule } from './technician-services/technician-services.module';
import { ArtistApplicationsModule } from './artist-applications/artist-applications.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { DevelopmentAuthSeedService } from './development-auth-seed.service';
import { DevelopmentDemoSeedService } from './development-demo-seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    TechniciansModule,
    CustomersModule,
    QuotesModule,
    BookingsModule,
    RevenuesModule,
    SubscriptionsModule,
    DashboardModule,
    OperationLogsModule,
    SchedulesModule,
    TechnicianAuthModule,
    ClientAuthModule,
    ClientHomeModule,
    ClientAddressesModule,
    ClientUploadModule,
    ClientDesignsModule,
    ClientBookingsModule,
    ClientMessagesModule,
    TechnicianMessagesModule,
    TechnicianWorksModule,
    TechnicianServicesModule,
    TechnicianUploadModule,
    ArtistApplicationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, DevelopmentAuthSeedService, DevelopmentDemoSeedService],
})
export class AppModule {}
