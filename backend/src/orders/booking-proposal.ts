import { BadRequestException } from '@nestjs/common';

export const SURCHARGE_CATEGORIES = ['surcharge_home', 'surcharge_night', 'surcharge_holiday'];

export function depositFen(total: number | null, mode = 'none', value = 0): number | null {
  if (!['none', 'fixed', 'percentage'].includes(mode) || !Number.isInteger(value) || value < 0 ||
      (mode === 'percentage' && value > 10000) || value > 100000000) {
    throw new BadRequestException('定金设置无效');
  }
  const amount = mode === 'fixed' ? value : mode === 'percentage' ? (total == null ? null : Math.round(total * value / 10000)) : 0;
  if (amount != null && total != null && amount > total) throw new BadRequestException('定金不能超过最终总价');
  return amount;
}

export function proposalSnapshot(order: any, lines = order.serviceLines || []) {
  const pricing = order.pricingDetails ? (typeof order.pricingDetails === 'string' ? JSON.parse(order.pricingDetails) : order.pricingDetails) : null;
  const extras = lines.filter((line: any) => line.source === 'surcharge').reduce((sum: number, line: any) => sum + line.subtotalFen, 0);
  return JSON.stringify({
    core: pricing ? pricing.coreFen : order.finalPriceFen == null ? null : order.finalPriceFen - extras,
    finalDiscount: pricing ? pricing.finalDiscountFen : 0,
    start: new Date(order.startTime).toISOString(), end: new Date(order.endTime).toISOString(),
    address: order.address || '', type: order.serviceType || '',
    price: order.finalPriceFen ?? null, deposit: Math.round((order.depositAmount || 0) * 100),
    depositMode: order.depositModeSnapshot || 'none', depositValue: order.depositValueSnapshot || 0,
    lines: lines.map((line: any) => ({
      id: line.servicePublicIdSnapshot || null, name: line.nameSnapshot,
      price: line.unitPriceFen, quantity: line.quantity, duration: line.durationMinutes,
      source: line.source === 'surcharge' ? 'surcharge' : 'base',
    })).sort((a: any, b: any) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  });
}

export function quoteTotals(baseFen: number, coreFen: number, extrasFen: number, finalFen?: number) {
  const total = finalFen ?? coreFen + extrasFen;
  if ([baseFen, coreFen, extrasFen, total].some(n => !Number.isSafeInteger(n) || n < 0 || n > 100000000) || total > coreFen + extrasFen) {
    throw new BadRequestException('最终报价或服务明细无效，请在明细中列出额外费用');
  }
  return { baseFen, coreFen, extrasFen, finalFen: total, finalDiscountFen: coreFen + extrasFen - total };
}
