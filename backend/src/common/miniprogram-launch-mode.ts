import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

const DISABLED_VALUES = new Set(['0', 'false', 'off', 'no']);
let configuredTechnicianId: number | null | undefined;

export function isMiniProgramLaunchMode() {
  const value = String(process.env.MINIPROGRAM_LAUNCH_MODE ?? 'true')
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
  return allowedId !== null && technicianId === allowedId;
}

export function assertLaunchShopService(serviceType?: string | null) {
  if (
    isMiniProgramLaunchMode() &&
    serviceType &&
    serviceType !== '到店美甲' &&
    serviceType !== 'shop'
  ) {
    throw new BadRequestException('小程序首期仅支持到店美甲');
  }
}
