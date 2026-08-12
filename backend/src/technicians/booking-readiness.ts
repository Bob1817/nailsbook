type TechnicianBookingConfig = {
  status?: string;
  homeService: boolean;
  shopService: boolean;
  serviceItems?: string | null;
  serviceSchedule?: string | null;
  shopAddresses?: string | null;
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
      Number.isFinite(Number(item.price)) &&
      Number(item.price) >= 0 &&
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
    !/^\d{2}:\d{2}$/.test(activeScheme.startTime || '') ||
    !/^\d{2}:\d{2}$/.test(activeScheme.endTime || '') ||
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
    if (serviceType === '到店美甲' && enabledShops.length === 0) {
      issues.push('请配置至少一个启用中的门店地址');
    }
  }

  return { ready: issues.length === 0, issues };
}
