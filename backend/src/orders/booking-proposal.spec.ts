import { depositFen, proposalSnapshot, quoteTotals } from './booking-proposal';

describe('预约方案金额和确认基准', () => {
  it('先组合优惠、再附加费、最后优惠，比例定金基于最终价', () => {
    const q = quoteTotals(18000, 16000, 5000, 20000);
    expect(q.finalDiscountFen).toBe(1000);
    expect(depositFen(q.finalFen, 'percentage', 2000)).toBe(4000);
    expect(depositFen(q.finalFen)).toBe(0);
    expect(depositFen(q.finalFen, 'fixed', 6000)).toBe(6000);
  });
  it('未知基数保留待计算，非法金额和定金不能通过', () => {
    expect(depositFen(null, 'percentage', 2000)).toBeNull();
    expect(() => depositFen(100, 'fixed', 101)).toThrow();
    expect(() => depositFen(100, 'percentage', 10001)).toThrow();
    expect(() => quoteTotals(100, 80, 20, 101)).toThrow();
  });
  it('真实收款与内部备注不触发方案变化，降价与改期会触发', () => {
    const order = { startTime: '2026-09-15T06:00:00Z', endTime: '2026-09-15T08:00:00Z', finalPriceFen: 20000, depositAmount: 0 };
    expect(proposalSnapshot({ ...order, isDepositPaid: true, quoteRemark: '内部备注' })).toBe(proposalSnapshot(order));
    expect(proposalSnapshot({ ...order, finalPriceFen: 19000 })).not.toBe(proposalSnapshot(order));
    expect(proposalSnapshot({ ...order, depositAmount: 40 })).not.toBe(proposalSnapshot(order));
  });
});
