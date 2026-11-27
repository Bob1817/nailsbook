const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const servicesData = [
  {
    name: '裸色 / 实色美甲',
    description: '纯色/实色款式。所有款式均含极致建构、前置精致处理，照灯前可随时调整。',
    category: 'color_style',
    price: 168,
    durationMinutes: 90,
    depositMode: 'fixed',
    depositValue: 3000,
    sortOrder: 1
  },
  {
    name: '简单款设计',
    description: '猫眼·跳色·单色腮红·单色渐变·贴纸·简单小钻·简单手绘等。含极致建构与精致处理。',
    category: 'color_style',
    price: 238,
    durationMinutes: 120,
    depositMode: 'fixed',
    depositValue: 3000,
    sortOrder: 2
  },
  {
    name: '复杂款设计',
    description: '极单·法式·钢珠款拼钻·复杂手绘·多色晕染·水彩·雕花·蹭粉等。含极致建构与精致处理。',
    category: 'color_style',
    price: 298,
    durationMinutes: 150,
    depositMode: 'fixed',
    depositValue: 3000,
    sortOrder: 3
  },
  {
    name: '极复杂款式（按图报价）',
    description: '高阶孤品定制/重工微雕手绘/特殊复杂款，看图单独报价。含极致建构与精致处理。',
    category: 'color_style',
    price: 388,
    durationMinutes: 180,
    depositMode: 'fixed',
    depositValue: 3000,
    sortOrder: 4
  },
  {
    name: '甲片延长（浅贴 / 半贴）',
    description: '全手甲片延长（浅贴/半贴），修型加固。',
    category: 'extension_reinforcement',
    price: 120,
    durationMinutes: 60,
    depositMode: 'none',
    depositValue: 0,
    sortOrder: 5
  },
  {
    name: '甲膜延长',
    description: '全手甲膜无痕延长，轻薄服帖。',
    category: 'extension_reinforcement',
    price: 140,
    durationMinutes: 60,
    depositMode: 'none',
    depositValue: 0,
    sortOrder: 6
  },
  {
    name: '纸托延长',
    description: '全手专业纸托光疗/水晶延长，精准雕塑游离线弧度。',
    category: 'extension_reinforcement',
    price: 298,
    durationMinutes: 90,
    depositMode: 'none',
    depositValue: 0,
    sortOrder: 7
  },
  {
    name: '水晶延长',
    description: '全手高阶水晶雕塑延长，坚固透亮。',
    category: 'extension_reinforcement',
    price: 388,
    durationMinutes: 120,
    depositMode: 'none',
    depositValue: 0,
    sortOrder: 8
  },
  {
    name: '单指调整 / 延长',
    description: '单指残甲调整、断甲修补或单指单独延长（¥10-30/指）。',
    category: 'extension_reinforcement',
    price: 20,
    durationMinutes: 20,
    depositMode: 'none',
    depositValue: 0,
    sortOrder: 9
  },
  {
    name: '卸甲服务（本甲 / 甲片）',
    description: '专业物理安全打磨卸甲。注：凡在听栖工作室消费做款，卸甲免费；单独卸甲正常收费（本甲¥20 / 甲片¥30）。',
    category: 'removal',
    price: 20,
    durationMinutes: 30,
    depositMode: 'none',
    depositValue: 0,
    sortOrder: 10
  },
  {
    name: '美足 单色',
    description: '足部精致死皮修护 + 纯色凝胶美甲。',
    category: 'color_style',
    price: 258,
    durationMinutes: 90,
    depositMode: 'fixed',
    depositValue: 3000,
    sortOrder: 11
  },
  {
    name: '美足 猫眼',
    description: '足部精致修护 + 宽光/极光磁吸猫眼凝胶。',
    category: 'color_style',
    price: 298,
    durationMinutes: 100,
    depositMode: 'fixed',
    depositValue: 3000,
    sortOrder: 12
  },
  {
    name: '美足 款式设计（按图定价）',
    description: '足部个性款式/晕染/贴钻设计，看图定价。',
    category: 'color_style',
    price: 358,
    durationMinutes: 120,
    depositMode: 'fixed',
    depositValue: 3000,
    sortOrder: 13
  }
];

const bookingNotes = [
  '【听栖美甲工作室 · 预约与就诊须知】',
  '1. 本工作室为预约制，请提前一至两天预约，空降随缘。',
  '2. 预约定金 ¥30，迟到 1 小时或取消不退；如需调整，可提前一天协商改期。',
  '3. 本店均为一口价，无隐形消费；照灯前可随时提出修改，切勿勉强。',
  '4. 看图报价，如需改动原图需重新报价。',
  '5. 全程约 2-4 小时（延长 3.5 小时起），精致度与时间成正比，请预留充足时间。',
  '6. 售后保障：7天内非人为原因免费修补。',
  '7. 凡在听栖工作室消费做款，卸甲免费；单独卸甲正常收费。施华洛世奇钻饰单独报价。',
  '8. 营业时间：10:00 - 21:00（21:00 后预约另加服务费）。'
].join('\n');

const servicePhilosophy = '中国美院本硕毕业，专注于精致处理与本甲建构。一口价无隐形消费，让美甲回归安心与艺术。';

async function run() {
  const tech = await prisma.technician.findUnique({ where: { phone: '15267003169' } });
  if (!tech) {
    console.error('Technician 15267003169 not found!');
    return;
  }
  const techId = tech.id;
  console.log('Found technician ID:', techId, 'Name:', tech.name);

  // 1. 归档已有的旧服务
  await prisma.service.updateMany({
    where: { technicianId: techId },
    data: { archivedAt: new Date(), isBookable: false }
  });
  console.log('Archived existing services.');

  // 2. 批量创建 13 项新服务
  const createdServices = [];
  for (const s of servicesData) {
    const publicId = `svc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const created = await prisma.service.create({
      data: {
        publicId,
        technicianId: techId,
        name: s.name,
        description: s.description,
        category: s.category,
        durationMinutes: s.durationMinutes,
        priceType: 'fixed',
        priceMinFen: s.price * 100,
        priceMaxFen: s.price * 100,
        isBookable: true,
        sortOrder: s.sortOrder,
        depositMode: s.depositMode,
        depositValue: s.depositValue
      }
    });
    createdServices.push({
      id: publicId,
      name: s.name,
      description: s.description,
      category: s.category,
      price: s.price,
      durationMinutes: s.durationMinutes,
      isActive: true,
      sortOrder: s.sortOrder,
      depositMode: s.depositMode,
      depositValue: s.depositValue,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    });
  }
  console.log(`Successfully created ${createdServices.length} services.`);

  // 3. 更新 Technician 表
  await prisma.technician.update({
    where: { id: techId },
    data: {
      serviceItems: JSON.stringify(createdServices),
      depositMode: 'fixed',
      depositValue: 3000,
      bookingNotes: bookingNotes,
      servicePhilosophy: servicePhilosophy,
      isVerified: true,
      verifiedAt: new Date()
    }
  });

  console.log('Technician 15267003169 profile and services updated successfully!');
}

run()
  .catch((err) => {
    console.error('Update failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
