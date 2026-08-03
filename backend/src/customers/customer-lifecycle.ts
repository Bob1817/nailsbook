export type CustomerLifecycleStatus =
  | 'new'
  | 'active'
  | 'due'
  | 'dormant';

const DAY_MS = 86_400_000;

export function calculateCustomerLifecycle(
  completedServiceDates: Date[],
  now: Date = new Date(),
  defaultServiceCycleDays = 28,
) {
  const dates = completedServiceDates
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) {
    return {
      status: 'new' as CustomerLifecycleStatus,
      reason: '尚未完成首次服务',
      expectedNextServiceAt: null,
      serviceCycleDays: defaultServiceCycleDays,
      serviceCycleSource: 'default' as const,
    };
  }

  let averageServiceCycleDays: number | null = null;
  if (dates.length >= 2) {
    const totalIntervalDays = dates.slice(1).reduce(
      (sum, date, index) =>
        sum + (date.getTime() - dates[index].getTime()) / DAY_MS,
      0,
    );
    averageServiceCycleDays =
      Math.round((totalIntervalDays / (dates.length - 1)) * 10) / 10;
  }

  const serviceCycleDays =
    averageServiceCycleDays ?? defaultServiceCycleDays;
  const lastServiceAt = dates[dates.length - 1];
  const expectedNextServiceAt = new Date(
    lastServiceAt.getTime() + serviceCycleDays * DAY_MS,
  );
  const dormantAt = new Date(
    expectedNextServiceAt.getTime() + defaultServiceCycleDays * DAY_MS,
  );

  let status: CustomerLifecycleStatus;
  let reason: string;
  if (dates.length === 1 && now < expectedNextServiceAt) {
    status = 'new';
    reason = '已完成首次服务，仍在首个复购周期内';
  } else if (now < expectedNextServiceAt) {
    status = 'active';
    reason = '最近服务尚未达到预计复购日期';
  } else if (now < dormantAt) {
    status = 'due';
    reason = '已达到预计复购日期，建议主动跟进';
  } else {
    status = 'dormant';
    reason = '超过预计复购日期一个默认周期';
  }

  return {
    status,
    reason,
    expectedNextServiceAt,
    serviceCycleDays,
    serviceCycleSource:
      averageServiceCycleDays === null ? ('default' as const) : ('personal' as const),
  };
}
