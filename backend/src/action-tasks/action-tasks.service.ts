import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateActionTaskDto } from './dto/update-action-task.dto';

type Candidate = {
  taskKey: string;
  type: string;
  title: string;
  description?: string;
  priority: string;
  relatedType: string;
  relatedId: number;
  actionPath: string;
  dueAt?: Date;
};

export const DYNAMIC_ACTION_TASK_TYPES = [
  'new_consultation',
  'overdue_follow_up',
  'pending_booking',
  'today_booking',
  'time_conflict',
  'address_risk',
  'allergy_risk',
  'deposit_pending',
];
@Injectable()
export class ActionTasksService {
  constructor(private readonly prisma: PrismaService) {}
  async today(technicianId: number) {
    const now = new Date(),
      start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const [leads, orders, repurchaseCustomers] = await Promise.all([
      this.prisma.lead.findMany({
        where: {
          technicianId,
          status: { in: ['new', 'following_up', 'paused'] },
        },
        select: {
          id: true,
          nickname: true,
          status: true,
          nextFollowUpAt: true,
          createdAt: true,
        },
      }),
      this.prisma.order.findMany({
        where: {
          technicianId,
          status: {
            notIn: ['completed', 'cancelled', 'expired', 'rejected', 'no_show'],
          },
        },
        include: { intentWorks: { include: { work: true } } },
      }),
      this.prisma.customer.findMany({
        where: {
          technicianId,
          archivedAt: null,
          suggestedMaintenanceAt: { lte: now },
          completedServiceCount: { gt: 0 },
        },
        select: {
          id: true,
          name: true,
          suggestedMaintenanceAt: true,
          lastServiceAt: true,
        },
      }),
    ]);
    const candidates: Candidate[] = [];
    for (const lead of leads) {
      if (lead.status === 'new')
        candidates.push(
          this.leadTask(
            technicianId,
            lead,
            'new_consultation',
            '新咨询待处理',
            'high',
          ),
        );
      if (lead.nextFollowUpAt && lead.nextFollowUpAt < now)
        candidates.push(
          this.leadTask(
            technicianId,
            lead,
            'overdue_follow_up',
            '线索跟进已逾期',
            'urgent',
            lead.nextFollowUpAt,
          ),
        );
    }
    for (const customer of repurchaseCustomers) {
      const dormant = Boolean(
        customer.suggestedMaintenanceAt &&
        now.getTime() - customer.suggestedMaintenanceAt.getTime() >=
          28 * 86400000,
      );
      candidates.push({
        taskKey: `${technicianId}:repurchase_contact:customer:${customer.id}:${customer.lastServiceAt?.toISOString() || 'none'}`,
        type: 'repurchase_contact',
        title: dormant ? '沉睡客户复购联系' : '客户待复购联系',
        description: customer.name,
        priority: dormant ? 'normal' : 'high',
        relatedType: 'customer',
        relatedId: customer.id,
        actionPath: `/pages/technician/customer-detail/index?id=${customer.id}`,
        dueAt: customer.suggestedMaintenanceAt ?? undefined,
      });
    }
    for (const order of orders) {
      const path = `/pages/technician/order-detail/index?id=${order.id}`;
      if (order.bookingPhase === 'application')
        candidates.push(
          this.orderTask(
            technicianId,
            order,
            'pending_booking',
            '预约申请待确认',
            'high',
            path,
          ),
        );
      if (
        order.bookingPhase === 'booking' &&
        order.startTime >= start &&
        order.startTime < end
      )
        candidates.push(
          this.orderTask(
            technicianId,
            order,
            'today_booking',
            '今日预约',
            'high',
            path,
            order.startTime,
          ),
        );
      if (!order.address)
        candidates.push(
          this.orderTask(
            technicianId,
            order,
            'address_risk',
            '服务地址未确认',
            'urgent',
            path,
          ),
        );
      if ((order.depositAmount || 0) > 0 && !order.isDepositPaid)
        candidates.push(
          this.orderTask(
            technicianId,
            order,
            'deposit_pending',
            '定金待记录',
            'high',
            path,
          ),
        );
      const text = [
        order.remark,
        order.customDescription,
        ...order.intentWorks.map((x) => JSON.stringify(x.work)),
      ]
        .filter(Boolean)
        .join(' ');
      if (/过敏|敏感/i.test(text))
        candidates.push(
          this.orderTask(
            technicianId,
            order,
            'allergy_risk',
            '存在过敏风险',
            'urgent',
            path,
          ),
        );
    }
    const confirmed = orders.filter((o) =>
      ['pending_home', 'pending_shop', 'in_progress'].includes(o.status),
    );
    for (let i = 0; i < confirmed.length; i++)
      for (let j = i + 1; j < confirmed.length; j++)
        if (
          confirmed[i].startTime < confirmed[j].endTime &&
          confirmed[i].endTime > confirmed[j].startTime
        )
          candidates.push(
            this.orderTask(
              technicianId,
              confirmed[i],
              'time_conflict',
              '预约时间存在冲突',
              'urgent',
              `/pages/technician/order-detail/index?id=${confirmed[i].id}`,
            ),
          );
    const activeKeys = candidates.map((x) => x.taskKey);
    await this.prisma.$transaction(async (tx) => {
      for (const c of candidates)
        await tx.actionTask.upsert({
          where: { taskKey: c.taskKey },
          create: { technicianId, ...c },
          update: {
            title: c.title,
            description: c.description,
            priority: c.priority,
            dueAt: c.dueAt,
            actionPath: c.actionPath,
          },
        });
      await tx.actionTask.updateMany({
        where: {
          technicianId,
          status: 'pending',
          type: { in: DYNAMIC_ACTION_TASK_TYPES },
          taskKey: { notIn: activeKeys },
        },
        data: { status: 'completed', resolvedAt: now },
      });
    });
    return this.prisma.actionTask.findMany({
      where: {
        technicianId,
        OR: [
          { status: 'pending' },
          { status: 'snoozed', remindAt: { lte: now } },
        ],
      },
      orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
    });
  }
  async update(technicianId: number, id: number, dto: UpdateActionTaskDto) {
    const task = await this.prisma.actionTask.findFirst({
      where: { id, technicianId },
    });
    if (!task) throw new NotFoundException('行动任务不存在');
    if (dto.status === 'snoozed' && !dto.remindAt)
      throw new BadRequestException('稍后提醒必须设置提醒时间');
    return this.prisma.actionTask.update({
      where: { id },
      data: {
        status: dto.status,
        remindAt: dto.remindAt ? new Date(dto.remindAt) : null,
        resolvedAt: ['completed', 'ignored'].includes(dto.status)
          ? new Date()
          : null,
      },
    });
  }
  private leadTask(
    t: number,
    x: any,
    type: string,
    title: string,
    priority: string,
    dueAt?: Date,
  ): Candidate {
    return {
      taskKey: `${t}:${type}:lead:${x.id}`,
      type,
      title,
      description: x.nickname || '匿名咨询',
      priority,
      relatedType: 'lead',
      relatedId: x.id,
      actionPath: `/pages/technician/lead-detail/index?id=${x.id}`,
      dueAt,
    };
  }
  private orderTask(
    t: number,
    x: any,
    type: string,
    title: string,
    priority: string,
    path: string,
    dueAt?: Date,
  ): Candidate {
    return {
      taskKey: `${t}:${type}:order:${x.id}`,
      type,
      title,
      description: x.customer?.name || x.remark || `预约 #${x.id}`,
      priority,
      relatedType: 'order',
      relatedId: x.id,
      actionPath: path,
      dueAt,
    };
  }
}
