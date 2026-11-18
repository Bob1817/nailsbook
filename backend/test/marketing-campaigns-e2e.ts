import { PrismaClient } from '@prisma/client';
import { MarketingCampaignsService } from '../src/marketing-campaigns/marketing-campaigns.service';
import { ClientHomeService } from '../src/client-home/client-home.service';

const prisma = new PrismaClient();

async function runE2ETest() {
  console.log('=== 开始营销活动与通知发布端到端集成测试 ===');

  // 1. 初始化测试美甲师与绑定客户
  const tech = await prisma.technician.create({
    data: {
      name: '自动化测试美甲师',
      phone: `test-mkt-tech-${Date.now()}`,
      status: 'active',
      invitationCode: `MKT${Math.floor(1000 + Math.random() * 9000)}`,
    },
  });

  const client1 = await prisma.clientUser.create({
    data: { phone: `test-mkt-c1-${Date.now()}`, nickname: '客户1' },
  });
  const client2 = await prisma.clientUser.create({
    data: { phone: `test-mkt-c2-${Date.now()}`, nickname: '客户2' },
  });

  // 绑定两个有效客户
  await prisma.clientTechBinding.createMany({
    data: [
      { clientId: client1.id, techId: tech.id, status: 'active', bindSource: 'e2e' },
      { clientId: client2.id, techId: tech.id, status: 'active', bindSource: 'e2e' },
    ],
  });

  const chatGatewayMock = {
    broadcastMessage: () => {},
    server: { to: () => ({ emit: () => {} }) },
  };

  const marketingService = new MarketingCampaignsService(prisma as any, chatGatewayMock as any);
  const homeService = new ClientHomeService(prisma as any);

  try {
    // 2. 检查覆盖人数统计
    const coverage = await marketingService.getNoticeCoverageCount(tech.id);
    console.log(`[1] 检查美甲师绑定客户覆盖人数: 期望 2, 实际 ${coverage.coveredCount}`);
    if (coverage.coveredCount !== 2) throw new Error('客户覆盖数不正确');

    // 3. 测试【通知即时发布】
    console.log('[2] 测试通知即时发布...');
    const notice = await marketingService.createNotice(tech.id, {
      title: '端午节放假与预约通知',
      content: '端午节期间正常营业，欢迎各位小姐姐提前预约档期～',
      isDraft: false,
    });
    if (!notice || notice.status !== 'published' || !notice.publishedAt) {
      throw new Error('通知即时发布状态错误');
    }

    // 检查是否给绑定的2个客户都创建了会话与系统消息
    const messages = await prisma.message.findMany({
      where: {
        senderId: tech.id,
        senderType: 'technician',
        relatedType: 'notice',
        relatedId: notice.id,
      },
    });
    console.log(`[3] 检查通知下发站内信消息: 期望 2 条, 实际 ${messages.length} 条`);
    if (messages.length !== 2) throw new Error('通知站内信下发数量不符合预期');
    if (messages[0].messageType !== 'notice') throw new Error('消息类型必须为 notice');

    // 4. 测试【通知定时发布】
    console.log('[4] 测试通知定时发布与调度执行...');
    const futureTime = new Date(Date.now() + 86400000).toISOString();
    const scheduledNotice = await marketingService.createNotice(tech.id, {
      title: '定时通知测试',
      content: '这是一条定时触发的通知',
      isScheduled: true,
      scheduledAt: futureTime,
      isDraft: false,
    });
    if (!scheduledNotice || scheduledNotice.status !== 'scheduled') {
      throw new Error('未来/未执行的定时通知状态应为 scheduled');
    }

    // 模拟时间流逝到已到期
    await prisma.technicianNotice.update({
      where: { id: scheduledNotice.id },
      data: { scheduledAt: new Date(Date.now() - 5000) },
    });

    // 触发定时调度
    const schedulerResult = await marketingService.handleScheduledAndExpiredJobs();
    console.log(`[5] 调度器处理结果: 发布了 ${schedulerResult.dispatchedNotices} 个定时通知`);
    const afterSchedule = await prisma.technicianNotice.findUnique({
      where: { id: scheduledNotice.id },
    });
    if (afterSchedule?.status !== 'published') {
      throw new Error('定时调度未成功将通知转为 published');
    }

    // 5. 测试【活动发布与富文本模块】
    console.log('[6] 测试活动发布与推荐至客户端首页 Hero...');
    const activity = await marketingService.createActivity(tech.id, {
      title: '夏季新款美甲尝鲜立减30元',
      coverUrl: 'https://example.com/summer-promo.jpg',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 86400000 * 7).toISOString(), // 7天有效
      recommendToHero: true,
      contentBlocks: JSON.stringify([
        { type: 'text', title: '活动详情', content: '夏日特惠专场，多款爆款美甲任选！' },
        { type: 'image', url: 'https://example.com/detail1.jpg', caption: '法式晕染猫眼' },
      ]),
      isDraft: false,
    });
    if (!activity || activity.status !== 'active') throw new Error('活动发布状态应为 active');

    // 检查活动消息是否已推送到客户消息列表
    const actMessages = await prisma.message.findMany({
      where: {
        senderId: tech.id,
        relatedType: 'activity',
        relatedId: activity.id,
      },
    });
    console.log(`[7] 检查活动消息下发: 期望 2 条, 实际 ${actMessages.length} 条`);
    if (actMessages.length !== 2) throw new Error('活动消息下发数量不符合预期');
    if (actMessages[0].messageType !== 'activity') throw new Error('消息类型必须为 activity');

    // 6. 测试【客户端首页 Hero 融合】
    console.log('[8] 测试客户端首页 Hero 数据聚合...');
    const homeData = await homeService.getHome(client1.id);
    const heroActivities = (homeData.works || []).filter((w: any) => w.isActivity);
    console.log(`[9] 客户端首页 Hero 中的活动数量: ${heroActivities.length}`);
    if (heroActivities.length === 0) throw new Error('客户端首页 Hero 未聚合到已发布的活动');
    if (heroActivities[0].title !== '夏季新款美甲尝鲜立减30元') {
      throw new Error('Hero 中的活动标题不匹配');
    }

    // 7. 测试【历史活动复制再发】
    console.log('[10] 测试历史活动一键复制为草稿...');
    const copied = await marketingService.copyActivity(tech.id, activity.id);
    if (!copied.title.includes('夏季新款美甲尝鲜立减30元') || copied.status !== 'draft') {
      throw new Error('复制的活动应该为草稿且保留原标题');
    }
    const blocks = JSON.parse(copied.contentBlocks);
    if (blocks.length !== 2) throw new Error('复制的活动图文模块数量不匹配');
    console.log('[11] 历史活动复制成功！');

    // 8. 测试【活动到期自动从 Hero 撤下】
    console.log('[12] 测试活动过期后自动从 Hero 撤下...');
    await prisma.technicianActivity.update({
      where: { id: activity.id },
      data: { endTime: new Date(Date.now() - 10000) }, // 设为过去时间
    });
    const expireResult = await marketingService.handleScheduledAndExpiredJobs();
    console.log(`[13] 调度器过期处理: 自动撤下了 ${expireResult.expiredActivities} 个过期活动`);
    const expiredAct = await prisma.technicianActivity.findUnique({
      where: { id: activity.id },
    });
    if (expiredAct?.recommendToHero !== false) {
      throw new Error('过期活动未能从 Hero 撤下');
    }

    const homeDataAfterExpire = await homeService.getHome(client1.id);
    const heroAfter = (homeDataAfterExpire.works || []).filter((w: any) => w.isActivity);
    if (heroAfter.some((w: any) => w.id === activity.id)) {
      throw new Error('已撤下的活动依然出现在了 Hero 中');
    }
    console.log('[14] 过期活动已成功从 Hero 中自动移除！');

    console.log('\n🎉🎉🎉 所有营销功能端到端集成测试全部通过！🎉🎉🎉');
  } finally {
    // 完整安全清理测试数据
    await prisma.technicianNotice.deleteMany({ where: { technicianId: tech.id } });
    await prisma.technicianActivity.deleteMany({ where: { technicianId: tech.id } });
    await prisma.message.deleteMany({ where: { senderId: tech.id } });
    await prisma.conversation.deleteMany({
      where: {
        OR: [{ techId: tech.id }, { clientId: { in: [client1.id, client2.id] } }],
      },
    });
    await prisma.clientTechBinding.deleteMany({ where: { techId: tech.id } });
    await prisma.clientUser.deleteMany({ where: { id: { in: [client1.id, client2.id] } } });
    await prisma.technician.delete({ where: { id: tech.id } });
    await prisma.$disconnect();
  }
}

runE2ETest().catch((err) => {
  console.error('测试失败:', err);
  process.exit(1);
});
