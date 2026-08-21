import {
  confirmedPaidAmount,
  isFullyPaid,
  payableAmount,
  revenueSnapshot,
} from './order-accounting';

describe('order accounting', () => {
  it('separates payable amount from confirmed payment', () => {
    const order = {
      quotePrice: 200,
      fundDiscountAmount: 20,
      paidAmount: 50,
      paymentStatus: 'partial',
    };
    expect(payableAmount(order)).toBe(180);
    expect(confirmedPaidAmount(order)).toBe(50);
    expect(revenueSnapshot(order)).toEqual({ amount: 50, status: 'pending' });
  });

  it('confirms revenue only after the payable amount is fully paid', () => {
    const order = {
      quotePrice: 200,
      fundDiscountAmount: 20,
      paidAmount: 180,
      paymentStatus: 'paid',
    };
    expect(isFullyPaid(order)).toBe(true);
    expect(revenueSnapshot(order)).toEqual({
      amount: 180,
      status: 'confirmed',
    });
  });

  it('does not treat a zero-payable order as cash revenue', () => {
    const order = {
      quotePrice: 20,
      fundDiscountAmount: 20,
      paidAmount: 0,
      paymentStatus: 'paid',
    };
    expect(isFullyPaid(order)).toBe(false);
    expect(revenueSnapshot(order)).toEqual({ amount: 0, status: 'pending' });
  });
});
