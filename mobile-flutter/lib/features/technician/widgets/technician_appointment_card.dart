import 'package:flutter/material.dart';

import '../../../core/theme/design_tokens.dart';

/// 美甲师端统一预约 / 行程卡片。
///
/// 核心字段：日期、星期、时间、客户、类型、价格、地址、状态。
/// （服务内容等其他信息只在预约详情页展示，卡片不显示。）
///
/// - [isTrip] = false（预约卡片）：显示预约状态徽标。
/// - [isTrip] = true（行程卡片）：不显示状态，仅显示服务类型。
///
/// 卡片内不含大按钮，仅保留：客户名后的电话/消息图标、地址后的导航图标。
/// 预约卡片与行程卡片点击进入的是同一个预约详情页。
class TechnicianAppointmentCard extends StatelessWidget {
  final Map<String, dynamic> order;
  final bool isTrip;
  final VoidCallback onTap;
  final VoidCallback onCall;
  final VoidCallback onMessage;
  final VoidCallback onNavigate;

  const TechnicianAppointmentCard({
    super.key,
    required this.order,
    required this.isTrip,
    required this.onTap,
    required this.onCall,
    required this.onMessage,
    required this.onNavigate,
  });

  static const _metaStyle = TextStyle(fontSize: 13, color: DT.textSecondary);

  @override
  Widget build(BuildContext context) {
    final status = order['status']?.toString() ?? '';
    final serviceType = order['serviceType']?.toString() ?? '';
    final start = order['startTime']?.toString() ?? '';
    final end = order['endTime']?.toString() ?? '';
    final address = order['address']?.toString() ?? '';
    final price = (order['quotePrice'] as num?)?.toDouble();

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: DT.surface,
          borderRadius: BorderRadius.circular(DT.rCard),
          border: Border.all(color: DT.border),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _dateBlock(start),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 类型（+ 状态：仅预约卡片）
                  Row(
                    children: [
                      _typePill(serviceType),
                      const Spacer(),
                      if (!isTrip) _statusBadge(status),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _metaRow(Icons.schedule_rounded, _timeRange(start, end)),
                  const SizedBox(height: 7),
                  // 客户 + 电话/消息
                  Row(
                    children: [
                      const Icon(Icons.person_outline_rounded,
                          size: 14, color: DT.textMuted),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(_customerName(order),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: _metaStyle),
                      ),
                      _miniIcon(Icons.phone_rounded, onCall),
                      const SizedBox(width: 8),
                      _miniIcon(Icons.chat_bubble_outline_rounded, onMessage),
                    ],
                  ),
                  const SizedBox(height: 7),
                  _metaRow(Icons.payments_outlined,
                      (price != null && price > 0)
                          ? '¥${price.toStringAsFixed(0)}'
                          : '待报价'),
                  const SizedBox(height: 7),
                  // 地址 + 导航
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined,
                          size: 14, color: DT.textMuted),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(address.isNotEmpty ? address : '地址待确认',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: _metaStyle),
                      ),
                      _miniIcon(Icons.navigation_outlined, onNavigate),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _metaRow(IconData icon, String text) => Row(children: [
        Icon(icon, size: 14, color: DT.textMuted),
        const SizedBox(width: 6),
        Expanded(
          child: Text(text,
              maxLines: 1, overflow: TextOverflow.ellipsis, style: _metaStyle),
        ),
      ]);

  Widget _miniIcon(IconData icon, VoidCallback onTap) => GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          width: 32,
          height: 32,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: DT.surfaceAlt,
            shape: BoxShape.circle,
            border: Border.all(color: DT.border),
          ),
          child: Icon(icon, size: 15, color: DT.primary),
        ),
      );

  Widget _dateBlock(String iso) {
    final d = DateTime.tryParse(iso)?.toLocal();
    const wk = ['一', '二', '三', '四', '五', '六', '日'];
    return Container(
      width: 60,
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
          color: DT.primarySoft, borderRadius: BorderRadius.circular(14)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(d != null ? '${d.month}月' : '--',
              style: const TextStyle(fontSize: 11, color: DT.primary)),
          Text(d != null ? '${d.day}' : '--',
              style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  height: 1.1,
                  color: DT.primary)),
          const SizedBox(height: 2),
          Text(d != null ? '周${wk[d.weekday - 1]}' : '--',
              style: const TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w600, color: DT.primary)),
        ],
      ),
    );
  }

  Widget _typePill(String s) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
            color: DT.primarySoft, borderRadius: BorderRadius.circular(DT.rFull)),
        child: Text(_serviceTypeLabel(s),
            style: const TextStyle(
                fontSize: 12, fontWeight: FontWeight.w600, color: DT.primary)),
      );

  Widget _statusBadge(String s) {
    final c = _statusColors(s);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration:
          BoxDecoration(color: c.$1, borderRadius: BorderRadius.circular(DT.rFull)),
      child: Text(_statusLabel(s),
          style:
              TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: c.$2)),
    );
  }

  // ── 数据 / 文案 ──

  static String _customerName(Map<String, dynamic> o) =>
      o['customerName']?.toString() ??
      (o['client'] as Map<String, dynamic>?)?['nickname']?.toString() ??
      (o['customer'] as Map<String, dynamic>?)?['name']?.toString() ??
      '客户';

  static String _clock(String s) {
    final d = DateTime.tryParse(s)?.toLocal();
    if (d == null) return '--';
    return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }

  static String _timeRange(String start, String end) {
    if (end.isEmpty) return _clock(start);
    return '${_clock(start)} - ${_clock(end)}';
  }

  static String _serviceTypeLabel(String s) {
    if (s == 'home' || s == '上门美甲') return '上门美甲';
    if (s == 'shop' || s == '到店美甲') return '到店美甲';
    return s.isEmpty ? '预约服务' : s;
  }

  static String _statusLabel(String s) {
    switch (s) {
      case 'pending_quote':
        return '待报价';
      case 'pending_agree':
        return '待确认';
      case 'pending_confirm':
        return '待接单';
      case 'pending_home':
        return '待上门';
      case 'pending_shop':
        return '待到店';
      case 'in_progress':
        return '服务中';
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      case 'expired':
        return '已过期';
      default:
        return s;
    }
  }

  static (Color, Color) _statusColors(String s) {
    switch (s) {
      case 'pending_quote':
        return (DT.statusPendingQuoteBg, DT.statusPendingQuoteText);
      case 'pending_agree':
        return (DT.statusPendingAgreeBg, DT.statusPendingAgreeText);
      case 'pending_confirm':
        return (DT.statusPendingConfirmBg, DT.statusPendingConfirmText);
      case 'pending_home':
      case 'pending_shop':
      case 'in_progress':
        return (DT.statusInProgressBg, DT.statusInProgressText);
      case 'completed':
        return (DT.statusCompletedBg, DT.statusCompletedText);
      case 'cancelled':
        return (DT.statusCancelledBg, DT.statusCancelledText);
      case 'expired':
        return (DT.surfaceAlt, DT.textSecondary);
      default:
        return (DT.surface, DT.textSecondary);
    }
  }
}
