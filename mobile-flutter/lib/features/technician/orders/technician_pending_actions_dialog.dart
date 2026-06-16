import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_error.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/nb_toast.dart';
import '../auth/technician_auth_service.dart';
import 'technician_order_detail_screen.dart';
import 'technician_order_service.dart';

/// 需要美甲师操作的预约状态：待报价、客户已同意待确认接单。
const _kActionStatuses = {'pending_quote', 'pending_confirm'};

/// 美甲师待办提醒弹窗：进入 app 后集中提示需要操作的事项
/// —— 客户绑定申请（通过/拒绝）+ 待处理预约（确认接单/去报价）。
class TechnicianPendingActionsDialog extends StatefulWidget {
  final List<Map<String, dynamic>> orders;
  final List<Map<String, dynamic>> bindingApps;
  const TechnicianPendingActionsDialog({
    super.key,
    required this.orders,
    required this.bindingApps,
  });

  /// 拉取待办（绑定申请 + 预约）并弹窗；都为空则不弹。
  static Future<void> maybeShow(BuildContext context) async {
    final api = context.read<ApiClient>()..setRole('technician');
    List<Map<String, dynamic>> orders = const [];
    List<Map<String, dynamic>> apps = const [];
    try {
      final all = await TechnicianOrderService(api).list();
      orders = all
          .where((o) => _kActionStatuses.contains(o['status']?.toString()))
          .toList();
    } catch (_) {}
    try {
      apps = await TechnicianAuthService(api).bindingApplications();
    } catch (_) {}
    if ((orders.isEmpty && apps.isEmpty) || !context.mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (_) =>
          TechnicianPendingActionsDialog(orders: orders, bindingApps: apps),
    );
  }

  @override
  State<TechnicianPendingActionsDialog> createState() =>
      _TechnicianPendingActionsDialogState();
}

class _TechnicianPendingActionsDialogState
    extends State<TechnicianPendingActionsDialog> {
  late final List<Map<String, dynamic>> _orders = [...widget.orders];
  late final List<Map<String, dynamic>> _apps = [...widget.bindingApps];
  int? _busyOrderId;
  int? _busyAppId;

  void _closeIfEmpty() {
    if (_orders.isEmpty && _apps.isEmpty && mounted) Navigator.of(context).pop();
  }

  // ── 预约操作 ──

  Future<void> _confirm(Map<String, dynamic> order) async {
    final id = order['id'] as int;
    setState(() => _busyOrderId = id);
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      await TechnicianOrderService(api).confirm(id);
      if (!mounted) return;
      NbToast.success(context, '已确认接单，请按时提供服务');
      setState(() {
        _orders.removeWhere((o) => o['id'] == id);
        _busyOrderId = null;
      });
      _closeIfEmpty();
    } catch (_) {
      if (!mounted) return;
      setState(() => _busyOrderId = null);
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

  // ── 绑定申请操作 ──

  Future<void> _approveApp(Map<String, dynamic> app) async {
    final id = app['id'] as int;
    setState(() => _busyAppId = id);
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      await TechnicianAuthService(api).approveBinding(id);
      if (!mounted) return;
      NbToast.success(context, '已通过「${app['name'] ?? '客户'}」的绑定申请');
      setState(() {
        _apps.removeWhere((a) => a['id'] == id);
        _busyAppId = null;
      });
      _closeIfEmpty();
    } catch (e) {
      if (!mounted) return;
      setState(() => _busyAppId = null);
      NbToast.error(context,
          e is ApiError && e.message.isNotEmpty ? e.message : '操作失败，请重试');
    }
  }

  Future<void> _rejectApp(Map<String, dynamic> app) async {
    final id = app['id'] as int;
    setState(() => _busyAppId = id);
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      await TechnicianAuthService(api).rejectBinding(id);
      if (!mounted) return;
      NbToast.success(context, '已拒绝该绑定申请');
      setState(() {
        _apps.removeWhere((a) => a['id'] == id);
        _busyAppId = null;
      });
      _closeIfEmpty();
    } catch (e) {
      if (!mounted) return;
      setState(() => _busyAppId = null);
      NbToast.error(context,
          e is ApiError && e.message.isNotEmpty ? e.message : '操作失败，请重试');
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = _orders.length + _apps.length;
    return Dialog(
      backgroundColor: DT.surface,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28, vertical: 40),
      shape:
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(DT.rCard)),
      child: ConstrainedBox(
        constraints:
            BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.72),
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
                    child:
                        Text('待处理事项 ($total)', style: DT.titleMedium),
                  ),
                ],
              ),
            ),
            Flexible(
              child: ListView(
                shrinkWrap: true,
                padding: const EdgeInsets.fromLTRB(DT.xl, DT.sm, DT.xl, 0),
                children: [
                  if (_apps.isNotEmpty) ...[
                    _sectionLabel('客户绑定申请'),
                    ..._apps.map(_appTile),
                  ],
                  if (_orders.isNotEmpty) ...[
                    if (_apps.isNotEmpty) const SizedBox(height: DT.md),
                    _sectionLabel('待处理预约'),
                    ..._orders.map(_orderTile),
                  ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl, DT.lg),
              child: SizedBox(
                width: double.infinity,
                height: 44,
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style:
                      TextButton.styleFrom(foregroundColor: DT.textSecondary),
                  child: const Text('稍后处理'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: DT.sm),
        child: Text(text,
            style: DT.captionLarge.copyWith(color: DT.textTertiary)),
      );

  Widget _appTile(Map<String, dynamic> app) {
    final id = app['id'] as int;
    final busy = _busyAppId == id;
    final note = app['note']?.toString() ?? '';
    return Container(
      margin: const EdgeInsets.only(bottom: DT.sm),
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
                child: Text(app['name']?.toString() ?? '客户',
                    style: DT.titleSmall, overflow: TextOverflow.ellipsis),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: DT.primarySoft,
                    borderRadius: BorderRadius.circular(999)),
                child: const Text('待审批',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: DT.primary)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(app['phone']?.toString() ?? '未填写',
              style: DT.captionLarge.copyWith(color: DT.textTertiary)),
          if (note.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text('备注：$note',
                style: DT.bodySmall.copyWith(color: DT.textSecondary),
                maxLines: 2,
                overflow: TextOverflow.ellipsis),
          ],
          const SizedBox(height: DT.sm),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: busy ? null : () => _rejectApp(app),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: DT.error,
                    side: const BorderSide(color: DT.border),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(DT.rMd)),
                  ),
                  child: const Text('拒绝'),
                ),
              ),
              const SizedBox(width: DT.sm),
              Expanded(
                child: ElevatedButton(
                  onPressed: busy ? null : () => _approveApp(app),
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
                      : const Text('通过',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _orderTile(Map<String, dynamic> order) {
    final id = order['id'] as int;
    final status = order['status']?.toString() ?? '';
    final isQuote = status == 'pending_quote';
    final busy = _busyOrderId == id;

    return Container(
      margin: const EdgeInsets.only(bottom: DT.sm),
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
                    style: const TextStyle(
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
              onPressed:
                  busy ? null : () => isQuote ? _goQuote(order) : _confirm(order),
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
    String two(int n) => n.toString().padLeft(2, '0');
    return '${dt.month}月${dt.day}日 ${two(dt.hour)}:${two(dt.minute)}';
  }
}
