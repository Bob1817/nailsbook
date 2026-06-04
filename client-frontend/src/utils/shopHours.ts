import type { ShopAddress } from '../services/auth';

/** 店铺是否配置了营业时间 */
export function hasBusinessHours(shop?: ShopAddress | null): boolean {
  return !!shop?.businessHours && shop.businessHours.length > 0;
}

/** 取某天（YYYY-MM-DD）对应星期的营业时间条目，无则 null */
export function getShopHoursForDate(shop: ShopAddress | null | undefined, dateStr: string) {
  if (!shop?.businessHours || !dateStr) return null;
  const weekday = new Date(`${dateStr}T00:00:00`).getDay();
  return shop.businessHours.find((item) => item.weekday === weekday) || null;
}

/**
 * 某天店铺是否营业（用于日历日期是否可选）。
 * 未配置营业时间 → 不限制（视为营业）；配置了但当天缺条目或 closed → 休息。
 */
export function isShopOpenOnDate(shop: ShopAddress | null | undefined, dateStr: string): boolean {
  if (!hasBusinessHours(shop)) return true;
  const hours = getShopHoursForDate(shop, dateStr);
  return !!hours && !hours.closed;
}

/**
 * 传给 useTechnicianAvailability.getSlotStatuses 的 shopHours 选项。
 * 未配置营业时间 → null（不限制时段）；当天休息 → {closed:true}；否则 {start,end}。
 */
export function shopHoursOptionForDate(
  shop: ShopAddress | null | undefined,
  dateStr: string,
): { start: string; end: string; closed?: boolean } | null {
  if (!hasBusinessHours(shop)) return null;
  const hours = getShopHoursForDate(shop, dateStr);
  if (!hours || hours.closed) return { start: '', end: '', closed: true };
  return { start: hours.start, end: hours.end };
}
