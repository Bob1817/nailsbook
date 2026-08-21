import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GrantConsentDto } from './dto/manage-consent.dto';
@Injectable()
export class PublicationConsentsService {
  constructor(private readonly prisma: PrismaService) {}
  async grant(clientUserId: number, dto: GrantConsentDto) {
    if (dto.displayIdentity === 'nickname' && !dto.displayName?.trim())
      throw new BadRequestException('选择昵称展示时必须填写昵称');
    if (dto.contentType === 'review_publication') {
      const review = await this.prisma.serviceReview.findFirst({
        where: { id: dto.contentId, clientUserId },
        select: { id: true },
      });
      if (!review) throw new NotFoundException('评价不存在');
    }
    if (dto.contentType === 'work_photo') {
      const work = await this.prisma.nailWork.findFirst({
        where: {
          id: dto.contentId,
          clientAccesses: { some: { clientUserId } },
        },
        select: { id: true },
      });
      if (!work) throw new NotFoundException('作品不存在或不属于当前客户');
    }
    const now = new Date();
    return this.prisma.publicationConsent.upsert({
      where: {
        contentType_contentId: {
          contentType: dto.contentType,
          contentId: dto.contentId,
        },
      },
      create: {
        clientUserId,
        contentType: dto.contentType,
        contentId: dto.contentId,
        reviewId:
          dto.contentType === 'review_publication' ? dto.contentId : null,
        displayIdentity: dto.displayIdentity,
        displayName:
          dto.displayIdentity === 'nickname' ? dto.displayName?.trim() : null,
        acquisitionMethod: dto.acquisitionMethod,
        grantedAt: now,
      },
      update: {
        clientUserId,
        displayIdentity: dto.displayIdentity,
        displayName:
          dto.displayIdentity === 'nickname' ? dto.displayName?.trim() : null,
        acquisitionMethod: dto.acquisitionMethod,
        grantedAt: now,
        revokedAt: null,
      },
    });
  }
  async revoke(clientUserId: number, id: number) {
    const consent = await this.prisma.publicationConsent.findFirst({
      where: { id, clientUserId },
    });
    if (!consent) throw new NotFoundException('授权记录不存在');
    return this.prisma.$transaction(async (tx) => {
      const revoked = await tx.publicationConsent.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
      if (consent.contentType === 'review_publication')
        await tx.serviceReview.update({
          where: { id: consent.contentId },
          data: { photoUseAuthorized: false, photoUseAuthorizedAt: null },
        });
      if (consent.contentType === 'work_photo')
        await tx.nailWork.update({
          where: { id: consent.contentId },
          data: {
            publicAuthorizationStatus: 'revoked',
            assetStatus: 'internal',
            isVisible: false,
          },
        });
      return revoked;
    });
  }
  list(clientUserId: number) {
    return this.prisma.publicationConsent.findMany({
      where: { clientUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeAll(clientUserId: number) {
    const active = await this.prisma.publicationConsent.findMany({
      where: { clientUserId, revokedAt: null },
      select: { contentType: true, contentId: true },
    });
    const reviewIds = active
      .filter((item) => item.contentType === 'review_publication')
      .map((item) => item.contentId);
    const workIds = active
      .filter((item) => item.contentType === 'work_photo')
      .map((item) => item.contentId);
    const revokedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.publicationConsent.updateMany({
        where: { clientUserId, revokedAt: null },
        data: { revokedAt },
      }),
      this.prisma.serviceReview.updateMany({
        where: { id: { in: reviewIds } },
        data: { photoUseAuthorized: false, photoUseAuthorizedAt: null },
      }),
      this.prisma.nailWork.updateMany({
        where: { id: { in: workIds } },
        data: {
          publicAuthorizationStatus: 'revoked',
          assetStatus: 'internal',
          isVisible: false,
        },
      }),
    ]);
    return { revokedCount: active.length, revokedAt };
  }
}
