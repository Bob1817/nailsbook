import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import 'technician_order_service.dart';

class TechnicianOrderDetailScreen extends StatefulWidget {
  final int orderId;
  const TechnicianOrderDetailScreen({super.key, required this.orderId});

  @override
  State<TechnicianOrderDetailScreen> createState() =>
      _TechnicianOrderDetailScreenState();
}

class _TechnicianOrderDetailScreenState
    extends State<TechnicianOrderDetailScreen> {
  Map<String, dynamic>? _order;
  bool _loading = true;
  bool _actionLoading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      final order = await TechnicianOrderService(api).detail(widget.orderId);
      if (mounted) setState(() { _order = order; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Status helpers ──

  String _statusLabel(String? s) {
    switch (s) {
      case 'pending_quote': return '待报价';
      case 'pending_agree': return '待用户确认';
      case 'pending_confirm': return '待我确认';
      case 'pending_home': return '待上门';
      case 'pending_shop': return '待到店';
      case 'in_progress': return '服务中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return s ?? '';
    }
  }

  Color _statusBg(String? s) {
    switch (s) {
      case 'pending_quote': return const Color(0xFFFFE9F0);
      case 'pending_agree': return const Color(0xFFFFF3E0);
      case 'pending_confirm': return const Color(0xFFE8F5E9);
      case 'pending_home': return const Color(0xFFE3F2FD);
      case 'pending_shop': return const Color(0xFFE3F2FD);
      case 'in_progress': return const Color(0xFFEBF4FF);
      case 'completed': return const Color(0xFFF4F5F7);
      case 'cancelled': return const Color(0xFFFEE2E2);
      default: return const Color(0xFFF1F5F9);
    }
  }

  Color _statusColor(String? s) {
    switch (s) {
      case 'pending_quote': return DT.primary;
      case 'pending_agree': return const Color(0xFFD97706);
      case 'pending_confirm': return const Color(0xFF16A34A);
      case 'pending_home': return const Color(0xFF3B82F6);
      case 'pending_shop': return const Color(0xFF3B82F6);
      case 'in_progress': return const Color(0xFF3B82F6);
      case 'completed': return const Color(0xFF8A8F98);
      case 'cancelled': return const Color(0xFFEF4444);
      default: return const Color(0xFF64748B);
    }
  }

  String _serviceTypeLabel(String? st) {
    if (st == 'home') return '上门美甲';
    if (st == 'shop') return '到店美甲';
    return st ?? '—';
  }

  Color _serviceTypeColor(String? st) {
    if (st == 'home') return const Color(0xFFEA580C);
    if (st == 'shop') return const Color(0xFF3B82F6);
    return const Color(0xFF64748B);
  }

  Color _serviceTypeBg(String? st) {
    if (st == 'home') return const Color(0xFFFFF7ED);
    if (st == 'shop') return const Color(0xFFEFF6FF);
    return const Color(0xFFF1F5F9);
  }

  String _formatClock(String? iso) {
    if (iso == null) return '--:--';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '--:--';
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  String _formatDateLabel(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '';
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final date = DateTime(dt.year, dt.month, dt.day);
    if (date == today) return '今天';
    if (date == today.add(const Duration(days: 1))) return '明天';
    if (date == today.subtract(const Duration(days: 1))) return '昨天';
    return '${dt.month}/${dt.day}';
  }

  String _formatTimeRange(String? start, String? end) {
    return '${_formatClock(start)} - ${_formatClock(end)}';
  }

  int _getDuration(String? start, String? end) {
    final s = DateTime.tryParse(start ?? '');
    final e = DateTime.tryParse(end ?? '');
    if (s == null || e == null) return 0;
    return e.difference(s).inMinutes;
  }

  String _formatMoney(num? amount) {
    if (amount == null || amount == 0) return '¥0';
    return '¥${amount.toInt()}';
  }

  String _initial(String? name) => (name != null && name.isNotEmpty) ? name.substring(0, 1) : '客';

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: DT.bgWarm,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : _order == null
              ? _buildError()
              : Column(
                  children: [
                    // Sticky header
                    _buildHeader(topPad),
                    // Scrollable content
                    Expanded(child: _buildContent()),
                    // Bottom actions
                    _buildBottomBar(bottomPad),
                  ],
                ),
    );
  }

  // ── Header ──

  Widget _buildHeader(double topPad) {
    final o = _order!;
    return Container(
      padding: EdgeInsets.fromLTRB(20, topPad + 8, 20, 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.95),
        border: Border(bottom: BorderSide(color: const Color(0xFFF2E6EC))),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => context.pop(),
            child: Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: const Color(0xFFF7F3F5),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.arrow_back_ios_new_rounded, size: 16, color: Color(0xFF3C3440)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('预约详情',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
                if (o['orderNo'] != null)
                  Text(o['orderNo'].toString(),
                    style: TextStyle(fontSize: 12, color: DT.textMuted)),
              ],
            ),
          ),
          GestureDetector(
            onTap: _showEditSheet,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: DT.primary,
                borderRadius: BorderRadius.circular(18),
                boxShadow: [BoxShadow(color: DT.primary.withOpacity(0.25), blurRadius: 24, offset: const Offset(0, 10))],
              ),
              child: const Text('编辑',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  // ── Content ──

  Widget _buildContent() {
    final o = _order!;
    final status = o['status']?.toString() ?? '';
    final serviceType = o['serviceType']?.toString() ?? '';
    final customerName = o['customerName']?.toString() ?? '客户';
    final customerPhone = o['customerPhone']?.toString() ?? '';
    final serviceName = o['serviceName']?.toString() ?? '';
    final address = o['address']?.toString() ?? '';
    final note = o['note']?.toString() ?? '';
    final customDescription = o['customDescription']?.toString() ?? '';
    final customImages = (o['customImages'] as List<dynamic>?) ?? [];
    final price = o['price'] as num?;
    final depositAmount = o['depositAmount'] as num?;
    final depositPaid = o['depositPaid'] as bool? ?? false;

    return RefreshIndicator(
      color: DT.primary,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        children: [
          // Status card
          _glassCard(
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('当前状态',
                      style: TextStyle(fontSize: 12, color: DT.textMuted)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _statusBg(status),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(_statusLabel(status),
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: _statusColor(status))),
                    ),
                  ],
                ),
                const Spacer(),
                if (serviceType.isNotEmpty)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('服务类型',
                        style: TextStyle(fontSize: 12, color: DT.textMuted)),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: _serviceTypeBg(serviceType),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(_serviceTypeLabel(serviceType),
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: _serviceTypeColor(serviceType))),
                      ),
                    ],
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Customer info
          _glassCard(
            title: '客户信息',
            child: Row(
              children: [
                Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(
                    color: DT.primarySoft,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(_initial(customerName),
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: DT.primary)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(customerName,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DT.textPrimary)),
                      if (customerPhone.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(customerPhone,
                          style: TextStyle(fontSize: 14, color: DT.textSecondary)),
                      ],
                    ],
                  ),
                ),
                // Contact button
                GestureDetector(
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text('联系客户: $customerPhone'),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ));
                  },
                  child: Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      color: DT.primarySoft,
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFFFD9E6)),
                    ),
                    child: const Icon(Icons.phone_outlined, size: 20, color: DT.primary),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Service info
          _glassCard(
            title: '服务信息',
            child: Column(
              children: [
                _detailRow('服务内容', serviceName),
                _detailRow('预约时间',
                  '${_formatDateLabel(o['startTime'])} ${_formatTimeRange(o['startTime'], o['endTime'])}'),
                _detailRow('服务时长', '${_getDuration(o['startTime'], o['endTime'])} 分钟'),
                _detailRow(
                  serviceType == 'shop' ? '服务店铺' : '服务地址',
                  serviceType == 'shop' ? (o['shopName']?.toString() ?? '到店服务') : address),
                if (customDescription.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('需求描述',
                          style: TextStyle(fontSize: 13, color: DT.textMuted)),
                        const SizedBox(height: 6),
                        Text(customDescription,
                          style: const TextStyle(fontSize: 14, height: 1.6, color: DT.textPrimary)),
                      ],
                    ),
                  ),
                ],
                if (customImages.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text('参考图', style: TextStyle(fontSize: 13, color: DT.textMuted)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8, runSpacing: 8,
                    children: customImages.map((url) => ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(url.toString(),
                        width: 80, height: 80, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 80, height: 80,
                          color: const Color(0xFFF1F5F9),
                          child: const Icon(Icons.image_outlined, color: Color(0xFFCBD5E1)),
                        )),
                    )).toList(),
                  ),
                ],
                if (note.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.note_alt_outlined, size: 16, color: DT.textMuted),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(note,
                            style: TextStyle(fontSize: 14, height: 1.5, color: DT.textSecondary)),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Price detail
          _glassCard(
            title: '价格明细',
            child: Column(
              children: [
                // Price display
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFF6B8A), Color(0xFFFF8FA3)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('预约金额',
                        style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.8))),
                      const SizedBox(width: 12),
                      Text(_formatMoney(price),
                        style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
                    ],
                  ),
                ),
                if (depositAmount != null && depositAmount > 0) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: depositPaid ? const Color(0xFFF0FDF4) : const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: depositPaid ? const Color(0xFFBBF7D0) : const Color(0xFFFEF3C7)),
                    ),
                    child: Row(
                      children: [
                        Icon(depositPaid ? Icons.check_circle : Icons.access_time,
                          size: 16,
                          color: depositPaid ? const Color(0xFF16A34A) : const Color(0xFFD97706)),
                        const SizedBox(width: 8),
                        Text(depositPaid ? '定金已确认' : '待确认定金',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500,
                            color: depositPaid ? const Color(0xFF16A34A) : const Color(0xFFD97706))),
                        const Spacer(),
                        Text(_formatMoney(depositAmount),
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600,
                            color: depositPaid ? const Color(0xFF16A34A) : const Color(0xFFD97706))),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(label,
              style: TextStyle(fontSize: 14, color: DT.textMuted))),
          Expanded(
            child: Text(value,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textPrimary),
              textAlign: TextAlign.right),
          ),
        ],
      ),
    );
  }

  // ── Glass Card ──

  Widget _glassCard({String? title, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.88),
        borderRadius: BorderRadius.circular(24),
        boxShadow: DT.shadowMd,
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null) ...[
            Text(title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: DT.textPrimary)),
            const SizedBox(height: 14),
          ],
          child,
        ],
      ),
    );
  }

  // ── Bottom Bar ──

  Widget _buildBottomBar(double bottomPad) {
    final o = _order!;
    final status = o['status']?.toString() ?? '';
    final depositAmount = o['depositAmount'] as num?;
    final depositPaid = o['depositPaid'] as bool? ?? false;
    final customerName = o['customerName']?.toString() ?? '客户';

    final buttons = <_ActionButton>[];

    if (status == 'pending_quote') {
      buttons.add(_ActionButton('提交报价', DT.primary, true, () => _showQuoteSheet()));
    }
    if (status == 'pending_confirm') {
      buttons.add(_ActionButton('确认预约', const Color(0xFF10B981), true, () => _changeStatus('pending_confirm')));
    }
    if (status == 'pending_home' || status == 'pending_shop') {
      final needsDeposit = depositAmount != null && depositAmount > 0 && !depositPaid;
      if (needsDeposit) {
        buttons.add(_ActionButton('等待客户付定金', const Color(0xFFE5E7EB), false, null, textColor: const Color(0xFF9CA3AF)));
      } else {
        buttons.add(_ActionButton('确认预约', const Color(0xFF10B981), true,
          () => _changeStatus(status == 'pending_home' ? 'pending_home' : 'pending_shop')));
      }
    }
    if (status == 'in_progress') {
      buttons.add(_ActionButton('确认完成', const Color(0xFF10B981), true, () => _changeStatus('completed')));
    }

    // Send button
    buttons.add(_ActionButton('发给 $customerName', const Color(0xFF1F2230), true, () {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('已发送给 $customerName'),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ));
    }));

    // Cancel button
    if (status != 'completed' && status != 'cancelled') {
      buttons.add(_ActionButton('取消预约', Colors.white, false, () => _changeStatus('cancelled'),
        textColor: const Color(0xFFEF4444), border: Border.all(color: const Color(0xFFFEE2E2))));
    }

    if (buttons.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, bottomPad + 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: const Color(0xFFF1F5F9))),
      ),
      child: buttons.length <= 2
          ? Row(
              children: buttons.map((b) => Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: _buildActionButton(b),
                ),
              )).toList(),
            )
          : Wrap(
              spacing: 8,
              runSpacing: 8,
              children: buttons.map((b) => SizedBox(
                width: (MediaQuery.of(context).size.width - 56) / 2,
                child: _buildActionButton(b),
              )).toList(),
            ),
    );
  }

  Widget _buildActionButton(_ActionButton btn) {
    return GestureDetector(
      onTap: _actionLoading ? null : btn.onTap,
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: btn.bgColor,
          borderRadius: BorderRadius.circular(18),
          border: btn.border,
        ),
        alignment: Alignment.center,
        child: _actionLoading && btn.onTap != null
            ? SizedBox(width: 20, height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: btn.textColor ?? Colors.white))
            : Text(btn.label,
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: btn.textColor ?? Colors.white)),
      ),
    );
  }

  // ── Error ──

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('加载失败', style: TextStyle(fontSize: 15, color: DT.textMuted)),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: () { setState(() => _loading = true); _load(); },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
              decoration: BoxDecoration(color: DT.primary, borderRadius: BorderRadius.circular(999)),
              child: const Text('重试', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  // ── Actions ──

  Future<void> _changeStatus(String nextStatus) async {
    setState(() => _actionLoading = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      final service = TechnicianOrderService(api);
      final id = _order!['id'] as int;

      switch (nextStatus) {
        case 'cancelled': await service.cancel(id); break;
        case 'pending_confirm': await service.confirm(id); break;
        case 'pending_home':
        case 'pending_shop':
          await service.confirm(id, depositConfirmed: _order!['depositPaid'] == true);
          break;
        case 'completed': await service.complete(id); break;
      }

      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(nextStatus == 'cancelled' ? '预约已取消' : '状态已更新'),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('操作失败，请重试'),
          backgroundColor: DT.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ));
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  void _showQuoteSheet() {
    final priceCtl = TextEditingController(text: (_order!['price'] as num?)?.toInt().toString() ?? '');
    final dateCtl = TextEditingController(
      text: DateTime.tryParse(_order!['startTime']?.toString() ?? '')?.toString().substring(0, 10) ?? '');
    final timeCtl = TextEditingController(
      text: DateTime.tryParse(_order!['startTime']?.toString() ?? '') != null
        ? '${DateTime.parse(_order!['startTime']).hour.toString().padLeft(2, '0')}:${DateTime.parse(_order!['startTime']).minute.toString().padLeft(2, '0')}'
        : '14:00');
    final durationCtl = TextEditingController(
      text: _getDuration(_order!['startTime']?.toString(), _order!['endTime']?.toString()).toString());
    final depositCtl = TextEditingController(text: (_order!['depositAmount'] as num?)?.toInt().toString() ?? '0');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('提交报价',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
              const SizedBox(height: 16),
              _quoteInput('预约日期', dateCtl, TextInputType.datetime),
              const SizedBox(height: 12),
              _quoteInput('开始时间', timeCtl, TextInputType.datetime),
              const SizedBox(height: 12),
              _quoteInput('预估时长（分钟）', durationCtl, TextInputType.number),
              const SizedBox(height: 12),
              _quoteInput('费用（元）', priceCtl, TextInputType.number),
              const SizedBox(height: 12),
              _quoteInput('定金（元，可选）', depositCtl, TextInputType.number),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity, height: 50,
                child: ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    setState(() => _actionLoading = true);
                    try {
                      final api = context.read<ApiClient>();
                      api.setRole('technician');
                      await TechnicianOrderService(api).review(_order!['id'] as int, {
                        'serviceDate': dateCtl.text,
                        'startTime': timeCtl.text,
                        'durationMinutes': int.tryParse(durationCtl.text) ?? 90,
                        'price': double.tryParse(priceCtl.text) ?? 0,
                        'depositAmount': double.tryParse(depositCtl.text) ?? 0,
                      });
                      await _load();
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: const Text('报价已发送，等待客户确认'),
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ));
                      }
                    } catch (_) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: const Text('报价失败，请重试'),
                          backgroundColor: DT.error,
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ));
                      }
                    } finally {
                      if (mounted) setState(() => _actionLoading = false);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: DT.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: const Text('发送报价', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _quoteInput(String hint, TextEditingController ctl, TextInputType type) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
      ),
      child: TextField(
        controller: ctl,
        keyboardType: type,
        style: const TextStyle(fontSize: 15, color: DT.textPrimary),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: DT.textMuted, fontSize: 14),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    );
  }

  void _showEditSheet() {
    final o = _order!;
    final serviceNameCtl = TextEditingController(text: o['serviceName']?.toString() ?? '');
    final addressCtl = TextEditingController(text: o['address']?.toString() ?? '');
    final noteCtl = TextEditingController(text: o['note']?.toString() ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('编辑预约',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
              const SizedBox(height: 16),
              _quoteInput('服务内容', serviceNameCtl, TextInputType.text),
              const SizedBox(height: 12),
              _quoteInput('服务地址', addressCtl, TextInputType.text),
              const SizedBox(height: 12),
              _quoteInput('备注', noteCtl, TextInputType.multiline),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity, height: 50,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: DT.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: const Text('保存', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionButton {
  final String label;
  final Color bgColor;
  final bool primary;
  final VoidCallback? onTap;
  final Color? textColor;
  final BoxBorder? border;
  _ActionButton(this.label, this.bgColor, this.primary, this.onTap, {this.textColor, this.border});
}
