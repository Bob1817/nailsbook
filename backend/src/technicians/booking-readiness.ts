import { Prisma } from '@prisma/client';

// The same filtered count is used by the private checklist and booking gates.
export const bookingSetupRelations = {
  brandProfile: true,
  _count: { select: { nailWorks: { where: {
    isVisible: true, archivedAt: null, publicationStatus: 'approved',
    visibilityScope: 'public', coverUrl: { not: '' },
  } } } },
} satisfies Prisma.TechnicianInclude;

type TechnicianBookingConfig = {
  status?: string;
  homeService: boolean;
  shopService: boolean;
  serviceItems?: string | null;
  serviceSchedule?: string | null;
  shopAddresses?: string | null;
  avatarUrl?: string | null;
  brandProfile?: {
    brandName?: string | null;
    heroImageUrl?: string | null;
    artistIntroduction?: string | null;
    publicationStatus?: string;
  } | null;
  _count?: { nailWorks: number };
};

function jsonArray(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function jsonObject(value?: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function bookingReadiness(
  technician: TechnicianBookingConfig,
  serviceType?: '上门美甲' | '到店美甲',
) {
  const issues: string[] = [];
  if (technician.status && technician.status !== 'active') {
    issues.push('美甲师当前未开启接单');
  }
  if (!technician.homeService && !technician.shopService) {
    issues.push('请至少开启一种服务方式');
  }
  if (serviceType === '上门美甲' && !technician.homeService) {
    issues.push('尚未开启上门服务');
  }
  if (serviceType === '到店美甲' && !technician.shopService) {
    issues.push('尚未开启到店服务');
  }

  const activeItems = jsonArray(technician.serviceItems).filter(
    (item: any) =>
      item &&
      item.isActive !== false &&
      typeof item.name === 'string' &&
      item.name.trim() &&
      item.price !== null && item.price !== '' &&
      Number.isFinite(Number(item.price)) &&
      Number(item.price) >= 0 &&
      Number.isFinite(Number(item.durationMinutes)) &&
      Number(item.durationMinutes) > 0,
  );
  if (activeItems.length === 0)
    issues.push('请配置启用中的服务项目、价格和时长');

  const schedule: any = jsonObject(technician.serviceSchedule);
  const schemes = Array.isArray(schedule?.schemes) ? schedule.schemes : [];
  const activeScheme = schemes.find(
    (item: any) => item?.id && item.id === schedule?.activeSchemeId,
  );
  if (
    !activeScheme ||
    !Array.isArray(activeScheme.days) ||
    activeScheme.days.length === 0 ||
    !activeScheme.days.every((day: string) => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(day)) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(activeScheme.startTime || '') ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(activeScheme.endTime || '') ||
    activeScheme.startTime >= activeScheme.endTime
  ) {
    issues.push('请配置并启用有效的工作时间方案');
  }

  if (serviceType === '到店美甲' || (!serviceType && technician.shopService)) {
    const enabledShops = jsonArray(technician.shopAddresses).filter(
      (item: any) =>
        item &&
        item.enabled !== false &&
        typeof (item.detailAddress || item.address) === 'string' &&
        (item.detailAddress || item.address).trim(),
    );
    if (technician.shopService && enabledShops.length === 0) {
      issues.push('请配置至少一个启用中的门店地址');
    }
  }

  const brand = technician.brandProfile;
  if (!technician.avatarUrl?.trim() || !brand?.brandName?.trim() ||
      !brand.heroImageUrl?.trim() || !brand.artistIntroduction?.trim() ||
      brand.publicationStatus !== 'published') {
    issues.push('请完善主页头像、名称、背景图和自我介绍，并公开主页');
  }
  if (!technician._count?.nailWorks) {
    issues.push('请上传至少一个有封面、审核通过且公开展示的作品');
  }

  return { ready: issues.length === 0, issues };
}

export function bookingSetup(technician: TechnicianBookingConfig) {
  const { issues } = bookingReadiness({ ...technician, status: 'active' });
  const definitions = [
    { key: 'shop', title: '完善店铺信息', match: /服务方式|到店|门店/, hint: '开启到店服务，添加并启用客户可到达的门店地址' },
    { key: 'services', title: '制定服务与价格', match: /服务项目/, hint: '至少上架一项服务，填写名称、价格与预计时长' },
    { key: 'homepage', title: '完善美甲师主页', match: /主页/, hint: '设置头像、背景图和介绍，补充环境照片、卫生说明及取消规则，再公开主页' },
    { key: 'works', title: '上传代表作品', match: /作品/, hint: '至少一个有封面、审核通过且对所有客户公开的作品；待审核不算完成' },
    { key: 'schedule', title: '安排工作时间', match: /工作时间/, hint: '选择工作日和起止时间，启用并保存时间方案' },
  ];
  const steps = definitions.map(({ match, ...step }) => ({
    ...step, done: !issues.some(issue => match.test(issue)),
  }));
  return { steps, completed: steps.filter(step => step.done).length,
    total: steps.length, ready: issues.length === 0,
    accepting: technician.status === 'active' && issues.length === 0 };
}
