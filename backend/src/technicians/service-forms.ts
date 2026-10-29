import { BadRequestException } from '@nestjs/common';
import { assertWithinServiceSchedule } from '../orders/order-work-schedule';

export function parseHomeSettings(raw: unknown): any {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
}

export function serviceFormIssues(technician: {
  shopAddresses?: string | null; homeServiceSettings?: unknown;
}, type: 'shop' | 'home'): string[] {
  if (type === 'shop') {
    let shops: any[] = [];
    try { shops = JSON.parse(technician.shopAddresses || '[]'); } catch { /* invalid config */ }
    return Array.isArray(shops) && shops.some(shop => shop && shop.enabled !== false &&
      String(shop.name || '').trim() && String(shop.detailAddress || shop.address || '').trim())
      ? [] : ['请完善至少一家启用店铺的名称和详细地址'];
  }
  const config = parseHomeSettings(technician.homeServiceSettings);
  const issues: string[] = [];
  if (!config || !String(config.province || '').trim() || !String(config.city || '').trim() || config.province === '全部' || config.city === '全部') issues.push('请设置上门服务范围');
  if (!validCoordinates(config?.origin) || !String(config?.origin?.address || '').trim()) issues.push('请在地图上选择上门出发地点');
  const tiers = config?.tiers;
  if (!Array.isArray(tiers) || !tiers.length || tiers.length > 10 || tiers.some((tier, index) =>
    !Number.isFinite(tier?.maxKm) || tier.maxKm <= (index ? tiers[index - 1].maxKm : 0) || tier.maxKm > 200 ||
    !Number.isSafeInteger(tier?.feeFen) || tier.feeFen < 0 || tier.feeFen > 10000000)) issues.push('请按距离递增设置完整的上门费用档位');
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  if (!Array.isArray(config?.days) || !config.days.length || config.days.some(day => !days.includes(day)) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(config?.startTime || '') ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(config?.endTime || '') || config.startTime >= config.endTime) {
    issues.push('请设置有效的上门服务日和时间');
  }
  return issues;
}

export function assertHomeService(technician: { homeServiceSettings?: unknown }, date: string, start: string, duration: number) {
  const issues = serviceFormIssues(technician, 'home');
  if (issues.length) throw new BadRequestException(issues[0]);
  const config = parseHomeSettings(technician.homeServiceSettings);
  assertWithinServiceSchedule(JSON.stringify({ activeSchemeId: 'home', schemes: [{ id: 'home', ...config }] }), date, start, duration);
}

export function validCoordinates(point: any) {
  return point && typeof point.latitude === 'number' && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 &&
    typeof point.longitude === 'number' && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}

export function homeServiceQuote(raw: unknown, address: any) {
  const issues = serviceFormIssues({ homeServiceSettings: raw }, 'home');
  if (issues.length) throw new BadRequestException(issues[0]);
  if (!validCoordinates(address)) throw new BadRequestException('请编辑上门地址并在地图上确认位置，以计算上门费');
  const config = parseHomeSettings(raw);
  const normalize = (value?: string) => (value || '').trim().replace(/市$/, '');
  if (normalize(address.city) !== normalize(config.city) || (config.district && config.district !== address.district)) {
    throw new BadRequestException('该地址不在美甲师设置的上门服务区域内');
  }
  const rad = (value: number) => value * Math.PI / 180;
  const a = config.origin;
  const h = Math.sin(rad(address.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(address.latitude)) * Math.sin(rad(address.longitude - a.longitude) / 2) ** 2;
  const distance = 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  const tier = config.tiers.find(item => distance <= item.maxKm);
  if (!tier) throw new BadRequestException('该地址超出最大上门距离，请更换地址或选择到店美甲');
  return { distanceKm: Math.round(distance * 100) / 100, feeFen: tier.feeFen, maxKm: tier.maxKm, distanceType: 'straight_line' };
}

export function publicHomeSettings(raw: unknown) {
  const config = parseHomeSettings(raw);
  if (!config) return null;
  return { province: config.province, city: config.city, district: config.district, tiers: config.tiers,
    days: config.days, startTime: config.startTime, endTime: config.endTime };
}
