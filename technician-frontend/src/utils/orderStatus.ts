// 预约（订单）状态统一展示规则
// 标签去除"美甲师"/"用户"角色字段
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

export const ORDER_STATUS_PILL: Record<string, string> = {
  pending_quote: 'bg-[#fff6eb] text-[#b87425]',
  pending_agree: 'bg-[#eef1ff] text-[#4f6cbb]',
  pending_confirm: 'bg-[#f3ecff] text-[#7a4ebd]',
  pending_home: 'bg-[#e8f5e9] text-[#2e7d32]',
  pending_shop: 'bg-[#e3f2fd] text-[#1565c0]',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

/** 美甲师端等待对方操作时按钮文案 */
export function technicianWaitingLabel(status: string): string | null {
  switch (status) {
    case 'pending_agree':
      return '待用户确认';
    case 'pending_home':
      return '待上门';
    case 'pending_shop':
      return '待到店';
    case 'completed':
      return '已完成';
    case 'cancelled':
      return '已取消';
    default:
      return null;
  }
}
