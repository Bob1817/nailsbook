import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/nb_toast.dart';
import 'technician_order_detail_screen.dart';
import 'technician_order_service.dart';

/// 需要美甲师操作的预约状态：待报价、客户已同意待确认接单。
const _kActionStatuses = {'pending_quote', 'pending_confirm'};

/// 美甲师待办预约提醒弹窗。
///
/// 每次进入 app 后，若存在需要美甲师操作的预约（待报价 / 待确认接单），
/// 弹窗集中提示：展示核心信息 + 操作按钮，操作后给出结果反馈。
class TechnicianPendingActionsDialog extends StatefulWidget {
  final List<Map<String, dynamic>> orders;
  const TechnicianPendingActionsDialog({super.key, required this.orders});

  /// 拉取待办预约并弹窗；无待办则不弹。
  static Future<void> maybeShow(BuildContext context) async {
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      final all = await TechnicianOrderService(api).list();
      final pending = all
          .where((o) => _kActionStatuses.contains(o['status']?.toString()))
          .toList();
      if (pending.isEmpty || !context.mounted) return;
      await showDialog<void>(
        context: context,
        barrierDismissible: true,
        builder: (_) => TechnicianPendingActionsDialog(orders: pending),
      );
    } catch (_) {
      // 静默失败：提醒为辅助功能，不阻断进入 app。
    }
  }

  @override
  State<TechnicianPendingActionsDialog> createState() =>
      _TechnicianPendingActionsDialogState();
}

class _TechnicianPendingActionsDialogState
    extends State<TechnicianPendingActionsDialog> {
  late final List<Map<String, dynamic>> _orders = [...widget.orders];
  int? _busyId;

  Future<void> _confirm(Map<String, dynamic> order) async {
    final id = order['id'] as int;
    setState(() => _busyId = id);
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      await TechnicianOrderService(api).confirm(id);
      if (!mounted) return;
      NbToast.success(context, '已确认接单，请按时提供服务');
      setState(() {
        _orders.removeWhere((o) => o['id'] == id);
        _busyId = null;
      });
      if (_orders.isEmpty && mounted) Navigator.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      setState(() => _busyId = null);
      NbToast.error(context, '确认失败，请重试');
    }
  }

  void _goQuote(Map<String, dynamic> order) {
    final id = order['id'] as int;
    Navigator.of(context).pop();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TechnicianOrderDetailScreen(orderId: id),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: DT.surface,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28, vertical: 40),
      shape:
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(DT.rCard)),
      child: ConstrainedBox(
        constraints:
            BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.7),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(DT.xl, DT.lg, DT.xl, DT.sm),
              child: Row(
                children: [
                  const Icon(CupertinoIcons.bell_fill,
                      size: 18, color: DT.primary),
                  const SizedBox(width: DT.sm),
                  Expanded(
                    child: Text('待处理预约 (${_orders.length})',
                        style: DT.titleMedium),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: DT.xl),
              child: Text('以下预约需要你尽快处理，以免影响客户体验',
                  style: DT.captionLarge.copyWith(color: DT.textTertiary)),
            ),
            const SizedBox(height: DT.md),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(horizontal: DT.xl),
                itemCount: _orders.length,
                separatorBuilder: (_, __) => const SizedBox(height: DT.sm),
                itemBuilder: (_, i) => _orderTile(_orders[i]),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl, DT.lg),
              child: SizedBox(
                width: double.infinity,
                height: 44,
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: TextButton.styleFrom(foregroundColor: DT.textSecondary),
                  child: const Text('稍后处理'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _orderTile(Map<String, dynamic> order) {
    final id = order['id'] as int;
    final status = order['status']?.toString() ?? '';
    final isQuote = status == 'pending_quote';
    final busy = _busyId == id;

    return Container(
      padding: const EdgeInsets.all(DT.md),
      decoration: BoxDecoration(
        color: DT.surfaceAlt,
        borderRadius: BorderRadius.circular(DT.rMd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(_customerName(order),
                    style: DT.titleSmall, overflow: TextOverflow.ellipsis),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: DT.primarySoft,
                    borderRadius: BorderRadius.circular(999)),
                child: Text(isQuote ? '待报价' : '待确认接单',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: DT.primary)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(_serviceName(order),
              style: DT.bodySmall.copyWith(color: DT.textSecondary),
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          Text(_timeLabel(order),
              style: DT.captionLarge.copyWith(color: DT.textTertiary)),
          const SizedBox(height: DT.sm),
          SizedBox(
            width: double.infinity,
            height: 40,
            child: ElevatedButton(
              onPressed: busy ? null : () => isQuote ? _goQuote(order) : _confirm(order),
              style: ElevatedButton.styleFrom(
                backgroundColor: DT.cream,
                foregroundColor: DT.onCream,
                elevation: 0,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(DT.rMd)),
              ),
              child: busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CupertinoActivityIndicator())
                  : Text(isQuote ? '去报价' : '确认接单',
                      style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }

  String _customerName(Map<String, dynamic> order) {
    final m = (order['customer'] ?? order['client'] ?? order['clientUser'])
        as Map<String, dynamic>?;
    return order['customerName']?.toString() ??
        m?['name']?.toString() ??
        m?['nickname']?.toString() ??
        '客户';
  }

  String _serviceName(Map<String, dynamic> order) {
    final s = order['serviceName']?.toString();
    if (s != null && s.isNotEmpty) return s;
    final t = order['customTitle']?.toString();
    if (t != null && t.isNotEmpty) return t;
    return '美甲服务';
  }

  String _timeLabel(Map<String, dynamic> order) {
    final dt = DateTime.tryParse(order['startTime']?.toString() ?? '');
    if (dt == null) return '时间待定';
    final two = (int n) => n.toString().padLeft(2, '0');
    return '${dt.month}月${dt.day}日 ${two(dt.hour)}:${two(dt.minute)}';
  }
}
