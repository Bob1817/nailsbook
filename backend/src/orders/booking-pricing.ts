import { BadRequestException } from '@nestjs/common';

export type PricedService = {
  id: number;
  publicId: string;
  name: string;
  priceMinFen: number | null;
  durationMinutes: number | null;
};

export type ServiceQuantity = { servicePublicId: string; quantity?: number };

export type ServiceSnapshotLine = {
  serviceId: number | null;
  servicePublicIdSnapshot: string | null;
  nameSnapshot: string;
  unitPriceFen: number;
  durationMinutes: number;
  quantity: number;
  subtotalFen: number;
  sortOrder: number;
};

export function buildServiceSnapshotLines(
  services: PricedService[],
  requested: ServiceQuantity[],
): ServiceSnapshotLine[] {
  const byPublicId = new Map(services.map((item) => [item.publicId, item]));
  if (!requested.length)
    throw new BadRequestException('请选择至少一项服务内容');
  return requested.map((selection, index) => {
    const service = byPublicId.get(selection.servicePublicId);
    if (!service)
      throw new BadRequestException('所选服务内容已失效，请重新选择');
    const quantity = selection.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new BadRequestException('服务数量无效');
    }
    if (
      service.priceMinFen == null ||
      service.priceMinFen < 0 ||
      !service.durationMinutes ||
      service.durationMinutes < 1
    ) {
      throw new BadRequestException('所选服务价格或时长配置异常，请重新选择');
    }
    return {
      serviceId: service.id,
      servicePublicIdSnapshot: service.publicId,
      nameSnapshot: service.name,
      unitPriceFen: service.priceMinFen,
      durationMinutes: service.durationMinutes,
      quantity,
      subtotalFen: service.priceMinFen * quantity,
      sortOrder: index,
    };
  });
}

export function summarizeSnapshotLines(lines: ServiceSnapshotLine[]) {
  return {
    serviceSubtotalFen: lines.reduce((sum, item) => sum + item.subtotalFen, 0),
    totalDurationMinutes: lines.reduce(
      (sum, item) => sum + item.durationMinutes * item.quantity,
      0,
    ),
  };
}

export function finalPriceFen(
  serviceSubtotalFen: number,
  discountAmountFen = 0,
) {
  if (!Number.isInteger(discountAmountFen) || discountAmountFen < 0) {
    throw new BadRequestException('优惠金额无效');
  }
  if (discountAmountFen > serviceSubtotalFen) {
    throw new BadRequestException('优惠金额不能超过服务合计');
  }
  return serviceSubtotalFen - discountAmountFen;
}
