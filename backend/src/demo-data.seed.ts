import * as bcrypt from 'bcryptjs';

type DemoSeedResult = {
  technicianPhone: string;
  clientPhones: string[];
  orderNos: string[];
  revenueNos: string[];
  customServiceRequestNos: string[];
  artistApplicationPhones: string[];
};

type DemoPrisma = any;

type DemoClientSeed = {
  phone: string;
  nickname: string;
  customerName: string;
  gender: string;
  address: {
    contactName: string;
    contactPhone: string;
    province: string;
    city: string;
    district: string;
    detailAddress: string;
    doorInfo: string;
    latitude?: number;
    longitude?: number;
  };
};

type DemoBookingSeed = {
  orderNo: string;
  revenueNo?: string;
  clientPhone: string;
  title: string;
  description: string;
  serviceType: string;
  status: string;
  price: number;
  depositAmount: number;
  startTime: Date;
  endTime: Date;
  address: string;
  remark: string;
  recognizedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  designRequestTitle?: string;
};

const PRIMARY_TECHNICIAN_PHONE = '13800138000';
const PRIMARY_TECHNICIAN_INVITE_CODE = '123456';

const DEFAULT_SERVICE_ITEMS = [
  {
    id: 'svc_basic_care_1',
    name: '基础护理与修形',
    description: '修剪、修形、去死皮与基础护理',
    category: 'basic_care',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'svc_gel_color_1',
    name: '纯色与跳色美甲',
    description: '纯色、跳色、渐变与常规胶款',
    category: 'gel_color',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'svc_hand_paint_1',
    name: '手绘与细节点缀',
    description: '法式、猫眼、贴钻与局部手绘',
    category: 'design',
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'svc_extension_1',
    name: '延长与加固',
    description: '甲片延长、结构加固与卸甲修复',
    category: 'extension',
    isActive: true,
    sortOrder: 4,
  },
];

const DEFAULT_BUSINESS_HOURS = [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
  weekday,
  start: '10:00',
  end: '21:00',
  closed: false,
}));

const PRIMARY_SHOP_ADDRESSES = [
  {
    name: '静安工作室',
    phone: PRIMARY_TECHNICIAN_PHONE,
    province: '上海市',
    city: '上海市',
    district: '静安区',
    detailAddress: '南京西路 818 号 3 楼',
    doorInfo: '近 2 号线南京西路站',
    enabled: true,
    businessHours: DEFAULT_BUSINESS_HOURS,
  },
];

const DEMO_CLIENTS: DemoClientSeed[] = [
  {
    phone: '13800138001',
    nickname: '王小美',
    customerName: '王小美',
    gender: 'female',
    address: {
      contactName: '王小美',
      contactPhone: '13800138001',
      province: '上海市',
      city: '上海市',
      district: '静安区',
      detailAddress: '铜仁路 88 号 1202',
      doorInfo: '门禁 1202#',
      latitude: 31.2245,
      longitude: 121.4442,
    },
  },
  {
    phone: '13800138002',
    nickname: '林安安',
    customerName: '林安安',
    gender: 'female',
    address: {
      contactName: '林安安',
      contactPhone: '13800138002',
      province: '上海市',
      city: '上海市',
      district: '徐汇区',
      detailAddress: '天钥桥路 188 弄 6 号楼 901',
      doorInfo: '到店前电话',
      latitude: 31.1888,
      longitude: 121.4385,
    },
  },
  {
    phone: '13800138003',
    nickname: '周可可',
    customerName: '周可可',
    gender: 'female',
    address: {
      contactName: '周可可',
      contactPhone: '13800138003',
      province: '上海市',
      city: '上海市',
      district: '长宁区',
      detailAddress: '延安西路 728 号 1701',
      doorInfo: '前台登记',
      latitude: 31.2135,
      longitude: 121.4065,
    },
  },
  {
    phone: '13800138004',
    nickname: '陈萄萄',
    customerName: '陈萄萄',
    gender: 'female',
    address: {
      contactName: '陈萄萄',
      contactPhone: '13800138004',
      province: '上海市',
      city: '上海市',
      district: '浦东新区',
      detailAddress: '浦电路 56 弄 3 号楼 502',
      doorInfo: '放物业前台',
      latitude: 31.2215,
      longitude: 121.5205,
    },
  },
  {
    phone: '13800138005',
    nickname: '许念念',
    customerName: '许念念',
    gender: 'female',
    address: {
      contactName: '许念念',
      contactPhone: '13800138005',
      province: '上海市',
      city: '上海市',
      district: '虹口区',
      detailAddress: '四川北路 2018 号 1103',
      doorInfo: '电梯右转',
      latitude: 31.2585,
      longitude: 121.4755,
    },
  },
];

const DEMO_WORKS = [
  {
    title: '奶油裸粉通勤款',
    coverUrl:
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=900&q=80',
    ],
    description: '适合通勤和约会的细闪裸粉，主打耐看和显白。',
    tags: '通勤,裸粉,细闪',
    isPinned: true,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    title: '法式猫眼婚礼款',
    coverUrl:
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=900&q=80',
    ],
    description: '白金法式搭配低饱和猫眼，镜头里特别干净。',
    tags: '法式,猫眼,婚礼',
    isPinned: true,
    isFeatured: true,
    sortOrder: 2,
  },
  {
    title: '抹茶绿色周末款',
    coverUrl:
      'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=900&q=80',
    ],
    description: '低饱和抹茶色配跳色亮片，适合春夏周末。',
    tags: '绿色,跳色,春夏',
    isPinned: false,
    isFeatured: true,
    sortOrder: 3,
  },
  {
    title: '黑金派对延长款',
    coverUrl:
      'https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=80',
    ],
    description: '偏锋利的延长甲型，适合派对和拍照。',
    tags: '黑金,延长,派对',
    isPinned: false,
    isFeatured: true,
    sortOrder: 4,
  },
  {
    title: '樱桃酒红秋冬款',
    coverUrl:
      'https://images.unsplash.com/photo-1515688594390-b649af70d282?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1515688594390-b649af70d282?auto=format&fit=crop&w=900&q=80',
    ],
    description: '酒红搭配金属线条，显手白。',
    tags: '酒红,秋冬,金属',
    isPinned: false,
    isFeatured: true,
    sortOrder: 5,
  },
  {
    title: '海盐蓝度假款',
    coverUrl:
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80',
    ],
    description: '清透海盐蓝和贝壳元素，适合旅行海边。',
    tags: '蓝色,度假,贝壳',
    isPinned: false,
    isFeatured: true,
    sortOrder: 6,
  },
];

function daysAgo(days: number, hour = 14, minute = 0) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  value.setHours(hour, minute, 0, 0);
  return value;
}

function daysFromNow(days: number, hour = 14, minute = 0) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(hour, minute, 0, 0);
  return value;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function json(value: unknown) {
  return JSON.stringify(value);
}

async function ensureAddress(
  prisma: DemoPrisma,
  clientId: number,
  address: DemoClientSeed['address'],
) {
  const existing = await prisma.clientAddress.findFirst({
    where: {
      clientId,
      detailAddress: address.detailAddress,
    },
  });

  if (existing) {
    await prisma.clientAddress.updateMany({
      where: { clientId },
      data: { isDefault: false },
    });
    return prisma.clientAddress.update({
      where: { id: existing.id },
      data: {
        latitude: address.latitude ?? null,
        longitude: address.longitude ?? null,
      },
    });
  }

  await prisma.clientAddress.updateMany({
    where: { clientId },
    data: { isDefault: false },
  });

  return prisma.clientAddress.create({
    data: {
      clientId,
      contactName: address.contactName,
      contactPhone: address.contactPhone,
      province: address.province,
      city: address.city,
      district: address.district,
      detailAddress: address.detailAddress,
      doorInfo: address.doorInfo,
      latitude: address.latitude,
      longitude: address.longitude,
      isDefault: true,
    },
  });
}

async function ensureWork(
  prisma: DemoPrisma,
  techId: number,
  work: (typeof DEMO_WORKS)[number],
) {
  const existing = await prisma.nailWork.findFirst({
    where: {
      techId,
      title: work.title,
    },
  });

  const data = {
    techId,
    title: work.title,
    coverUrl: work.coverUrl,
    images: json(work.images),
    description: work.description,
    tags: work.tags,
    isVisible: true,
    isPinned: work.isPinned,
    isFeatured: work.isFeatured,
    sortOrder: work.sortOrder,
  };

  if (existing) {
    return prisma.nailWork.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.nailWork.create({ data });
}

async function ensureInteraction(
  prisma: DemoPrisma,
  type: 'like' | 'favorite' | 'comment',
  payload: any,
) {
  if (type === 'like') {
    const existing = await prisma.nailWorkLike.findFirst({
      where: {
        workId: payload.workId,
        clientId: payload.clientId,
      },
    });
    if (!existing) {
      await prisma.nailWorkLike.create({ data: payload });
    }
    return;
  }

  if (type === 'favorite') {
    const existing = await prisma.nailWorkFavorite.findFirst({
      where: {
        workId: payload.workId,
        clientId: payload.clientId,
      },
    });
    if (!existing) {
      await prisma.nailWorkFavorite.create({ data: payload });
    }
    return;
  }

  const existing = await prisma.nailWorkComment.findFirst({
    where: {
      workId: payload.workId,
      clientId: payload.clientId,
      content: payload.content,
    },
  });
  if (!existing) {
    await prisma.nailWorkComment.create({ data: payload });
  }
}

async function ensureDesignRequest(
  prisma: DemoPrisma,
  clientId: number,
  techId: number,
  seed: any,
) {
  const existing = await prisma.clientDesignRequest.findFirst({
    where: {
      clientId,
      techId,
      title: seed.title,
    },
  });

  const data = {
    clientId,
    techId,
    title: seed.title,
    images: json(seed.images),
    description: seed.description,
    quotePrice: seed.quotePrice,
    quoteRemark: seed.quoteRemark,
    status: seed.status,
  };

  if (existing) {
    return prisma.clientDesignRequest.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.clientDesignRequest.create({ data });
}

async function ensureMessage(
  prisma: DemoPrisma,
  conversationId: number,
  seed: any,
) {
  const existing = await prisma.message.findFirst({
    where: {
      conversationId,
      senderType: seed.senderType,
      receiverType: seed.receiverType,
      messageType: seed.messageType,
      content: seed.content ?? null,
      relatedType: seed.relatedType ?? null,
      relatedId: seed.relatedId ?? null,
    },
  });

  const data = {
    conversationId,
    senderType: seed.senderType,
    senderId: seed.senderId ?? null,
    receiverType: seed.receiverType,
    receiverId: seed.receiverId ?? null,
    messageType: seed.messageType,
    content: seed.content ?? null,
    imageUrl: seed.imageUrl ?? null,
    relatedType: seed.relatedType ?? null,
    relatedId: seed.relatedId ?? null,
    isRead: seed.isRead ?? false,
    createdAt: seed.createdAt,
  };

  if (existing) {
    return prisma.message.update({
      where: { id: existing.id },
      data: {
        imageUrl: data.imageUrl,
        isRead: data.isRead,
      },
    });
  }

  return prisma.message.create({ data });
}

async function ensureCSR(
  prisma: DemoPrisma,
  clientId: number,
  techId: number,
  seed: any,
) {
  const existing = await prisma.customServiceRequest.findFirst({
    where: { requestNo: seed.requestNo },
  });

  const data = {
    clientId,
    techId,
    title: seed.title,
    description: seed.description,
    images: seed.images,
    referenceWorkIds: seed.referenceWorkIds,
    serviceDate: seed.serviceDate,
    startTime: seed.startTime,
    serviceType: seed.serviceType,
    addressId: seed.addressId ?? null,
    status: seed.status,
    quotePrice: seed.quotePrice ?? null,
    quoteRemark: seed.quoteRemark ?? null,
    quotedAt: seed.quotedAt ?? null,
    acceptedAt: seed.acceptedAt ?? null,
    rejectedAt: seed.rejectedAt ?? null,
  };

  if (existing) {
    return prisma.customServiceRequest.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.customServiceRequest.create({
    data: { requestNo: seed.requestNo, ...data },
  });
}

function ensureFeatureFlag(prisma: DemoPrisma, seed: any) {
  return prisma.featureFlag.upsert({
    where: { featureCode: seed.featureCode },
    update: {
      featureName: seed.featureName,
      enabled: seed.enabled,
      enabledPlans: seed.enabledPlans ?? null,
      description: seed.description ?? null,
    },
    create: {
      featureCode: seed.featureCode,
      featureName: seed.featureName,
      enabled: seed.enabled,
      enabledPlans: seed.enabledPlans ?? null,
      description: seed.description ?? null,
    },
  });
}

export async function ensureDemoData(
  prisma: DemoPrisma,
): Promise<DemoSeedResult> {
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'free' },
    update: {
      name: '免费版',
      price: 0,
      billingCycle: 'free',
      maxCustomers: 20,
      maxMonthlyBookings: 40,
      features: json(['basic_profile']),
      status: 'active',
    },
    create: {
      name: '免费版',
      code: 'free',
      price: 0,
      billingCycle: 'free',
      maxCustomers: 20,
      maxMonthlyBookings: 40,
      features: json(['basic_profile']),
      status: 'active',
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'pro' },
    update: {
      name: 'Pro版',
      price: 29,
      billingCycle: 'monthly',
      maxCustomers: null,
      maxMonthlyBookings: null,
      features: json(['customer_tags', 'analytics', 'unlimited_bookings']),
      status: 'active',
    },
    create: {
      name: 'Pro版',
      code: 'pro',
      price: 29,
      billingCycle: 'monthly',
      maxCustomers: null,
      maxMonthlyBookings: null,
      features: json(['customer_tags', 'analytics', 'unlimited_bookings']),
      status: 'active',
    },
  });

  const studioPlusPlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'studio_plus' },
    update: {
      name: 'Studio Plus',
      price: 99,
      billingCycle: 'monthly',
      maxCustomers: null,
      maxMonthlyBookings: null,
      features: json([
        'team_dashboard',
        'priority_support',
        'advanced_analytics',
      ]),
      status: 'active',
    },
    create: {
      name: 'Studio Plus',
      code: 'studio_plus',
      price: 99,
      billingCycle: 'monthly',
      maxCustomers: null,
      maxMonthlyBookings: null,
      features: json([
        'team_dashboard',
        'priority_support',
        'advanced_analytics',
      ]),
      status: 'active',
    },
  });

  const demoPasswordHash = await bcrypt.hash('demo1234', 10);

  const primaryTechnician = await prisma.technician.upsert({
    where: { phone: PRIMARY_TECHNICIAN_PHONE },
    update: {
      name: '小美',
      passwordHash: demoPasswordHash,
      city: '上海',
      serviceArea: '上海市区上门 / 静安工作室到店',
      status: 'active',
      invitationCode: PRIMARY_TECHNICIAN_INVITE_CODE,
      homeService: true,
      shopService: true,
      shopAddresses: json(PRIMARY_SHOP_ADDRESSES),
      serviceItems: json(DEFAULT_SERVICE_ITEMS),
      socialMedia: json({
        wechat: 'xiaomei_nails',
        xiaohongshu: '小美美甲工作室',
        douyin: '小美做甲啦',
      }),
      serviceSchedule: json({
        days: {
          mon: { enabled: true, startTime: '10:00', endTime: '21:00' },
          tue: { enabled: true, startTime: '10:00', endTime: '21:00' },
          wed: { enabled: true, startTime: '10:00', endTime: '21:00' },
          thu: { enabled: true, startTime: '10:00', endTime: '21:00' },
          fri: { enabled: true, startTime: '10:00', endTime: '21:00' },
          sat: { enabled: true, startTime: '09:00', endTime: '22:00' },
          sun: { enabled: true, startTime: '09:00', endTime: '22:00' },
        },
      }),
      customTags: json([
        { id: 'tag1', name: '常客', color: '#FF5E93' },
        { id: 'tag2', name: '新客', color: '#3B82F6' },
        { id: 'tag3', name: '高频', color: '#C9792A' },
        { id: 'tag4', name: '简约风', color: '#31B46C' },
        { id: 'tag5', name: '节日款', color: '#7C3AED' },
      ]),
      avatarUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=512&q=80',
    },
    create: {
      name: '小美',
      phone: PRIMARY_TECHNICIAN_PHONE,
      passwordHash: demoPasswordHash,
      city: '上海',
      serviceArea: '上海市区上门 / 静安工作室到店',
      status: 'active',
      invitationCode: PRIMARY_TECHNICIAN_INVITE_CODE,
      homeService: true,
      shopService: true,
      shopAddresses: json(PRIMARY_SHOP_ADDRESSES),
      serviceItems: json(DEFAULT_SERVICE_ITEMS),
      socialMedia: json({
        wechat: 'xiaomei_nails',
        xiaohongshu: '小美美甲工作室',
        douyin: '小美做甲啦',
      }),
      serviceSchedule: json({
        days: {
          mon: { enabled: true, startTime: '10:00', endTime: '21:00' },
          tue: { enabled: true, startTime: '10:00', endTime: '21:00' },
          wed: { enabled: true, startTime: '10:00', endTime: '21:00' },
          thu: { enabled: true, startTime: '10:00', endTime: '21:00' },
          fri: { enabled: true, startTime: '10:00', endTime: '21:00' },
          sat: { enabled: true, startTime: '09:00', endTime: '22:00' },
          sun: { enabled: true, startTime: '09:00', endTime: '22:00' },
        },
      }),
      customTags: json([
        { id: 'tag1', name: '常客', color: '#FF5E93' },
        { id: 'tag2', name: '新客', color: '#3B82F6' },
        { id: 'tag3', name: '高频', color: '#C9792A' },
        { id: 'tag4', name: '简约风', color: '#31B46C' },
        { id: 'tag5', name: '节日款', color: '#7C3AED' },
      ]),
      avatarUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=512&q=80',
    },
  });

  const extraTechnicians = await Promise.all([
    prisma.technician.upsert({
      where: { phone: '13800138080' },
      update: {
        name: 'Momo Studio',
        passwordHash: demoPasswordHash,
        city: '上海',
        serviceArea: '浦东到店',
        status: 'active',
        invitationCode: '808080',
        homeService: false,
        shopService: true,
      },
      create: {
        name: 'Momo Studio',
        phone: '13800138080',
        passwordHash: demoPasswordHash,
        city: '上海',
        serviceArea: '浦东到店',
        status: 'active',
        invitationCode: '808080',
        homeService: false,
        shopService: true,
      },
    }),
    prisma.technician.upsert({
      where: { phone: '13800138081' },
      update: {
        name: '阿宁',
        passwordHash: demoPasswordHash,
        city: '杭州',
        serviceArea: '滨江区上门',
        status: 'inactive',
        invitationCode: '818181',
        homeService: true,
        shopService: false,
      },
      create: {
        name: '阿宁',
        phone: '13800138081',
        passwordHash: demoPasswordHash,
        city: '杭州',
        serviceArea: '滨江区上门',
        status: 'inactive',
        invitationCode: '818181',
        homeService: true,
        shopService: false,
      },
    }),
  ]);

  await prisma.technicianSubscription.upsert({
    where: { technicianId: primaryTechnician.id },
    update: {
      planId: proPlan.id,
      status: 'active',
      startedAt: daysAgo(45),
      expiredAt: daysFromNow(15),
    },
    create: {
      technicianId: primaryTechnician.id,
      planId: proPlan.id,
      status: 'active',
      startedAt: daysAgo(45),
      expiredAt: daysFromNow(15),
    },
  });

  await prisma.technicianSubscription.upsert({
    where: { technicianId: extraTechnicians[0].id },
    update: {
      planId: studioPlusPlan.id,
      status: 'active',
      startedAt: daysAgo(20),
      expiredAt: daysFromNow(10),
    },
    create: {
      technicianId: extraTechnicians[0].id,
      planId: studioPlusPlan.id,
      status: 'active',
      startedAt: daysAgo(20),
      expiredAt: daysFromNow(10),
    },
  });

  await prisma.technicianSubscription.upsert({
    where: { technicianId: extraTechnicians[1].id },
    update: {
      planId: freePlan.id,
      status: 'cancelled',
      startedAt: daysAgo(90),
      expiredAt: daysAgo(30),
      cancelledAt: daysAgo(35),
    },
    create: {
      technicianId: extraTechnicians[1].id,
      planId: freePlan.id,
      status: 'cancelled',
      startedAt: daysAgo(90),
      expiredAt: daysAgo(30),
      cancelledAt: daysAgo(35),
    },
  });

  const seededClients: Array<{
    client: any;
    binding: any;
    customer: any;
    address: any;
    seed: DemoClientSeed;
  }> = [];
  const clientLookup = new Map<string, any>();
  const customerLookup = new Map<string, any>();
  const addressLookup = new Map<string, any>();

  const AVATAR_URLS = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=512&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=512&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=512&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=512&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=512&q=80',
  ];

  for (const [index, seed] of DEMO_CLIENTS.entries()) {
    const client = await prisma.clientUser.upsert({
      where: { phone: seed.phone },
      update: {
        nickname: seed.nickname,
        passwordHash: demoPasswordHash,
        status: 'active',
        avatarUrl: AVATAR_URLS[index % AVATAR_URLS.length],
      },
      create: {
        phone: seed.phone,
        nickname: seed.nickname,
        passwordHash: demoPasswordHash,
        status: 'active',
        avatarUrl: AVATAR_URLS[index % AVATAR_URLS.length],
      },
    });

    const binding = await prisma.clientTechBinding.upsert({
      where: {
        clientId_techId: {
          clientId: client.id,
          techId: primaryTechnician.id,
        },
      },
      update: {
        inviteCode: PRIMARY_TECHNICIAN_INVITE_CODE,
        bindSource: 'invite',
        isDefault: true,
        status: 'active',
      },
      create: {
        clientId: client.id,
        techId: primaryTechnician.id,
        inviteCode: PRIMARY_TECHNICIAN_INVITE_CODE,
        bindSource: 'invite',
        isDefault: true,
        status: 'active',
      },
    });

    const customer = await prisma.customer.upsert({
      where: {
        technicianId_clientUserId: {
          technicianId: primaryTechnician.id,
          clientUserId: client.id,
        },
      },
      update: {
        name: seed.customerName,
        phone: seed.phone,
        gender: seed.gender,
        address: seed.address.detailAddress,
        tags: [
          '高复购',
          '审美稳定',
          '支持拍照素材',
          '沟通顺畅',
          '可预约工作日晚上',
        ][index],
        notes: [
          '每月固定保养',
          '偏爱干净法式',
          '喜欢低饱和色系',
          '接受延长和造型',
          '常带参考图来沟通',
        ][index],
        birthday: new Date(
          [
            '1995-01-15',
            '1997-06-20',
            '1993-11-03',
            '1998-08-12',
            '1996-04-25',
          ][index],
        ),
        avatarUrl: AVATAR_URLS[index],
      },
      create: {
        technicianId: primaryTechnician.id,
        clientUserId: client.id,
        name: seed.customerName,
        phone: seed.phone,
        gender: seed.gender,
        address: seed.address.detailAddress,
        tags: [
          '高复购',
          '审美稳定',
          '支持拍照素材',
          '沟通顺畅',
          '可预约工作日晚上',
        ][index],
        notes: [
          '每月固定保养',
          '偏爱干净法式',
          '喜欢低饱和色系',
          '接受延长和造型',
          '常带参考图来沟通',
        ][index],
        birthday: new Date(
          [
            '1995-01-15',
            '1997-06-20',
            '1993-11-03',
            '1998-08-12',
            '1996-04-25',
          ][index],
        ),
        avatarUrl: AVATAR_URLS[index],
      },
    });

    const address = await ensureAddress(prisma, client.id, seed.address);

    seededClients.push({ client, binding, customer, address, seed });
    clientLookup.set(seed.phone, client);
    customerLookup.set(seed.phone, customer);
    addressLookup.set(seed.phone, address);
  }

  const seededWorks: any[] = [];
  for (const work of DEMO_WORKS) {
    const ensured = await ensureWork(prisma, primaryTechnician.id, work);
    seededWorks.push(ensured);
  }

  if (seededWorks[0]) {
    await ensureInteraction(prisma, 'like', {
      workId: seededWorks[0].id,
      clientId: clientLookup.get('13800138001').id,
    });
    await ensureInteraction(prisma, 'favorite', {
      workId: seededWorks[0].id,
      clientId: clientLookup.get('13800138001').id,
    });
    await ensureInteraction(prisma, 'comment', {
      workId: seededWorks[0].id,
      clientId: clientLookup.get('13800138001').id,
      content: '这组裸粉上手真的很干净，下次还想做同系列。',
      isRead: true,
    });
  }

  if (seededWorks[1]) {
    await ensureInteraction(prisma, 'like', {
      workId: seededWorks[1].id,
      clientId: clientLookup.get('13800138003').id,
    });
    await ensureInteraction(prisma, 'comment', {
      workId: seededWorks[1].id,
      clientId: clientLookup.get('13800138003').id,
      content: '这个法式猫眼我想约拍同款，周末可以排吗？',
      isRead: false,
    });
  }

  const designRequests = [
    {
      clientPhone: '13800138003',
      title: '奶灰法式婚礼参考',
      images: [
        'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80',
      ],
      description: '婚礼前想做奶灰法式，长度不要太夸张，拍照要显手白。',
      quotePrice: 328,
      quoteRemark: '建议轻延长 + 猫眼法式，时长约 2.5 小时。',
      status: 'quoted',
    },
    {
      clientPhone: '13800138005',
      title: '海盐蓝旅行款',
      images: [
        'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80',
      ],
      description: '月底去海边，想要偏清透的蓝色和贝壳元素。',
      quotePrice: 268,
      quoteRemark: '适合做清透底加少量贝壳金箔。',
      status: 'pending_quote',
    },
  ];

  const designRequestLookup = new Map<string, any>();
  for (const seed of designRequests) {
    const client = clientLookup.get(seed.clientPhone);
    const designRequest = await ensureDesignRequest(
      prisma,
      client.id,
      primaryTechnician.id,
      seed,
    );
    designRequestLookup.set(seed.title, designRequest);
  }

  const conversationSeeds = [
    {
      clientPhone: '13800138001',
      messages: [
        {
          senderType: 'client',
          senderId: clientLookup.get('13800138001').id,
          receiverType: 'technician',
          receiverId: primaryTechnician.id,
          messageType: 'text',
          content: '我想约下周三晚上的保养，还是做上次那个裸粉。',
          isRead: true,
          createdAt: daysAgo(4, 20, 10),
        },
        {
          senderType: 'technician',
          senderId: primaryTechnician.id,
          receiverType: 'client',
          receiverId: clientLookup.get('13800138001').id,
          messageType: 'text',
          content: '可以，我帮你留 19:30，到店款顺便补下甲面护理。',
          isRead: true,
          createdAt: daysAgo(4, 20, 18),
        },
      ],
    },
    {
      clientPhone: '13800138003',
      messages: [
        {
          senderType: 'client',
          senderId: clientLookup.get('13800138003').id,
          receiverType: 'technician',
          receiverId: primaryTechnician.id,
          messageType: 'quote',
          content: '这是我婚礼想做的参考图，可以帮我先看下报价吗？',
          relatedType: 'design_request',
          relatedId: designRequestLookup.get('奶灰法式婚礼参考')?.id ?? null,
          isRead: true,
          createdAt: daysAgo(3, 11, 0),
        },
        {
          senderType: 'technician',
          senderId: primaryTechnician.id,
          receiverType: 'client',
          receiverId: clientLookup.get('13800138003').id,
          messageType: 'text',
          content: '可以，建议做轻延长和奶灰猫眼法式，我给你先按 328 预估。',
          isRead: false,
          createdAt: daysAgo(3, 11, 18),
        },
      ],
    },
    {
      clientPhone: '13800138005',
      messages: [
        {
          senderType: 'client',
          senderId: clientLookup.get('13800138005').id,
          receiverType: 'technician',
          receiverId: primaryTechnician.id,
          messageType: 'text',
          content: '月底旅行前还能插个周五晚上的位置吗？',
          isRead: false,
          createdAt: daysAgo(1, 22, 0),
        },
      ],
    },
  ];

  for (const seed of conversationSeeds) {
    const client = clientLookup.get(seed.clientPhone);
    const lastMessage = seed.messages[seed.messages.length - 1];
    const conversation = await prisma.conversation.upsert({
      where: {
        clientId_techId: {
          clientId: client.id,
          techId: primaryTechnician.id,
        },
      },
      update: {
        lastMessage: lastMessage.content ?? lastMessage.messageType,
        lastMessageAt: lastMessage.createdAt,
      },
      create: {
        clientId: client.id,
        techId: primaryTechnician.id,
        lastMessage: lastMessage.content ?? lastMessage.messageType,
        lastMessageAt: lastMessage.createdAt,
      },
    });

    for (const message of seed.messages) {
      await ensureMessage(prisma, conversation.id, message);
    }
  }

  // ── Custom Service Requests ──────────────────────────────────────────────
  const csrSeeds = [
    {
      requestNo: 'DEMO-CSR-001',
      clientPhone: '13800138001',
      title: '节日主题定制美甲',
      description: '想做一组圣诞节主题的美甲，要有雪花和麋鹿元素，底色用酒红。',
      images: json([
        'https://images.unsplash.com/photo-1515688594390-b649af70d282?auto=format&fit=crop&w=900&q=80',
      ]),
      serviceDate: '周六',
      startTime: '14:00',
      serviceType: '到店美甲',
      status: 'quoted',
      quotePrice: 288,
      quoteRemark: '手绘雪花+麋鹿约2小时，建议搭配酒红底色。',
      quotedAt: daysAgo(3, 16, 0),
    },
    {
      requestNo: 'DEMO-CSR-002',
      clientPhone: '13800138002',
      title: '参考作品定制渐变款',
      description: '很喜欢作品集里那款抹茶绿，想要同色系但换成渐变效果。',
      images: json([
        'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
      ]),
      referenceWorkIds: seededWorks[2] ? json([seededWorks[2].id]) : null,
      serviceDate: '下周三',
      startTime: '19:30',
      serviceType: '上门美甲',
      addressId: addressLookup.get('13800138002')?.id ?? null,
      status: 'pending_quote',
    },
    {
      requestNo: 'DEMO-CSR-003',
      clientPhone: '13800138004',
      title: '派对延长甲定制',
      description: '周末派对想做夸张一点的延长甲，黑色底金色线条，可以贴钻。',
      images: json([
        'https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=80',
      ]),
      serviceDate: '周五',
      startTime: '18:00',
      serviceType: '上门美甲',
      addressId: addressLookup.get('13800138004')?.id ?? null,
      status: 'rejected',
      rejectedAt: daysAgo(1, 10, 30),
    },
  ];

  const customServiceRequestNos: string[] = [];
  for (const seed of csrSeeds) {
    const client = clientLookup.get(seed.clientPhone);
    await ensureCSR(prisma, client.id, primaryTechnician.id, seed);
    customServiceRequestNos.push(seed.requestNo);
  }

  // ── Feature Flags ────────────────────────────────────────────────────────
  const featureFlagSeeds = [
    {
      featureCode: 'home_service',
      featureName: '上门服务',
      enabled: true,
      enabledPlans: json(['pro', 'studio_plus']),
      description: '美甲师上门服务功能开关',
    },
    {
      featureCode: 'design_request',
      featureName: '定制设计请求',
      enabled: true,
      enabledPlans: json(['free', 'pro', 'studio_plus']),
      description: '客户提交定制设计需求功能',
    },
    {
      featureCode: 'advanced_analytics',
      featureName: '高级数据分析',
      enabled: true,
      enabledPlans: json(['studio_plus']),
      description: '高级数据统计与分析面板',
    },
    {
      featureCode: 'priority_support',
      featureName: '优先客服',
      enabled: false,
      enabledPlans: json(['studio_plus']),
      description: '优先客服通道（暂未开放）',
    },
  ];
  for (const seed of featureFlagSeeds) {
    await ensureFeatureFlag(prisma, seed);
  }

  // ── Admin User & Operation Logs ──────────────────────────────────────────
  const adminRole = await prisma.adminRole.upsert({
    where: { code: 'demo_admin' },
    update: { name: '演示管理员', description: '演示种子数据管理员角色' },
    create: {
      name: '演示管理员',
      code: 'demo_admin',
      description: '演示种子数据管理员角色',
    },
  });

  const adminUser = await prisma.adminUser.upsert({
    where: { username: 'demo_admin' },
    update: { realName: '演示管理员', roleId: adminRole.id, status: 'active' },
    create: {
      username: 'demo_admin',
      passwordHash: '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      realName: '演示管理员',
      roleId: adminRole.id,
      status: 'active',
    },
  });

  const operationLogSeeds = [
    {
      module: 'artist_application',
      action: 'approve',
      targetType: 'artist_application',
      targetId: null,
      ip: '192.168.1.100',
      createdAt: daysAgo(5, 10, 0),
    },
    {
      module: 'order',
      action: 'review',
      targetType: 'order',
      targetId: null,
      ip: '192.168.1.100',
      createdAt: daysAgo(3, 14, 20),
    },
    {
      module: 'technician',
      action: 'update_status',
      targetType: 'technician',
      targetId: primaryTechnician.id,
      ip: '192.168.1.101',
      createdAt: daysAgo(1, 9, 0),
    },
  ];
  for (const seed of operationLogSeeds) {
    const existing = await prisma.operationLog.findFirst({
      where: {
        adminUserId: adminUser.id,
        module: seed.module,
        action: seed.action,
        createdAt: seed.createdAt,
      },
    });
    if (!existing) {
      await prisma.operationLog.create({
        data: {
          adminUserId: adminUser.id,
          module: seed.module,
          action: seed.action,
          targetType: seed.targetType,
          targetId: seed.targetId,
          ip: seed.ip,
          createdAt: seed.createdAt,
        },
      });
    }
  }

  // ── Additional NailWork Interactions ─────────────────────────────────────
  if (seededWorks[2]) {
    await ensureInteraction(prisma, 'like', {
      workId: seededWorks[2].id,
      clientId: clientLookup.get('13800138002').id,
    });
    await ensureInteraction(prisma, 'favorite', {
      workId: seededWorks[2].id,
      clientId: clientLookup.get('13800138002').id,
    });
  }
  if (seededWorks[3]) {
    await ensureInteraction(prisma, 'like', {
      workId: seededWorks[3].id,
      clientId: clientLookup.get('13800138004').id,
    });
    await ensureInteraction(prisma, 'comment', {
      workId: seededWorks[3].id,
      clientId: clientLookup.get('13800138004').id,
      content: '这款黑金延长好酷，适合年底活动！',
      isRead: false,
    });
  }
  if (seededWorks[4]) {
    await ensureInteraction(prisma, 'like', {
      workId: seededWorks[4].id,
      clientId: clientLookup.get('13800138001').id,
    });
    await ensureInteraction(prisma, 'favorite', {
      workId: seededWorks[4].id,
      clientId: clientLookup.get('13800138003').id,
    });
  }
  if (seededWorks[5]) {
    await ensureInteraction(prisma, 'like', {
      workId: seededWorks[5].id,
      clientId: clientLookup.get('13800138005').id,
    });
    await ensureInteraction(prisma, 'comment', {
      workId: seededWorks[5].id,
      clientId: clientLookup.get('13800138005').id,
      content: '海盐蓝好清爽，旅行回来约做这款！',
      isRead: true,
    });
  }

  const bookingSeeds: DemoBookingSeed[] = [
    {
      orderNo: 'DEMO-OD-1001',
      revenueNo: 'DEMO-REV-1001',
      clientPhone: '13800138001',
      title: '奶油裸粉通勤款',
      description: '老客户返场保养 + 裸粉跳色',
      serviceType: '到店美甲',
      status: 'completed',
      price: 198,
      depositAmount: 50,
      startTime: daysAgo(18, 19, 30),
      endTime: addMinutes(daysAgo(18, 19, 30), 120),
      address: '静安工作室 · 南京西路 818 号 3 楼',
      remark: '拍完成片，补做拇指加固。',
      recognizedAt: daysAgo(18, 22, 0),
    },
    {
      orderNo: 'DEMO-OD-1002',
      revenueNo: 'DEMO-REV-1002',
      clientPhone: '13800138002',
      title: '法式猫眼婚礼款',
      description: '婚礼前试妆款',
      serviceType: '上门美甲',
      status: 'completed',
      price: 328,
      depositAmount: 100,
      startTime: daysAgo(12, 13, 0),
      endTime: addMinutes(daysAgo(12, 13, 0), 150),
      address: '徐汇区天钥桥路 188 弄 6 号楼 901',
      remark: '上门携带延长工具。',
      recognizedAt: daysAgo(12, 16, 30),
    },
    {
      orderNo: 'DEMO-OD-1003',
      clientPhone: '13800138003',
      title: '奶灰法式婚礼参考',
      description: '婚礼前正式款',
      serviceType: '到店美甲',
      status: 'pending_shop',
      price: 328,
      depositAmount: 100,
      startTime: daysFromNow(0, 14, 0),
      endTime: addMinutes(daysFromNow(0, 14, 0), 150),
      address: '静安工作室 · 南京西路 818 号 3 楼',
      remark: '到店前确认婚礼礼服颜色。',
    },
    {
      orderNo: 'DEMO-OD-1004',
      clientPhone: '13800138004',
      title: '黑金派对延长款',
      description: '周末活动造型款',
      serviceType: '上门美甲',
      status: 'pending_agree',
      price: 368,
      depositAmount: 100,
      startTime: daysFromNow(0, 18, 30),
      endTime: addMinutes(daysFromNow(0, 18, 30), 180),
      address: '浦东新区浦电路 56 弄 3 号楼 502',
      remark: '先保留晚间档期，待客户确认订金。',
    },
    {
      orderNo: 'DEMO-OD-1005',
      revenueNo: 'DEMO-REV-1005',
      clientPhone: '13800138005',
      title: '海盐蓝旅行款',
      description: '清透蓝旅行主题',
      serviceType: '到店美甲',
      status: 'completed',
      price: 268,
      depositAmount: 80,
      startTime: daysFromNow(0, 10, 30),
      endTime: addMinutes(daysFromNow(0, 10, 30), 130),
      address: '静安工作室 · 南京西路 818 号 3 楼',
      remark: '增加贝壳碎片与银箔。',
      recognizedAt: daysFromNow(0, 12, 50),
      designRequestTitle: '海盐蓝旅行款',
    },
    {
      orderNo: 'DEMO-OD-1006',
      clientPhone: '13800138001',
      title: '樱桃酒红秋冬款',
      description: '节日前加班后的临时保养',
      serviceType: '到店美甲',
      status: 'cancelled',
      price: 238,
      depositAmount: 0,
      startTime: daysAgo(2, 20, 0),
      endTime: addMinutes(daysAgo(2, 20, 0), 120),
      address: '静安工作室 · 南京西路 818 号 3 楼',
      remark: '客户临时出差改期。',
      cancelledAt: daysAgo(2, 15, 20),
      cancelReason: '客户临时出差',
    },
    {
      orderNo: 'DEMO-OD-1007',
      revenueNo: 'DEMO-REV-1007',
      clientPhone: '13800138002',
      title: '抹茶绿色周末款',
      description: '春夏跳色返场款',
      serviceType: '上门美甲',
      status: 'completed',
      price: 228,
      depositAmount: 60,
      startTime: daysAgo(28, 11, 0),
      endTime: addMinutes(daysAgo(28, 11, 0), 110),
      address: '徐汇区天钥桥路 188 弄 6 号楼 901',
      remark: '客户希望缩短时长，保留跳色即可。',
      recognizedAt: daysAgo(28, 13, 10),
    },
    {
      orderNo: 'DEMO-OD-1008',
      clientPhone: '13800138003',
      title: '婚礼前试色沟通',
      description: '试色和甲型沟通',
      serviceType: '到店美甲',
      status: 'pending_agree',
      price: 99,
      depositAmount: 0,
      startTime: daysFromNow(1, 19, 0),
      endTime: addMinutes(daysFromNow(1, 19, 0), 60),
      address: '静安工作室 · 南京西路 818 号 3 楼',
      remark: '先做试色和婚礼成片确认。',
    },
    {
      orderNo: 'DEMO-OD-1009',
      clientPhone: '13800138002',
      title: '裸粉跳色保养',
      description: '春季到店保养',
      serviceType: '到店美甲',
      status: 'in_progress',
      price: 198,
      depositAmount: 50,
      startTime: daysFromNow(0, 16, 0),
      endTime: addMinutes(daysFromNow(0, 16, 0), 120),
      address: '静安工作室 · 南京西路 818 号 3 楼',
      remark: '今天下午到店，做裸粉跳色保养。',
    },
    {
      orderNo: 'DEMO-OD-1010',
      clientPhone: '13800138004',
      title: '纯色快做上门',
      description: '工作日上门纯色',
      serviceType: '上门美甲',
      status: 'pending_quote',
      price: 0,
      depositAmount: 0,
      startTime: daysFromNow(1, 15, 0),
      endTime: addMinutes(daysFromNow(1, 15, 0), 90),
      address: '浦东新区浦电路 56 弄 3 号楼 502',
      remark: '客户希望报价，偏好纯色快做。',
    },
  ];

  const orderNos: string[] = [];
  const revenueNos: string[] = [];

  for (const seed of bookingSeeds) {
    const client = clientLookup.get(seed.clientPhone);
    const customer = customerLookup.get(seed.clientPhone);
    const address = addressLookup.get(seed.clientPhone);
    const designRequest = seed.designRequestTitle
      ? designRequestLookup.get(seed.designRequestTitle)
      : null;

    const order = await prisma.order.upsert({
      where: { orderNo: seed.orderNo },
      update: {
        technicianId: primaryTechnician.id,
        customerId: customer.id,
        clientUserId: client.id,
        addressId: address?.id ?? null,
        designRequestId: designRequest?.id ?? null,
        startTime: seed.startTime,
        endTime: seed.endTime,
        address: seed.address,
        serviceType: seed.serviceType,
        remark: seed.remark,
        quotePrice: seed.price,
        status: seed.status,
        isDepositPaid: seed.depositAmount > 0,
        depositAmount: seed.depositAmount,
        depositStatus: seed.depositAmount > 0 ? 'paid' : 'pending',
        depositConfirmedAt: seed.depositAmount > 0 ? seed.startTime : null,
        confirmedAt: [
          'pending_home',
          'pending_shop',
          'in_progress',
          'completed',
        ].includes(seed.status)
          ? seed.startTime
          : null,
        completedAt: seed.status === 'completed' ? seed.endTime : null,
        cancelledAt:
          seed.status === 'cancelled'
            ? (seed.cancelledAt ?? seed.startTime)
            : null,
        cancelReason: seed.cancelReason ?? null,
        source: 'demo_seed',
      },
      create: {
        orderNo: seed.orderNo,
        technicianId: primaryTechnician.id,
        customerId: customer.id,
        clientUserId: client.id,
        addressId: address?.id ?? null,
        designRequestId: designRequest?.id ?? null,
        startTime: seed.startTime,
        endTime: seed.endTime,
        address: seed.address,
        serviceType: seed.serviceType,
        remark: seed.remark,
        quotePrice: seed.price,
        status: seed.status,
        isDepositPaid: seed.depositAmount > 0,
        depositAmount: seed.depositAmount,
        depositStatus: seed.depositAmount > 0 ? 'paid' : 'pending',
        depositConfirmedAt: seed.depositAmount > 0 ? seed.startTime : null,
        confirmedAt: [
          'pending_home',
          'pending_shop',
          'in_progress',
          'completed',
        ].includes(seed.status)
          ? seed.startTime
          : null,
        completedAt: seed.status === 'completed' ? seed.endTime : null,
        cancelledAt:
          seed.status === 'cancelled'
            ? (seed.cancelledAt ?? seed.startTime)
            : null,
        cancelReason: seed.cancelReason ?? null,
        source: 'demo_seed',
      },
    });

    orderNos.push(seed.orderNo);

    if (seed.revenueNo && seed.recognizedAt) {
      await prisma.revenue.upsert({
        where: { revenueNo: seed.revenueNo },
        update: {
          orderId: order.id,
          technicianId: primaryTechnician.id,
          customerId: customer.id,
          amount: seed.price,
          status: 'confirmed',
          recognizedAt: seed.recognizedAt,
          voidedAt: null,
        },
        create: {
          revenueNo: seed.revenueNo,
          orderId: order.id,
          technicianId: primaryTechnician.id,
          customerId: customer.id,
          amount: seed.price,
          status: 'confirmed',
          recognizedAt: seed.recognizedAt,
          voidedAt: null,
        },
      });
      revenueNos.push(seed.revenueNo);
    }
  }

  // ── Voided Revenue (refund scenario on oldest completed order) ──────────
  const voidedOrder = await prisma.order.findFirst({
    where: { orderNo: 'DEMO-OD-1007' },
  });
  const voidedCustomer = customerLookup.get('13800138002');
  if (voidedOrder && voidedCustomer) {
    await prisma.revenue.upsert({
      where: { revenueNo: 'DEMO-REV-1007' },
      update: {
        orderId: voidedOrder.id,
        technicianId: primaryTechnician.id,
        customerId: voidedCustomer.id,
        amount: 228,
        status: 'voided',
        recognizedAt: daysAgo(28, 13, 10),
        voidedAt: daysAgo(25, 10, 0),
      },
      create: {
        revenueNo: 'DEMO-REV-1007',
        orderId: voidedOrder.id,
        technicianId: primaryTechnician.id,
        customerId: voidedCustomer.id,
        amount: 228,
        status: 'voided',
        recognizedAt: daysAgo(28, 13, 10),
        voidedAt: daysAgo(25, 10, 0),
      },
    });
  }

  const artistApplications = [
    {
      phone: '13800138120',
      name: '李可',
      city: '上海',
      serviceMode: 'both',
      experience: '5年',
      specialty: '日式透色、法式',
      note: '希望入驻平台接晚间到店订单',
      status: 'pending',
    },
    {
      phone: '13800138121',
      name: '顾一宁',
      city: '杭州',
      serviceMode: 'home',
      experience: '3年',
      specialty: '上门纯色快做',
      note: '已有稳定客群，想补工作日下午单',
      status: 'approved',
    },
    {
      phone: '13800138122',
      name: '苏夏',
      city: '苏州',
      serviceMode: 'shop',
      experience: '2年',
      specialty: '穿戴甲、贴片',
      note: '准备转全职',
      status: 'rejected',
    },
    {
      phone: '13800138123',
      name: '周桃',
      city: '上海',
      serviceMode: 'both',
      experience: '6年',
      specialty: '新娘甲、精致延长',
      note: '有婚礼跟妆合作资源',
      status: 'approved',
    },
  ];

  const artistApplicationPhones: string[] = [];
  for (const seed of artistApplications) {
    const existingRecords = prisma.artistApplication.findMany
      ? await prisma.artistApplication.findMany({
          where: { phone: seed.phone },
          orderBy: { id: 'asc' },
        })
      : [];
    const existing =
      existingRecords[0] ??
      (await prisma.artistApplication.findFirst({
        where: { phone: seed.phone },
      }));

    const data = {
      name: seed.name,
      phone: seed.phone,
      city: seed.city,
      serviceMode: seed.serviceMode,
      experience: seed.experience,
      specialty: seed.specialty,
      note: seed.note,
      status: seed.status,
      reviewedBy: seed.status === 'pending' ? null : 1,
      reviewedAt: seed.status === 'pending' ? null : daysAgo(5),
    };

    if (existing) {
      await prisma.artistApplication.update({
        where: { id: existing.id },
        data,
      });
      if (existingRecords.length > 1 && prisma.artistApplication.deleteMany) {
        await prisma.artistApplication.deleteMany({
          where: {
            id: {
              in: existingRecords
                .slice(1)
                .map((record: { id: number }) => record.id),
            },
          },
        });
      }
    } else {
      await prisma.artistApplication.create({ data });
    }

    artistApplicationPhones.push(seed.phone);
  }

  return {
    technicianPhone: PRIMARY_TECHNICIAN_PHONE,
    clientPhones: DEMO_CLIENTS.map((item) => item.phone),
    orderNos,
    revenueNos,
    customServiceRequestNos,
    artistApplicationPhones,
  };
}
