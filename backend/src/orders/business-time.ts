export const BUSINESS_TIMEZONE = 'Asia/Shanghai';

export function parseBusinessDateTime(
  serviceDate: string,
  startTime: string,
): Date {
  return new Date(`${serviceDate}T${startTime}:00+08:00`);
}

export function getBusinessDateTimeParts(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== 'literal') result[part.type] = part.value;
      return result;
    }, {});
}
