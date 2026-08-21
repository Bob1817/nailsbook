import { Global, Module } from '@nestjs/common';
import { VerificationCodeService } from './verification-code.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [VerificationCodeService],
  exports: [VerificationCodeService],
})
export class VerificationCodeModule {}
