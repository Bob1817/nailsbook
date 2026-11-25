import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { eraseAccountData, findAccountBlockers } from './account-erasure.util';

type AccountType = 'client' | 'technician';
@Injectable()
export class AccountDeletionService {
  constructor(private readonly prisma: PrismaService, private readonly chat: ChatGateway) {}

  private event(row: any, action: string, actor: string, note: string) {
    return JSON.stringify([...JSON.parse(row?.events || '[]'), { action, actor, note, at: new Date().toISOString() }]);
  }

  async blockers(tx: Prisma.TransactionClient, type: AccountType, id: number) {
    return findAccountBlockers(tx, type, id);
  }

  async own(type: AccountType, id: number) {
    const [request, blockers] = await Promise.all([
      this.prisma.accountDeletionRequest.findUnique({ where: { accountType_accountId: { accountType: type, accountId: id } } }),
      this.blockers(this.prisma, type, id),
    ]);
    return { request, blockers };
  }

  async submit(type: AccountType, id: number, reason: string) {
    return this.prisma.$transaction(async tx => {
      const key = { accountType_accountId: { accountType: type, accountId: id } };
      const existing = await tx.accountDeletionRequest.findUnique({ where: key });
      if (existing?.status === 'pending' || existing?.status === 'completed') return existing;
      const account = type === 'client' ? await tx.clientUser.findUnique({ where: { id } }) : await tx.technician.findUnique({ where: { id } });
      if (!account || account.status === 'deleted') throw new BadRequestException('账号不可申请注销');
      const blockers = await this.blockers(tx, type, id);
      if (blockers.length) throw new ConflictException(blockers.join('；'));
      const data = { status: 'pending', reason: reason.trim(), decision: null, reviewerId: null, processedAt: null, requestedAt: new Date(), events: this.event(existing, 'submitted', type + ':' + id, reason.trim()) };
      return tx.accountDeletionRequest.upsert({ where: key, create: { accountType: type, accountId: id, ...data }, update: data });
    });
  }

  async cancel(type: AccountType, id: number) {
    return this.prisma.$transaction(async tx => {
      const row = await tx.accountDeletionRequest.findUnique({ where: { accountType_accountId: { accountType: type, accountId: id } } });
      if (!row || row.status !== 'pending') throw new ConflictException('申请已处理或不可撤回');
      return tx.accountDeletionRequest.update({ where: { id: row.id }, data: { status: 'cancelled', processedAt: new Date(), events: this.event(row, 'cancelled', type + ':' + id, '本人撤回') } });
    });
  }

  async list(page: number) {
    const [list, total] = await this.prisma.$transaction([
      this.prisma.accountDeletionRequest.findMany({ orderBy: { requestedAt: 'desc' }, skip: (page - 1) * 20, take: 20 }),
      this.prisma.accountDeletionRequest.count(),
    ]);
    return { list, total };
  }

  async detail(id: number) {
    const request = await this.prisma.accountDeletionRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('申请不存在');
    const type = request.accountType as AccountType;
    const account = type === 'client'
      ? await this.prisma.clientUser.findUnique({ where: { id: request.accountId }, select: { nickname: true, phone: true, status: true } })
      : await this.prisma.technician.findUnique({ where: { id: request.accountId }, select: { name: true, phone: true, status: true } });
    return { request, account, blockers: await this.blockers(this.prisma, type, request.accountId) };
  }

  async review(id: number, adminId: number, action: 'complete' | 'reject', note: string, identityVerified: boolean) {
    if (action === 'complete' && !identityVerified) throw new BadRequestException('必须先完成人工身份核验');
    const result = await this.prisma.$transaction(async tx => {
      const row = await tx.accountDeletionRequest.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('申请不存在');
      if (row.status !== 'pending') throw new ConflictException('申请状态已变化，请刷新');
      const type = row.accountType as AccountType;
      if (action === 'complete') {
        const blockers = await this.blockers(tx, type, row.accountId);
        if (blockers.length) throw new ConflictException(blockers.join('；'));
        await this.erase(tx, type, row.accountId);
      }
      const updated = await tx.accountDeletionRequest.update({ where: { id }, data: {
        status: action === 'complete' ? 'completed' : 'rejected', decision: note.trim(), reviewerId: adminId,
        processedAt: new Date(), events: this.event(row, action, 'admin:' + adminId, note.trim()),
      } });
      await tx.operationLog.create({ data: { adminUserId: adminId, module: 'account-deletion', action, targetType: type, targetId: row.accountId, afterData: JSON.stringify({ requestId: id, decision: note.trim(), identityVerified }) } });
      return updated;
    });
    if (result.status === 'completed') {
      try { this.chat.server?.in(`account:${result.accountType}:${result.accountId}`).disconnectSockets(true); } catch { /* 数据库处理已完成，连接将在下次校验时失效 */ }
    }
    return result;
  }

  private async erase(tx: Prisma.TransactionClient, type: AccountType, id: number) {
    return eraseAccountData(tx, type, id);
  }
}
