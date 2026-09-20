import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

const DISABLED_VALUES = new Set(['0', 'false', 'off', 'no']);
let configuredTechnicianId: number | null | undefined;

export function isMiniProgramLaunchMode() {
  // 多租户是默认产品行为；首期单美甲师限制必须显式开启。
  const value = String(process.env.MINIPROGRAM_LAUNCH_MODE ?? 'false')
    .trim()
    .toLowerCase();
  return !DISABLED_VALUES.has(value);
}

export function assertMiniProgramFeatureDisabled(feature: string): never {
  throw new ServiceUnavailableException(`${feature}在小程序首期版本暂未开放`);
}

export function launchTechnicianId() {
  if (configuredTechnicianId !== undefined) return configuredTechnicianId;
  const value = Number(process.env.MINIPROGRAM_TECHNICIAN_ID);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function configureLaunchTechnicianId(id: number | null) {
  configuredTechnicianId = Number.isInteger(id) && Number(id) > 0 ? Number(id) : null;
}

export function resetLaunchTechnicianIdConfiguration() {
  configuredTechnicianId = undefined;
}

export function launchTechnicianFilterId() {
  if (!isMiniProgramLaunchMode()) return null;
  return launchTechnicianId() ?? -1;
}

export function isLaunchTechnician(technicianId: number) {
  if (!isMiniProgramLaunchMode()) return true;
  const allowedId = launchTechnicianId();
  // 未配置具体美甲师时不能把所有客户误判为未绑定。
  return allowedId === null || technicianId === allowedId;
}

export function assertLaunchShopService(serviceType?: string | null) {
  if (serviceType && !['到店美甲', 'shop', '上门美甲', 'home'].includes(serviceType)) {
    throw new BadRequestException('请选择有效的服务类型');
  }
}
