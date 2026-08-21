import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_error.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/nb_toast.dart';
import '../auth/technician_auth_service.dart';

/// 美甲师端：客户绑定申请审批。
/// 展示客户姓名/手机/地址/备注/申请时间，支持通过 / 拒绝。
class TechnicianBindingApplicationsScreen extends StatefulWidget {
  const TechnicianBindingApplicationsScreen({super.key});

  @override
  State<TechnicianBindingApplicationsScreen> createState() =>
      _TechnicianBindingApplicationsScreenState();
}

class _TechnicianBindingApplicationsScreenState
    extends State<TechnicianBindingApplicationsScreen> {
  List<Map<String, dynamic>> _apps = [];
  bool _loading = true;
  int? _busyId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      final apps = await TechnicianAuthService(api).bindingApplications();
      if (mounted) setState(() {
        _apps = apps;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _approve(Map<String, dynamic> app) async {
    final id = app['id'] as int;
    setState(() => _busyId = id);
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      await TechnicianAuthService(api).approveBinding(id);
      if (!mounted) return;
      NbToast.success(context, '已通过「${app['name'] ?? '客户'}」的绑定申请');
      setState(() {
        _apps.removeWhere((a) => a['id'] == id);
        _busyId = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _busyId = null);
      NbToast.error(context,
          e is ApiError && e.message.isNotEmpty ? e.message : '操作失败，请重试');
    }
  }

  Future<void> _reject(Map<String, dynamic> app) async {
    final ok = await showCupertinoDialog<bool>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('拒绝绑定申请'),
        content: Text('确定拒绝「${app['name'] ?? '客户'}」的绑定申请吗？'),
        actions: [
          CupertinoDialogAction(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          CupertinoDialogAction(
              isDestructiveAction: true,
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('拒绝')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final id = app['id'] as int;
    setState(() => _busyId = id);
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      await TechnicianAuthService(api).rejectBinding(id);
      if (!mounted) return;
      NbToast.success(context, '已拒绝该绑定申请');
      setState(() {
        _apps.removeWhere((a) => a['id'] == id);
        _busyId = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _busyId = null);
      NbToast.error(context,
          e is ApiError && e.message.isNotEmpty ? e.message : '操作失败，请重试');
    }
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;
    return Scaffold(
      backgroundColor: DT.bg,
      body: Stack(
        children: [
          if (_loading)
            const Center(child: CircularProgressIndicator(color: DT.primary))
          else if (_apps.isEmpty)
            _emptyState()
          else
            RefreshIndicator(
              color: DT.primary,
              onRefresh: _load,
              child: ListView.separated(
                padding: EdgeInsets.fromLTRB(
                    DT.xl, topPad + 76, DT.xl, bottomPad + DT.xxxl),
                itemCount: _apps.length,
                separatorBuilder: (_, __) => const SizedBox(height: DT.md),
                itemBuilder: (_, i) => _appCard(_apps[i]),
              ),
            ),
          Positioned(left: 0, right: 0, top: 0, child: _header(topPad)),
        ],
      ),
    );
  }

  Widget _header(double topPad) {
    return GlassContainer(
      tint: Colors.black,
      blur: DT.glassBlurHeavy,
      opacity: 0.52,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.fromLTRB(DT.sm, topPad + DT.xs, DT.xl, DT.sm),
      child: Row(
        children: [
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
            child: Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(CupertinoIcons.back,
                  size: 18, color: DT.textPrimary),
            ),
          ),
          const SizedBox(width: DT.md),
          const Expanded(child: Text('绑定申请', style: DT.titleLarge)),
        ],
      ),
    );
  }

  Widget _emptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(CupertinoIcons.person_crop_circle_badge_checkmark,
              size: 56, color: DT.textTertiary),
          const SizedBox(height: DT.md),
          Text('暂无待审批的绑定申请',
              style: DT.bodyMedium.copyWith(color: DT.textTertiary)),
        ],
      ),
    );
  }

  Widget _appCard(Map<String, dynamic> app) {
    final id = app['id'] as int;
    final busy = _busyId == id;
    return Container(
      padding: const EdgeInsets.all(DT.lg),
      decoration: BoxDecoration(
        color: DT.surface.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(DT.rCard),
        boxShadow: DT.shadowTile,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(app['name']?.toString() ?? '客户',
                    style: DT.titleMedium, overflow: TextOverflow.ellipsis),
              ),
              Text(_fmtTime(app['appliedAt']),
                  style: DT.captionLarge.copyWith(color: DT.textTertiary)),
            ],
          ),
          const SizedBox(height: DT.sm),
          _row(CupertinoIcons.phone, app['phone']?.toString() ?? '未填写'),
          const SizedBox(height: 4),
          _row(CupertinoIcons.location_solid,
              app['address']?.toString() ?? '未填写'),
          if ((app['note']?.toString() ?? '').isNotEmpty) ...[
            const SizedBox(height: 4),
            _row(CupertinoIcons.chat_bubble_text, app['note'].toString()),
          ],
          const SizedBox(height: DT.md),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: busy ? null : () => _reject(app),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: DT.error,
                    side: const BorderSide(color: DT.border),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(DT.rMd)),
                  ),
                  child: const Text('拒绝'),
                ),
              ),
              const SizedBox(width: DT.md),
              Expanded(
                child: ElevatedButton(
                  onPressed: busy ? null : () => _approve(app),
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

  Widget _row(IconData icon, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 14, color: DT.textTertiary),
        const SizedBox(width: 6),
        Expanded(
          child: Text(text,
              style: DT.bodySmall.copyWith(color: DT.textSecondary)),
        ),
      ],
    );
  }

  String _fmtTime(dynamic iso) {
    final dt = DateTime.tryParse(iso?.toString() ?? '');
    if (dt == null) return '';
    final p = (int n) => n.toString().padLeft(2, '0');
    return '${dt.month}月${dt.day}日 ${p(dt.hour)}:${p(dt.minute)}';
  }
}
