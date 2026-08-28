import { recordWorkShareRegistration } from './work-share-registration';
import { configureLaunchTechnicianId, resetLaunchTechnicianIdConfiguration } from './miniprogram-launch-mode';
import { validateSync } from 'class-validator';
import { RecordConversionEventDto } from '../conversion-events/dto/record-conversion-event.dto';

describe('服务端注册归因', () => {
  afterEach(() => resetLaunchTechnicianIdConfiguration());
  it('从合法作品解析美甲师，按客户幂等记录，不保存分享令牌', async () => {
    configureLaunchTechnicianId(7);
    const db = { nailWork: { findFirst: jest.fn().mockResolvedValue({ id: 9, techId: 7 }) }, conversionEvent: { upsert: jest.fn() } };
    const token = 'a'.repeat(48);
    await recordWorkShareRegistration(db as any, 3, { shareWorkId: 9, shareToken: token, shareChannel: 'wechat_moments', shareVisitorId: 'visitor' });
    expect(db.nailWork.findFirst.mock.calls[0][0].where.shareGrants.some).toMatchObject({ token, revokedAt: null, expiresAt: { gt: expect.any(Date) } });
    expect(db.conversionEvent.upsert).toHaveBeenCalledWith({
      where: { eventId: 'work-registration-3' }, update: {},
      create: { eventId: 'work-registration-3', eventType: 'registration_completed', clientUserId: 3, workId: 9, technicianId: 7, visitorId: 'visitor', source: 'wechat_moments' },
    });
  });
  it('普通注册、已失效分享不伪造来源', async () => {
    const db = { nailWork: { findFirst: jest.fn().mockResolvedValue(null) }, conversionEvent: { upsert: jest.fn() } };
    await recordWorkShareRegistration(db as any, 3, {});
    expect(db.nailWork.findFirst).not.toHaveBeenCalled();
    await recordWorkShareRegistration(db as any, 3, { shareWorkId: 9 });
    expect(db.conversionEvent.upsert).not.toHaveBeenCalled();
  });
  it('公开遥测接口不能接受客户端伪造注册完成事件', () => {
    const dto = Object.assign(new RecordConversionEventDto(), { eventId: 'fake', technicianId: 7, eventType: 'registration_completed' });
    expect(validateSync(dto).some(error => error.property === 'eventType')).toBe(true);
  });
});
