import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import 'chat_booking_service.dart';
import '../../../core/widgets/nb_toast.dart';

class OrderConfirmScreen extends StatefulWidget {
  final String token;
  const OrderConfirmScreen({super.key, required this.token});

  @override
  State<OrderConfirmScreen> createState() => _OrderConfirmScreenState();
}

enum _ViewState { loading, detail, expired, alreadyDone, success, error }

class _OrderConfirmScreenState extends State<OrderConfirmScreen> {
  late final ChatBookingService _svc;
  _ViewState _state = _ViewState.loading;
  Map<String, dynamic>? _detail;
  String _message = '';
  bool _acting = false;

  @override
  void initState() {
    super.initState();
    final base = context.read<ApiClient>().baseUrl;
    _svc = ChatBookingService(ApiClient(baseUrl: '$base/api'));
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _svc.fetchConfirmDetail(widget.token);
      if (!mounted) return;
      if (data['expired'] == true) {
        setState(() { _state = _ViewState.expired; _message = data['message']?.toString() ?? '链接已过期'; });
      } else if (data['alreadyConfirmed'] == true) {
        setState(() { _state = _ViewState.alreadyDone; _message = data['message']?.toString() ?? '预约已处理'; });
      } else {
        setState(() { _state = _ViewState.detail; _detail = data; });
      }
    } catch (e) {
      if (mounted) setState(() { _state = _ViewState.error; _message = '加载失败：$e'; });
    }
  }

  Future<void> _accept() async {
    if (_acting) return;
    setState(() => _acting = true);
    try {
      await _svc.acceptByToken(widget.token);
      if (mounted) setState(() { _state = _ViewState.success; _message = '预约已确认'; });
    } catch (e) {
      if (mounted) {
        NbToast.show(context, '确认失败：$e');
        setState(() => _acting = false);
      }
    }
  }

  Future<void> _cancel() async {
    if (_acting) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('取消预约'),
        content: const Text('确定要取消这次预约吗？'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('再想想')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('确定取消')),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _acting = true);
    try {
      await _svc.cancelByToken(widget.token);
      if (mounted) setState(() { _state = _ViewState.success; _message = '预约已取消'; });
    } catch (e) {
      if (mounted) {
        NbToast.show(context, '取消失败：$e');
        setState(() => _acting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DT.bgWarm,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: _buildBody(),
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    switch (_state) {
      case _ViewState.loading:
        return const CircularProgressIndicator(color: DT.primary);
      case _ViewState.expired:
        return _statusView(Icons.link_off_rounded, const Color(0xFF94A3B8), '链接已失效', _message);
      case _ViewState.alreadyDone:
        return _statusView(Icons.check_circle_outline_rounded, DT.primary, '已处理', _message);
      case _ViewState.error:
        return _statusView(Icons.error_outline_rounded, const Color(0xFFEF4444), '出错了', _message);
      case _ViewState.success:
        return _statusView(Icons.check_circle_rounded, DT.primary, _message, '感谢你的确认，美甲师将与你联系');
      case _ViewState.detail:
        return _buildDetail();
    }
  }

  Widget _statusView(IconData icon, Color color, String title, String subtitle) {
    return Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 64, color: color),
      const SizedBox(height: 16),
      Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: DT.textPrimary)),
      const SizedBox(height: 8),
      Text(subtitle, textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 14, color: DT.textMuted)),
    ]);
  }

  Widget _buildDetail() {
    final d = _detail!;
    final tech = (d['technician'] as Map<String, dynamic>?) ?? {};
    final price = d['price'];
    final priceText = price == null ? '待确认' : '¥ ${(price is num) ? price.toStringAsFixed(price % 1 == 0 ? 0 : 2) : price}';
    final timeText = _formatTime(d['startTime']?.toString());
    final serviceType = d['serviceType']?.toString() ?? '美甲服务';
    final address = d['address']?.toString() ?? '';
    final desc = d['customDescription']?.toString() ?? d['remark']?.toString() ?? '';

    return Container(
      constraints: const BoxConstraints(maxWidth: 480),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: DT.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: DT.shadowMd,
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              color: DT.primarySoft, shape: BoxShape.circle,
              image: tech['avatarUrl'] != null
                  ? DecorationImage(image: NetworkImage(tech['avatarUrl'].toString()), fit: BoxFit.cover)
                  : null,
            ),
            child: tech['avatarUrl'] == null
                ? Center(child: Text((tech['name']?.toString() ?? '美').substring(0, 1),
                    style: const TextStyle(color: DT.primary, fontWeight: FontWeight.w600)))
                : null,
          ),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(tech['name']?.toString() ?? '美甲师',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: DT.textPrimary)),
            const Text('为你创建了一个预约', style: TextStyle(fontSize: 12, color: DT.textMuted)),
          ]),
        ]),
        const SizedBox(height: 20),
        // Price — most prominent
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 18),
          decoration: BoxDecoration(gradient: DT.primaryGradient, borderRadius: BorderRadius.circular(16)),
          child: Column(children: [
            const Text('服务价格', style: TextStyle(fontSize: 12, color: Colors.white70)),
            const SizedBox(height: 4),
            Text(priceText, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w700, color: Colors.white)),
          ]),
        ),
        const SizedBox(height: 16),
        _infoRow(Icons.access_time_rounded, '预约时间', timeText),
        _infoRow(Icons.spa_rounded, '服务方式', serviceType),
        if (address.isNotEmpty) _infoRow(Icons.location_on_rounded, '服务地址', address),
        if (desc.isNotEmpty) _infoRow(Icons.notes_rounded, '需求说明', desc),
        const SizedBox(height: 24),
        Row(children: [
          Expanded(
            child: OutlinedButton(
              onPressed: _acting ? null : _cancel,
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              ),
              child: const Text('取消预约', style: TextStyle(color: DT.textMuted)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: _acting ? null : _accept,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              ),
              child: _acting
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('确认预约'),
            ),
          ),
        ]),
      ]),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 18, color: DT.primary),
        const SizedBox(width: 10),
        Text(label, style: const TextStyle(fontSize: 14, color: DT.textMuted)),
        const SizedBox(width: 12),
        Expanded(
          child: Text(value, textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textPrimary)),
        ),
      ]),
    );
  }

  String _formatTime(String? iso) {
    if (iso == null) return '待确认';
    try {
      final dt = DateTime.parse(iso).toLocal();
      const week = ['一', '二', '三', '四', '五', '六', '日'];
      return '${dt.month}月${dt.day}日 周${week[dt.weekday - 1]} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }
}
