import { bookingReadiness, bookingSetup, bookingSetupRelations } from './booking-readiness';

describe('bookingReadiness', () => {
  const complete = {
    status: 'active',
    avatarUrl: '/avatar.jpg',
    brandProfile: { brandName: '工作室', heroImageUrl: '/cover.jpg', artistIntroduction: '专注手绘美甲', publicationStatus: 'published' },
    _count: { nailWorks: 1 },

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
  it('五项资料齐全仍需主动开启，暂停不影响准备进度', () => {
    expect(bookingSetup({ ...complete, status: 'inactive' })).toMatchObject({
      completed: 5, total: 5, ready: true, accepting: false,
    });
    expect(bookingSetup(complete).accepting).toBe(true);
  });

  it.each([
    ['主页未公开', { brandProfile: { ...complete.brandProfile, publicationStatus: 'draft' } }, 'homepage'],
    ['头像缺失', { avatarUrl: '' }, 'homepage'],
    ['自我介绍缺失', { brandProfile: { ...complete.brandProfile, artistIntroduction: ' ' } }, 'homepage'],
    ['没有审核通过的公开作品', { _count: { nailWorks: 0 } }, 'works'],
  ])('%s 不阻止接单，但保留可选完善提示', (_name, missing, key) => {
    const technician = { ...complete, ...missing };
    expect(bookingReadiness(technician).ready).toBe(true);
    const setup = bookingSetup(technician);
    expect(setup).toMatchObject({ ready: true, accepting: true, requiredCompleted: 3, requiredTotal: 3, optionalCompleted: 1, optionalTotal: 2 });
    expect(setup.steps.find(step => step.key === key)).toMatchObject({ required: false, done: false });
  });

  it.each([
    ['缺少价格', { serviceItems: '[{"name":"护理","price":"","durationMinutes":60}]' }, 'services'],
    ['非法工作日', { serviceSchedule: '{"activeSchemeId":"a","schemes":[{"id":"a","days":["wrong"],"startTime":"09:00","endTime":"18:00"}]}' }, 'schedule'],
    ['非法工作时间', { serviceSchedule: '{"activeSchemeId":"a","schemes":[{"id":"a","days":["mon"],"startTime":"25:00","endTime":"26:00"}]}' }, 'schedule'],
  ])('%s 时清单和预约校验都拒绝完成', (_name, missing, key) => {
    const technician = { ...complete, ...missing };
    expect(bookingReadiness(technician).ready).toBe(false);
    const setup = bookingSetup(technician);
    expect(setup.ready).toBe(false);
    expect(setup.steps.find(step => step.key === key)?.done).toBe(false);
  });

  it('作品完成条件排除待审核、下架、私密及无封面作品', () => {
    expect(bookingSetupRelations._count.select.nailWorks.where).toEqual({
      isVisible: true, archivedAt: null, publicationStatus: 'approved',
      visibilityScope: 'public', coverUrl: { not: '' },
    });
  });

});
