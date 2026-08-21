import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const VALID_REASONS = ['spam', 'inappropriate', 'harassment', 'other'];

@Injectable()
export class ClientReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(params: {
    commentId: number;
    reporterId: number;
    reporterType: 'client';
    reason: string;
  }) {
    if (!VALID_REASONS.includes(params.reason)) {
      throw new BadRequestException('无效的举报原因');
    }

    const comment = await this.prisma.nailWorkComment.findUnique({
      where: { id: params.commentId },
    });
    if (!comment) throw new BadRequestException('评论不存在');

    // Unique constraint (commentId, reporterId, reporterType) handles duplicates
    try {
      await this.prisma.nailWorkReport.create({
        data: {
          commentId: params.commentId,
          reporterId: params.reporterId,
          reporterType: params.reporterType,
          reason: params.reason,
          status: 'pending',
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        return { success: true, alreadyReported: true };
      }
      throw e;
    }

    return { success: true, alreadyReported: false };
  }
}
