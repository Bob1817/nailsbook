import { assertWithinServiceSchedule } from './order-work-schedule';

const schedule = JSON.stringify({
  schemes: [{ id: 'weekday', days: ['mon'], startTime: '10:00', endTime: '18:00' }],
  activeSchemeId: 'weekday',
  restDays: ['2026-08-10'],
});

describe('assertWithinServiceSchedule', () => {
  it('完整服务区间位于工作时间内时通过', () => {
    expect(() => assertWithinServiceSchedule(schedule, '2026-08-03', '10:00', 120)).not.toThrow();
  });

  it('拒绝休息日和非工作日', () => {
    expect(() => assertWithinServiceSchedule(schedule, '2026-08-10', '10:00', 60)).toThrow('休息日');
    expect(() => assertWithinServiceSchedule(schedule, '2026-08-04', '10:00', 60)).toThrow('工作日');
  });

  it('结束时间超过工作时间时拒绝', () => {
    expect(() => assertWithinServiceSchedule(schedule, '2026-08-03', '17:00', 120)).toThrow('工作时间');
  });

  it('未配置时使用每天10点至21点的现有默认方案', () => {
    expect(() => assertWithinServiceSchedule(null, '2026-08-03', '10:00', 120)).not.toThrow();
    expect(() => assertWithinServiceSchedule(null, '2026-08-03', '20:00', 120)).toThrow('工作时间');
  });
});
