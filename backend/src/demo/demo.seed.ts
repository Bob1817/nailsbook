import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma/prisma.service';

export const DEMO_SEED_VERSION = '2026-11-26.1';
export const DEMO_FEATURE_FLAG_CODE = 'demo_mode_enabled';

export const SHOWCASE_TECHNICIAN_PHONE = '19900000011';
export const DEMO_TECHNICIAN_PHONE = '19900000012';
export const DEMO_CLIENT_PHONE = '19900000099';

export interface DemoWorkSeed {
  title: string;
  description: string;
  price: number;
  durationMinutes: number;
  styleTag: string;
  coverUrl: string;
  sortOrder: number;
}

export const SHOWCASE_WORKS: DemoWorkSeed[] = [
  {
    title: '月光猫眼极简法式',
    description: '高透裸粉打底配极细白法式边，指尖带细腻玻璃珠猫眼光泽，日常通勤百搭。',
    price: 238,
    durationMinutes: 90,
    styleTag: '法式',
    coverUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80',
    sortOrder: 1,
  },
  {
    title: '日系透色晕染琥珀',
    description: '多层次茶色透胶晕染叠加金箔碎贝壳，显白柔和，适合秋冬叠搭毛衣。',
    price: 268,
    durationMinutes: 105,
    styleTag: '日式',
    coverUrl: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=900&q=80',
    sortOrder: 2,
  },
  {
    title: '清冷冰透碎钻水波纹',
    description: '透明立体水波纹塑形配合细闪碎钻，阳光下折射清透水光感。',
    price: 298,
    durationMinutes: 110,
    styleTag: '冰透',
    coverUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=900&q=80',
    sortOrder: 3,
  },
  {
    title: '杏仁甲纯欲腮红渐变',
    description: '原生甲修型或短甲延长皆可，蜜桃腮红中心晕染，温柔减龄。',
    price: 188,
    durationMinutes: 75,
    styleTag: '纯欲',
    coverUrl: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=80',
    sortOrder: 4,
  },
  {
    title: '极简雾面燕麦纯色',
    description: '高级低饱和燕麦色配合绒雾封层与单指微立体银线，耐看克制。',
    price: 158,
    durationMinutes: 60,
    styleTag: '简约',
    coverUrl: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=900&q=80',
    sortOrder: 5,
  },
  {
    title: '美拉德焦糖猫眼跳色',
    description: '深棕焦糖与香槟金猫眼跳色组合，带微粒磁粉光圈，显手白。',
    price: 218,
    durationMinutes: 85,
    styleTag: '猫眼',
    coverUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
    sortOrder: 6,
  },
  {
    title: '新娘珍珠轻奢钻饰款',
    description: '乳白透底搭配施华洛小颗平底钻与异形淡水珍珠，拍照上镜不勾发。',
    price: 388,
    durationMinutes: 135,
    styleTag: '新娘',
    coverUrl: 'https://images.unsplash.com/photo-1515688594390-b649af70d282?auto=format&fit=crop&w=900&q=80',
    sortOrder: 7,
  },
  {
    title: '手绘复古格纹小香风',
    description: '全手绘奶白格纹与细金链点缀，精致名媛气质。',
    price: 328,
    durationMinutes: 120,
    styleTag: '手绘',
    coverUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80',
    sortOrder: 8,
  },
  {
    title: '海盐蓝玻璃纸渐变',
    description: '清透灰蓝底色内嵌极光玻璃纸碎片，清爽通透不挑肤色。',
    price: 248,
    durationMinutes: 95,
    styleTag: '清透',
    coverUrl: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80',
    sortOrder: 9,
  },
  {
    title: '本甲建构延长+极简银边',
    description: '包含轻薄建构塑形、游离缘矫正与极细镜面银描边，持久度可达 4 周+。',
    price: 428,
    durationMinutes: 150,
    styleTag: '建构',
    coverUrl: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=900&q=80',
    sortOrder: 10,
  },
];

export const DEMO_SERVICE_ITEMS = [
  {
    id: 'demo_svc_base_care',
    name: '精致修形与前置护理',
    description: '日式干湿结合去死皮、指缘抛光与基础加固',
    category: 'basic_care',
    price: 68,
    durationMinutes: 30,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'demo_svc_gel_color',
    name: '纯色 / 渐变 / 猫眼款',
    description: '进口环保甲油胶，含基础建构流平',
    category: 'gel_color',
    price: 158,
    durationMinutes: 60,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'demo_svc_design',
    name: '手绘晕染与法式设计',
    description: '含 2-4 指复杂手绘、晕染、贝壳或极细法式',
    category: 'design',
    price: 238,
    durationMinutes: 90,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'demo_svc_extension',
    name: '全手无痛延长 / 本甲卸除',
    description: '轻薄半贴/纸托延长或温和卸甲养护',
    category: 'extension',
    price: 120,
    durationMinutes: 45,
    isActive: true,
    sortOrder: 4,
  },
];

const DEMO_CLIENTS = [
  {
    name: '小林（演示）',
    phone: '19900000101',
    tags: JSON.stringify(['短圆甲', '偏好裸色透胶', '指缘偏薄敏感']),
    notes: '【演示档案】左手中指游离缘较短，打磨机需调低转速；偏爱低饱和裸粉色与极细法式。',
  },
  {
    name: '苏苏（演示）',
    phone: '19900000102',
    tags: JSON.stringify(['杏仁甲', '猫眼控', '忌重香精护手霜']),
    notes: '【演示档案】喜欢玻璃珠猫眼和清冷冰透款，做完后无需涂抹有香味的指缘油。',
  },
  {
    name: '阿茶（演示）',
    phone: '19900000103',
    tags: JSON.stringify(['方圆甲', '耐看简约风', '每周六上午偏好']),
    notes: '【演示档案】互联网设计师，工作常敲键盘，甲长建议保留 2mm 以内并加强前缘包边。',
  },
  {
    name: '念念（演示）',
    phone: '19900000104',
    tags: JSON.stringify(['新娘备婚', '珍珠饰品', '需提前确认时间']),
    notes: '【演示档案】近期试妆需做温柔奶白珍珠款，右拇指易起翘，需使用强力底胶。',
  },
  {
    name: '初夏（演示）',
    phone: '19900000105',
    tags: JSON.stringify(['扇形甲矫正', '建构需求']),
    notes: '【演示档案】原生甲略微上翘，需重点做高点建构塑形，偏好日系透色晕染。',
  },
  {
    name: '知意（演示）',
    phone: '19900000106',
    tags: JSON.stringify(['老客复购', '上门服务偏好']),
    notes: '【演示档案】通常预约工作日晚上，偏好经典法式或焦糖美拉德色系。',
  },
];

export const DEMO_ORDERS_SPEC = [
  {
    suffix: 'ORD01',
    clientIndex: 0,
    title: '月光猫眼极简法式（含卸甲）',
    serviceType: 'shop',
    status: 'pending_quote',
    price: 268,
    durationHours: 1.5,
    dayOffset: 1,
    hour: 11,
    address: '上海市静安区（演示工作室）',
    remark: '演示订单：客户发来参考图，待美甲师发送快捷报价。',
  },
  {
    suffix: 'ORD02',
    clientIndex: 1,
    title: '清冷冰透碎钻水波纹',
    serviceType: 'shop',
    status: 'pending_confirm',
    price: 298,
    durationHours: 2,
    dayOffset: 1,
    hour: 15,
    address: '上海市静安区（演示工作室）',
    remark: '演示订单：已发报价，等待客户确认预约时段。',
  },
  {
    suffix: 'ORD03',
    clientIndex: 2,
    title: '极简雾面燕麦纯色',
    serviceType: 'shop',
    status: 'confirmed',
    price: 158,
    durationHours: 1,
    dayOffset: 2,
    hour: 10,
    address: '上海市静安区（演示工作室）',
    remark: '演示订单：已确认预约，系统自动提示“敲键盘甲长控制在 2mm 内”。',
  },
  {
    suffix: 'ORD04',
    clientIndex: 3,
    title: '新娘珍珠轻奢钻饰款',
    serviceType: 'home',
    status: 'in_progress',
    price: 388,
    durationHours: 2.5,
    dayOffset: 0,
    hour: 14,
    address: '上海市徐汇区（演示上门区域）',
    remark: '演示订单：服务进行中，右拇指使用强力底胶。',
  },
  {
    suffix: 'ORD05',
    clientIndex: 4,
    title: '日系透色晕染琥珀',
    serviceType: 'shop',
    status: 'completed',
    price: 268,
    durationHours: 2,
    dayOffset: -2,
    hour: 13,
    address: '上海市静安区（演示工作室）',
    remark: '演示订单：已完成服务与建构。',
  },
  {
    suffix: 'ORD06',
    clientIndex: 5,
    title: '美拉德焦糖猫眼跳色',
    serviceType: 'home',
    status: 'completed',
    price: 218,
    durationHours: 1.5,
    dayOffset: -5,
    hour: 19,
    address: '上海市黄浦区（演示上门区域）',
    remark: '演示订单：已完成老客复购服务。',
  },
  {
    suffix: 'ORD07',
    clientIndex: 0,
    title: '杏仁甲纯欲腮红渐变',
    serviceType: 'shop',
    status: 'completed',
    price: 188,
    durationHours: 1.5,
    dayOffset: -10,
    hour: 16,
    address: '上海市静安区（演示工作室）',
    remark: '演示订单：已完成。',
  },
  {
    suffix: 'ORD08',
    clientIndex: 2,
    title: '手绘复古格纹小香风',
    serviceType: 'shop',
    status: 'cancelled',
    price: 328,
    durationHours: 2,
    dayOffset: -3,
    hour: 11,
    address: '上海市静安区（演示工作室）',
    remark: '演示订单：客户改期取消示例。',
  },
];

function buildBusinessHours() {
  return [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
    weekday,
    start: '10:00',
    end: '21:00',
    closed: false,
  }));
}

export async function seedDemoTenant(
  prisma: PrismaService,
  options: {
    phone: string;
    name: string;
    shopName: string;
    invitationCode: string;
    prefix: string;
    demoClientId?: number;
  },
) {
  const passwordHash = await bcrypt.hash('OnlyNailDemo#2026', 10);
  const serviceSchedule = JSON.stringify({
    businessHours: buildBusinessHours(),
  });
  const shopAddresses = JSON.stringify([
    {
      id: `${options.prefix}_shop_1`,
      name: options.shopName,
      address: '上海市静安区（演示样板区域，非真实营业地址）',
      isDefault: true,
    },
  ]);

  let tech = await prisma.technician.findUnique({
    where: { phone: options.phone },
  });

  const techData = {
    name: options.name,
    phone: options.phone,
    passwordHash,
    status: 'active',
    isDemo: true,
    isVerified: true,
    verifiedAt: new Date('2026-11-01T00:00:00Z'),
    invitationCode: options.invitationCode,
    avatarUrl: 'https://lunails.cn/onlynail-logo.jpg',
    coverImageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80',
    city: '上海',
    province: '上海',
    serviceArea: '静安区 / 徐汇区（演示范围）',
    bio: '独立美甲主理人 · 擅长日系透色、极简法式与本甲建构。专注一对一安静预约制服务。',
    servicePhilosophy: '只接预约、不推销办卡，用专属甲型档案记住每一位客人的手感与喜好。',
    bookingNotes: '本主页为 OnlyNail 官方演示样板间：展示作品、报价规则与预约流程，不含任何真实客户隐私信息。',
    styleTags: JSON.stringify(['极简法式', '日系透色', '玻璃珠猫眼', '本甲建构']),
    homeService: true,
    shopService: true,
    shopAddresses,
    serviceItems: JSON.stringify(DEMO_SERVICE_ITEMS),
    homeServiceRadius: 8,
    homeServicePricing: JSON.stringify([
      { minKm: 0, maxKm: 3, price: 30 },
      { minKm: 3, maxKm: 8, price: 60 },
    ]),
    serviceSchedule,
    dailyBookingLimit: 4,
    appointmentBufferMinutes: 30,
    depositMode: 'none',
    depositValue: 0,
    quickBookingEnabled: true,
  };

  if (tech) {
    tech = await prisma.technician.update({
      where: { id: tech.id },
      data: {
        ...techData,
        tokenVersion: { increment: 1 },
      },
    });
  } else {
    tech = await prisma.technician.create({ data: techData });
  }

  // Clean existing tenant child records before re-seeding
  await prisma.message.deleteMany({ where: { conversation: { techId: tech.id } } });
  await prisma.conversation.deleteMany({ where: { techId: tech.id } });
  await prisma.bookingQuoteLine.deleteMany({ where: { bookingQuote: { technicianId: tech.id } } });
  await prisma.bookingQuote.deleteMany({ where: { technicianId: tech.id } });
  await prisma.serviceReview.deleteMany({ where: { technicianId: tech.id } });
  await prisma.customerFollowUp.deleteMany({ where: { technicianId: tech.id } });
  await prisma.blockedTimeSlot.deleteMany({ where: { techId: tech.id } });
  await prisma.technicianNotice.deleteMany({ where: { technicianId: tech.id } });
  await prisma.technicianActivity.deleteMany({ where: { technicianId: tech.id } });
  await prisma.revenue.deleteMany({ where: { technicianId: tech.id } });
  await prisma.order.deleteMany({ where: { technicianId: tech.id } });
  await prisma.nailWork.deleteMany({ where: { techId: tech.id } });
  await prisma.service.deleteMany({ where: { technicianId: tech.id } });
  await prisma.customer.deleteMany({ where: { technicianId: tech.id } });

  // 0. Ensure Demo unlimited subscription so visitors never hit free-tier quota limits
  const demoPlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'demo_unlimited' },
    create: {
      code: 'demo_unlimited',
      name: '演示版全功能配额',
      price: 0,
      billingCycle: 'free',
      maxCustomers: 999,
      maxMonthlyBookings: 999,
      maxWorks: 999,
      maxStorageBytes: 500 * 1024 * 1024,
      maxMarketingExports: 999,
      maxMonthlySms: 0,
      maxEmployees: 1,
      maxBookingPages: 5,
      targetStage: 'Demo 专用',
      description: '仅用于共享演示租户，不对外售卖',
      features: JSON.stringify([
        'customer_management',
        'booking',
        'works',
        'basic_insights',
        'quick_quote',
      ]),
      status: 'inactive',
    },
    update: {},
  });
  await prisma.technicianSubscription.upsert({
    where: { technicianId: tech.id },
    create: {
      technicianId: tech.id,
      planId: demoPlan.id,
      status: 'active',
      startedAt: new Date('2026-11-01T00:00:00Z'),
    },
    update: {
      planId: demoPlan.id,
      status: 'active',
    },
  });

  // 1. Seed Service table rows matching DEMO_SERVICE_ITEMS
  const createdServices: Array<{ id: number; publicId: string; name: string; price: number; durationMinutes: number }> = [];
  for (const item of DEMO_SERVICE_ITEMS) {
    const svc = await prisma.service.create({
      data: {
        publicId: item.id,
        technicianId: tech.id,
        name: item.name,
        description: item.description,
        category: item.category,
        durationMinutes: item.durationMinutes,
        priceType: 'fixed',
        priceMinFen: item.price * 100,
        priceMaxFen: item.price * 100,
        isBookable: true,
        sortOrder: item.sortOrder,
      },
    });
    createdServices.push({
      id: svc.id,
      publicId: svc.publicId,
      name: svc.name,
      price: item.price,
      durationMinutes: item.durationMinutes,
    });
  }

  // 2. Seed 10 distinct NailWorks
  const createdWorks: Array<{ id: number; title: string }> = [];
  for (const work of SHOWCASE_WORKS) {
    const w = await prisma.nailWork.create({
      data: {
        techId: tech.id,
        title: work.title,
        description: work.description,
        designIdea: `预计耗时 ${work.durationMinutes} 分钟`,
        price: work.price,
        tags: JSON.stringify([work.styleTag]),
        images: JSON.stringify([work.coverUrl]),
        coverUrl: work.coverUrl,
        visibilityScope: 'public',
        publicationStatus: 'approved',
        isVisible: true,
        sortOrder: work.sortOrder,
        viewCount: 60 + work.sortOrder * 11,
      },
    });
    createdWorks.push({ id: w.id, title: work.title });
  }

  // 3. Seed 6 fictional customers
  const createdCustomers: Array<{ id: number; name: string }> = [];
  for (const c of DEMO_CLIENTS) {
    const created = await prisma.customer.create({
      data: {
        technicianId: tech.id,
        name: c.name,
        phone: `${options.prefix}_${c.phone}`,
        tags: c.tags,
        notes: c.notes,
        completedServiceCount: 3,
        lifetimePaidAmount: 680,
      },
    });
    createdCustomers.push({ id: created.id, name: created.name });
  }

  // 4. Seed 8 orders across statuses + matching completed revenues
  const now = new Date();
  const createdOrders: Array<{ id: number; status: string; title: string; customerId: number }> = [];
  for (const spec of DEMO_ORDERS_SPEC) {
    const start = new Date(now);
    start.setDate(start.getDate() + spec.dayOffset);
    start.setHours(spec.hour, 0, 0, 0);
    const end = new Date(start.getTime() + spec.durationHours * 3600 * 1000);
    const customer = createdCustomers[spec.clientIndex];
    const orderNo = `${options.prefix}_${spec.suffix}`;

    const order = await prisma.order.create({
      data: {
        orderNo,
        technicianId: tech.id,
        customerId: customer.id,
        clientUserId: spec.clientIndex === 0 ? options.demoClientId : undefined,
        customTitle: spec.title,
        customDescription: spec.remark,
        serviceType: spec.serviceType,
        status: spec.status,
        quotePrice: spec.price,
        depositAmount: 0,
        startTime: start,
        endTime: end,
        address: spec.address,
        remark: spec.remark,
      },
    });
    createdOrders.push({ id: order.id, status: spec.status, title: spec.title, customerId: customer.id });

    if (spec.status === 'completed') {
      await prisma.revenue.create({
        data: {
          revenueNo: `REV_${orderNo}`,
          technicianId: tech.id,
          customerId: customer.id,
          orderId: order.id,
          amount: spec.price,
          status: 'confirmed',
          recognizedAt: end,
        },
      });
    }
  }

  // 5. Seed BookingQuotes (快捷报价记录)
  const quoteExpiresAt = new Date(now.getTime() + 48 * 3600 * 1000);
  const quoteSpecs = [
    {
      suffix: 'Q01',
      status: 'issued',
      clientName: '小林（演示）',
      requirement: '想要月光猫眼极简法式，需要本甲卸除',
      serviceIndexes: [0, 2],
      customerId: createdCustomers[0]?.id,
    },
    {
      suffix: 'Q02',
      status: 'accepted',
      clientName: '苏苏（演示）',
      requirement: '清冷冰透碎钻水波纹，周六下午到店',
      serviceIndexes: [1, 2],
      customerId: createdCustomers[1]?.id,
    },
    {
      suffix: 'Q03',
      status: 'booked',
      clientName: '阿茶（演示）',
      requirement: '极简雾面燕麦纯色 + 前置修型护理',
      serviceIndexes: [0, 1],
      customerId: createdCustomers[2]?.id,
    },
  ];
  for (const q of quoteSpecs) {
    const lines = q.serviceIndexes.map((idx, i) => {
      const svc = createdServices[idx] || createdServices[0];
      return {
        lineType: 'service',
        serviceId: svc.id,
        servicePublicIdSnapshot: svc.publicId,
        nameSnapshot: svc.name,
        unitPriceFen: svc.price * 100,
        durationMinutes: svc.durationMinutes,
        quantity: 1,
        subtotalFen: svc.price * 100,
        sortOrder: i + 1,
      };
    });
    const subtotalFen = lines.reduce((sum, l) => sum + l.subtotalFen, 0);
    const totalMins = lines.reduce((sum, l) => sum + l.durationMinutes, 0);
    await prisma.bookingQuote.create({
      data: {
        quoteNo: `${options.prefix}_${q.suffix}`,
        publicToken: `${options.prefix.toLowerCase()}_quote_${q.suffix.toLowerCase()}`,
        technicianId: tech.id,
        clientUserId: options.demoClientId,
        customerId: q.customerId,
        status: q.status,
        clientName: q.clientName,
        requirement: q.requirement,
        serviceType: '到店美甲',
        technicianNameSnapshot: options.name,
        technicianAvatarSnapshot: '/onlynail-logo.jpg',
        invitationCodeSnapshot: options.invitationCode,
        shopNameSnapshot: options.shopName,
        shopAddressSnapshot: '上海市静安区（演示样板区域）',
        serviceSubtotalFen: subtotalFen,
        finalPriceFen: subtotalFen,
        totalDurationMinutes: totalMins,
        expiresAt: quoteExpiresAt,
        viewedAt: now,
        acceptedAt: q.status !== 'issued' ? now : null,
        bookedAt: q.status === 'booked' ? now : null,
        lines: { create: lines },
      },
    });
  }

  // 6. Seed CustomerFollowUp (客户跟进与做甲档案记录)
  for (let i = 0; i < 3; i++) {
    const cust = createdCustomers[i];
    if (!cust) continue;
    await prisma.customerFollowUp.create({
      data: {
        customerId: cust.id,
        technicianId: tech.id,
        content:
          i === 0
            ? '【演示档案】左手中指游离缘偏短，本次已做好轻薄建构，建议 21 天后回店卸除重做。'
            : i === 1
              ? '【演示档案】客户反馈玻璃珠猫眼光泽持久度很好，下次可推荐新色号。'
              : '【演示档案】指缘偏干燥，服务后涂抹无香型指缘油，客户体验满意。',
        plannedAt: new Date(now.getTime() + (i + 7) * 24 * 3600 * 1000),
        status: i === 2 ? 'completed' : 'pending',
        completedAt: i === 2 ? now : null,
        relatedOrderId: createdOrders[i]?.id,
        relatedWorkId: createdWorks[i]?.id,
        nailProjects: SHOWCASE_WORKS[i]?.title,
        materials: '日式高透底胶 · 环保可卸色胶',
        tools: '前置护理圆头磨头（低转速）',
      },
    });
  }

  // 7. Seed ServiceReview (评价记录) on completed orders
  if (options.demoClientId) {
    const completedOrders = createdOrders.filter((o) => o.status === 'completed').slice(0, 2);
    for (let i = 0; i < completedOrders.length; i++) {
      await prisma.serviceReview.create({
        data: {
          orderId: completedOrders[i].id,
          clientUserId: options.demoClientId,
          technicianId: tech.id,
          rating: 5,
          content:
            i === 0
              ? '（演示评价）修型非常细致，指缘完全没有不适感，建构弧度很自然！'
              : '（演示评价）猫眼吸光特别温柔显白，整个过程安静不推销，体验很好。',
          moderationStatus: 'approved',
          publicationStatus: 'public',
          technicianReply: '谢谢宝宝认可（演示回复），下次回来提前告诉我，给你留好专属底胶～',
          repliedAt: now,
        },
      });
    }

    // 8. Seed Conversation & Messages (模拟沟通消息)
    const conv = await prisma.conversation.create({
      data: {
        clientId: options.demoClientId,
        techId: tech.id,
        lastMessage: '好的，已经帮您标注“左手中指敏感、不涂有香护手霜”，周六见！',
        lastMessageAt: now,
      },
    });
    await prisma.message.createMany({
      data: [
        {
          conversationId: conv.id,
          senderType: 'client',
          senderId: options.demoClientId,
          receiverType: 'technician',
          receiverId: tech.id,
          messageType: 'text',
          content: 'Luna 老师，想约这周六下午做“月光猫眼极简法式”，请问需要卸甲大概一共多久？',
          isRead: true,
        },
        {
          conversationId: conv.id,
          senderType: 'technician',
          senderId: tech.id,
          receiverType: 'client',
          receiverId: options.demoClientId,
          messageType: 'text',
          content: '含温和本甲卸除+前置修型一共约 120 分钟，已发一份明细报价单给您确认～',
          isRead: true,
        },
        {
          conversationId: conv.id,
          senderType: 'technician',
          senderId: tech.id,
          receiverType: 'client',
          receiverId: options.demoClientId,
          messageType: 'text',
          content: '好的，已经帮您标注“左手中指敏感、不涂有香护手霜”，周六见！',
          isRead: false,
        },
      ],
    });
  }

  // 9. Seed TechnicianNotice & TechnicianActivity (主页公告与活动)
  await prisma.technicianNotice.createMany({
    data: [
      {
        technicianId: tech.id,
        title: '本月预约开放说明（演示公告）',
        content: '工作室采用一对一全预约制，每天最多接待 4 位客人，保证每双手都有充足修型与建构时间。',
        status: 'published',
        publishedAt: now,
        coveredCount: 6,
      },
      {
        technicianId: tech.id,
        title: '秋冬季新品胶色已上新（演示公告）',
        content: '新增 12 支日系低饱和透色与玻璃珠猫眼，欢迎在作品集挑选参考图发我秒级报价。',
        status: 'published',
        publishedAt: now,
        coveredCount: 6,
      },
    ],
  });
  await prisma.technicianActivity.create({
    data: {
      technicianId: tech.id,
      title: '新客首次体验 · 免费升级本甲轻量建构（演示活动）',
      coverUrl: '/images/campaign-cases/case-artist-home.webp',
      recommendToHero: true,
      contentBlocks: JSON.stringify([
        { type: 'text', content: '首次预约任意纯色或设计款，免费升级日式轻薄建构塑形，提升持久度。' },
      ]),
      status: 'active',
      startTime: new Date(now.getTime() - 3 * 24 * 3600 * 1000),
      endTime: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
      publishedAt: now,
      viewCount: 86,
    },
  });

  // 10. Seed BlockedTimeSlot (日程锁定时段)
  const blockStart = new Date(now);
  blockStart.setDate(blockStart.getDate() + 2);
  blockStart.setHours(13, 0, 0, 0);
  const blockEnd = new Date(blockStart.getTime() + 90 * 60 * 1000);
  await prisma.blockedTimeSlot.create({
    data: {
      techId: tech.id,
      startTime: blockStart,
      endTime: blockEnd,
      reason: '午休与器材消毒保留时段（演示锁定）',
    },
  });

  return tech;
}

export async function ensureDemoClientUser(prisma: PrismaService) {
  const passwordHash = await bcrypt.hash('OnlyNailDemoClient#2026', 10);
  const existing = await prisma.clientUser.findUnique({
    where: { phone: DEMO_CLIENT_PHONE },
  });
  if (existing) {
    return prisma.clientUser.update({
      where: { id: existing.id },
      data: {
        nickname: '小林（演示访客）',
        isDemo: true,
        status: 'active',
        avatarUrl: '/onlynail-logo.jpg',
        city: '上海',
      },
    });
  }
  return prisma.clientUser.create({
    data: {
      phone: DEMO_CLIENT_PHONE,
      nickname: '小林（演示访客）',
      passwordHash,
      isDemo: true,
      status: 'active',
      avatarUrl: '/onlynail-logo.jpg',
      city: '上海',
    },
  });
}
