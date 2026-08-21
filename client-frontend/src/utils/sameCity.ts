import type { ClientAddress } from '../services/address';

export const normCity = (s?: string | null) => (s || '').trim().replace(/市$/, '');
export const normProv = (s?: string | null) => (s || '').trim().replace(/[省市]$/, '');

export function sameCity(
  addr: Pick<ClientAddress, 'province' | 'city'>,
  tech: { province?: string | null; city?: string | null },
): boolean {
  if (!tech.city) return true; // 技师未设城市则不限制
  return normCity(addr.city) === normCity(tech.city);
}
