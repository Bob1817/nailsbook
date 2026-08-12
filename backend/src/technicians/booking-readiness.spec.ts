import { bookingReadiness } from './booking-readiness';

describe('bookingReadiness', () => {
  const complete = {
    status: 'active',
    homeService: true,
    shopService: false,
    serviceItems: JSON.stringify([
      {
        id: 'basic',
        name: '基础美甲',
        price: 128,
        durationMinutes: 90,
        isActive: true,
      },
    ]),
    serviceSchedule: JSON.stringify({
      activeSchemeId: 'regular',
      schemes: [
        { id: 'regular', days: ['mon'], startTime: '09:00', endTime: '18:00' },
      ],
    }),
    shopAddresses: null,
  };

  it('服务、价格、时长和工作时间完整时允许接单', () => {
    expect(bookingReadiness(complete, '上门美甲')).toEqual({
      ready: true,
      issues: [],
    });
  });

  it('缺少服务项目或工作时间时保持关闭', () => {
    const result = bookingReadiness({
      ...complete,
      serviceItems: null,
      serviceSchedule: null,
    });
    expect(result.ready).toBe(false);
    expect(result.issues).toHaveLength(2);
  });

  it('到店服务必须配置启用门店', () => {
    const result = bookingReadiness(
      { ...complete, homeService: false, shopService: true },
      '到店美甲',
    );
    expect(result.ready).toBe(false);
    expect(result.issues.join()).toContain('门店地址');
  });
});
