// 预约（订单）状态统一展示规则
// 标签去除"美甲师"/"用户"角色字段，仅保留状态本身
export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_quote: '待报价',
  pending_agree: '待确认',
  pending_confirm: '待确认',
  pending_home: '待上门',
  pending_shop: '待到店',
  in_progress: 'bg-[var(--nb-active-surface)] text-[var(--nb-link)]',
  completed: '已完成',
  cancelled: '已取消',
  expired: '已过期',
};

export const ORDER_STATUS_COLOR: Record<string, string> = {
  pending_quote: 'bg-[var(--nb-page)] text-[var(--nb-ink)]',
  pending_agree: 'bg-[var(--nb-page)] text-[var(--nb-ink)]',
  pending_confirm: 'bg-[var(--nb-page)] text-[var(--nb-ink)]',
  pending_home: 'bg-[var(--nb-page)] text-[var(--nb-ink)]',
  pending_shop: 'bg-[var(--nb-page)] text-[var(--nb-ink)]',
  in_progress: 'bg-[var(--nb-active-surface)] text-[var(--nb-link)]',
  completed: 'bg-[var(--nb-page)] text-[var(--nb-secondary)]',
  cancelled: 'bg-[var(--nb-page)] text-[var(--nb-secondary)]',
  expired: 'bg-[var(--nb-page)] text-[var(--nb-secondary)]',
};

/** 是否轮到客户操作 */
export function isClientTurn(status: string): boolean {
  return status === 'pending_agree';
}

/** 用户端等待对方操作时按钮显示的文案 */
export function clientWaitingLabel(status: string): string | null {
  switch (status) {
    case 'pending_quote':
      return '待美甲师报价';
    case 'pending_confirm':
      return '待美甲师确认';
    case 'pending_home':
      return '等待美甲师上门';
    case 'pending_shop':
      return '等待到店时间';
    case 'in_progress':
      return '服务进行中';
    case 'completed':
      return '已完成';
    case 'cancelled':
      return '已取消';
    default:
      return null;
  }
}
