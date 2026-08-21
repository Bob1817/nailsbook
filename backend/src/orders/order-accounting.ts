type OrderAmounts = {
  quotePrice?: number | null;
  fundDiscountAmount?: number | null;
  paidAmount?: number | null;
  paymentStatus?: string | null;
};

export function payableAmount(order: OrderAmounts) {
  return Math.max(0, (order.quotePrice ?? 0) - (order.fundDiscountAmount ?? 0));
}

export function confirmedPaidAmount(order: OrderAmounts) {
  return Math.min(payableAmount(order), Math.max(0, order.paidAmount ?? 0));
}

export function isFullyPaid(order: OrderAmounts) {
  const payable = payableAmount(order);
  return (
    payable > 0 &&
    order.paymentStatus === 'paid' &&
    confirmedPaidAmount(order) >= payable
  );
}

export function revenueSnapshot(order: OrderAmounts) {
  return {
    amount: confirmedPaidAmount(order),
    status: isFullyPaid(order) ? 'confirmed' : 'pending',
  };
}
