import type { ServiceSchedule, WorkTimeScheme } from '../contexts/authTypes';

export const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'] as const;
export const DAY_LABELS: Record<string, string> = { mon:'周一',tue:'周二',wed:'周三',thu:'周四',fri:'周五',sat:'周六',sun:'周日' };

export function genId(): string {
  return `s_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export function isNewFormat(s?: ServiceSchedule | null): boolean {
  return !!s && Array.isArray(s.schemes);
}

// old days{} -> one default scheme; new format -> as-is; empty -> one default scheme
export function normalizeSchedule(saved?: ServiceSchedule | null): ServiceSchedule {
  if (saved && Array.isArray(saved.schemes)) {
    return {
      ...saved,
      schemes: saved.schemes,
      activeSchemeId: saved.activeSchemeId ?? saved.schemes[0]?.id ?? null,
      restDays: saved.restDays ?? [],
    };
  }
  if (saved?.days) {
    const enabled = (DAY_KEYS as readonly string[]).filter((k) => saved.days![k]?.enabled);
    const counts: Record<string, number> = {};
    enabled.forEach((k) => { const d = saved.days![k]; const key = `${d.startTime}-${d.endTime}`; counts[key] = (counts[key] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const [startTime, endTime] = top ? top.split('-') : ['10:00', '21:00'];
    // 保留原可约性：若旧数据所有日都关闭，迁移后 days 为空（仍不可约），不擅自全开
    const scheme: WorkTimeScheme = { id: 'default', label: '默认', startTime, endTime, days: enabled };
    return { ...saved, schemes: [scheme], activeSchemeId: scheme.id, restDays: [] };
  }
  const scheme: WorkTimeScheme = { id: genId(), label: '默认', startTime: '10:00', endTime: '21:00', days: [...DAY_KEYS] };
  return { schemes: [scheme], activeSchemeId: scheme.id, restDays: [] };
}

export function activeScheme(s: ServiceSchedule): WorkTimeScheme | null {
  return s.schemes?.find((x) => x.id === s.activeSchemeId) ?? null;
}

export function hasEffectiveWorkTime(saved?: ServiceSchedule | null): boolean {
  if (!saved) return false;
  if (Array.isArray(saved.schemes)) {
    const active = saved.schemes.find((s) => s.id === saved.activeSchemeId);
    return !!active && Array.isArray(active.days) && active.days.length > 0;
  }
  if (saved.selectedDates && saved.selectedDates.length > 0) return true;
  if (saved.days) return Object.values(saved.days).some((d) => d?.enabled);
  return false;
}

export const FULL_DAY_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

export function daysSummary(days: string[]): string {
  if (days.length === 7) return '每天';
  if (days.length === 0) return '未选择';
  return days.slice()
    .sort((a, b) => (DAY_KEYS as readonly string[]).indexOf(a) - (DAY_KEYS as readonly string[]).indexOf(b))
    .map((d) => DAY_LABELS[d]).join('·');
}