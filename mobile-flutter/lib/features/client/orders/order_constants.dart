import '../../../core/theme/colors.generated.dart';

const orderStatusLabels = {
  'pending_quote': '待报价',
  'pending_agree': '待同意',
  'pending_confirm': '待确认',
  'pending_home': '待上门',
  'pending_shop': '待到店',
  'in_progress': '服务中',
  'completed': '已完成',
  'cancelled': '已取消',
  'expired': '已过期',
};

const orderStatusColors = {
  'pending_quote': (NBColors.page, NBColors.action),
  'pending_agree': (NBColors.page, NBColors.action),
  'pending_confirm': (NBColors.page, NBColors.action),
  'pending_home': (NBColors.page, NBColors.action),
  'pending_shop': (NBColors.page, NBColors.action),
  'in_progress': (NBColors.page, NBColors.action),
  'completed': (NBColors.surface, NBColors.secondary),
  'cancelled': (NBColors.page, NBColors.action),
  'expired': (NBColors.surface, NBColors.control),
};

const upcomingStatuses = {
  'pending_quote',
  'pending_agree',
  'pending_confirm',
  'pending_home',
  'pending_shop',
  'in_progress',
};
