import { AccountDeletionModule } from './account-deletion/account-deletion.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { IsolatedThrottlerStorage } from './common/isolated-throttler-storage';
import { APP_GUARD } from '@nestjs/core';
import { VerificationCodeModule } from './common/verification-code/verification-code.module';
import { SmsModule } from './common/sms/sms.module';
import { StorageModule } from './common/storage/storage.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TechniciansModule } from './technicians/technicians.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
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
import { ClientMessagesModule } from './client-messages/client-messages.module';
import { TechnicianMessagesModule } from './technician-messages/technician-messages.module';
import { ChatModule } from './chat/chat.module';
import { TechnicianWorksModule } from './technician-works/technician-works.module';
import { TechnicianServicesModule } from './technician-services/technician-services.module';
import { ArtistApplicationsModule } from './artist-applications/artist-applications.module';
import { CustomServiceRequestsModule } from './custom-service-requests/custom-service-requests.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { AdminRolesModule } from './admin-roles/admin-roles.module';
import { AdminPermissionsModule } from './admin-permissions/admin-permissions.module';
import { AdminInviteKeysModule } from './admin-invite-keys/admin-invite-keys.module';
import { AdminWorksModule } from './admin-works/admin-works.module';
import { AdminCommentsModule } from './admin-comments/admin-comments.module';
import { AdminReportsModule } from './admin-reports/admin-reports.module';
import { ClientReportsModule } from './client-reports/client-reports.module';
import { FeedbackModule } from './feedback/feedback.module';
import { PushModule } from './notifications/push.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { DevelopmentAuthSeedService } from './development-auth-seed.service';
import { DevelopmentDemoSeedService } from './development-demo-seed.service';
import { ProductionSeedService } from './production-seed.service';
import { TechnicianInsightsModule } from './technician-insights/technician-insights.module';
import { ReferralsModule } from './referrals/referrals.module';
import { PaymentsModule } from './payments/payments.module';
import { MarketingMaterialsModule } from './marketing-materials/marketing-materials.module';
import { WechatAuthModule } from './wechat-auth/wechat-auth.module';
import { WechatPlatformConfigModule } from './wechat-platform-config/wechat-platform-config.module';
import { ThrottlerCleanupService } from './common/throttler-cleanup.service';
import { ConversionEventsModule } from './conversion-events/conversion-events.module';
import { WechatSubscribeMessagesModule } from './wechat-subscribe-messages/wechat-subscribe-messages.module';
import { BrandProfilesModule } from './brand-profiles/brand-profiles.module';

@Module({
  imports: [
    AccountDeletionModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot({
      storage: new IsolatedThrottlerStorage(),
      errorMessage: (_context, detail) => `请求过于频繁，请 ${detail.timeToBlockExpire} 秒后重试`,
      throttlers: [
      {
        ttl: 60000,
        // Authentication and verification endpoints define stricter local
        // limits. This default protects normal authenticated API traffic.
        limit: 300,
      },
      ],
    }),
    VerificationCodeModule,
    SmsModule,
    StorageModule,
    PrismaModule,
    ConversionEventsModule,
    AuthModule,
    TechniciansModule,
    CustomersModule,
    OrdersModule,
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
    ClientMessagesModule,
    TechnicianMessagesModule,
    ChatModule,
    TechnicianWorksModule,
    TechnicianServicesModule,
    TechnicianUploadModule,
    ArtistApplicationsModule,
    CustomServiceRequestsModule,
    FeatureFlagsModule,
    AdminRolesModule,
    AdminPermissionsModule,
    AdminInviteKeysModule,
    AdminWorksModule,
    AdminCommentsModule,
    AdminReportsModule,
    ClientReportsModule,
    FeedbackModule,
    PushModule,
    TechnicianInsightsModule,
    ReferralsModule,
    PaymentsModule,
    MarketingMaterialsModule,
    WechatAuthModule,
    WechatPlatformConfigModule,
    WechatSubscribeMessagesModule,
    BrandProfilesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ProductionSeedService,
    DevelopmentAuthSeedService,
    DevelopmentDemoSeedService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    ThrottlerCleanupService,
  ],
})
export class AppModule {}
