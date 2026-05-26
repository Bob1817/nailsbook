// 预约（订单）状态统一展示规则
// 标签去除"美甲师"/"用户"角色字段，仅保留状态本身
export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_quote: '待报价',
  pending_agree: '待确认',
  pending_confirm: '待确认',
  pending_home: '待上门',
  pending_shop: '待到店',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

export const ORDER_STATUS_COLOR: Record<string, string> = {
  pending_quote: 'bg-amber-100 text-amber-700',
  pending_agree: 'bg-blue-100 text-blue-700',
  pending_confirm: 'bg-purple-100 text-purple-700',
  pending_home: 'bg-green-100 text-green-700',
  pending_shop: 'bg-green-100 text-green-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
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
