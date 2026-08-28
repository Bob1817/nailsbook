import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isLaunchTechnician } from './miniprogram-launch-mode';

export class WorkShareRegistrationDto {
  @IsOptional() @IsInt() @Min(1)
  shareWorkId?: number;
  @IsOptional() @IsString() @Matches(/^[a-f0-9]{48}$/)
  shareToken?: string;
  @IsOptional() @IsIn(['wechat_share', 'wechat_moments'])
  shareChannel?: string;
  @IsOptional() @IsString() @MaxLength(64)
  shareVisitorId?: string;
}

// 只能由实际新建客户的注册分支调用；已有用户登录不得调用。
export async function recordWorkShareRegistration(db: Prisma.TransactionClient, clientId: number, source: WorkShareRegistrationDto) {
  if (!source.shareWorkId) return;
  try {
    const work = await db.nailWork.findFirst({
      where: { id: source.shareWorkId, isVisible: true, archivedAt: null, publicationStatus: 'approved',
        technician: { status: { in: ['active', 'inactive'] } },
        ...(source.shareToken ? { shareGrants: { some: { token: source.shareToken,
          revokedAt: null, expiresAt: { gt: new Date() }, access: { canView: true, canShare: true } } } } : { visibilityScope: 'public' }),
      },
      select: { id: true, techId: true },
    });
    if (!work || !isLaunchTechnician(work.techId)) return;
    await db.conversionEvent.upsert({
      where: { eventId: `work-registration-${clientId}` },
      create: { eventId: `work-registration-${clientId}`, eventType: 'registration_completed',
        clientUserId: clientId, workId: work.id, technicianId: work.techId,
        visitorId: source.shareVisitorId || null, source: source.shareChannel || 'wechat_share' },
      update: {},
    });
  } catch {
    // 归因失败不将已创建的账号伪装成注册失败，也不输出令牌或个人信息。
    Logger.warn('作品分享注册归因记录失败', 'WorkShareRegistration');
  }
}
