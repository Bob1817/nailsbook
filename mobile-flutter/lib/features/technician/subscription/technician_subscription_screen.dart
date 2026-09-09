import '../../../core/theme/colors.generated.dart';
import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/nb_toast.dart';

const _plans = [
  {
    'code': 'free',
    'name': '免费版',
    'price': 0,
    'highlights': ['最多 20 位客户', '每月 40 单预约上限', '基础功能使用'],
  },
  {
    'code': 'pro',
    'name': 'Pro 版',
    'price': 29,
    'highlights': ['不限客户数和预约量', '上门服务功能', '数据统计分析', '客户标签管理'],
  },
  {
    'code': 'studio_plus',
    'name': 'Studio Plus',
    'price': 99,
    'highlights': ['所有 Pro 功能', '多员工账号管理', '高级数据报表', '优先客服支持'],
  },
];

class TechnicianSubscriptionScreen extends StatefulWidget {
  const TechnicianSubscriptionScreen({super.key});

  @override
  State<TechnicianSubscriptionScreen> createState() => _TechnicianSubscriptionScreenState();
}

class _TechnicianSubscriptionScreenState extends State<TechnicianSubscriptionScreen> {
  Map<String, dynamic>? _subscription;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      final data = await api.get('/subscription');
      if (mounted) setState(() { _subscription = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String get _currentPlanCode => _subscription?['plan']?.toString() ?? 'free';

  bool get _isTrialActive {
    final trialEnd = _subscription?['trialEndAt']?.toString();
    if (trialEnd == null) return false;
    return DateTime.tryParse(trialEnd)?.isAfter(DateTime.now()) ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: DT.bgWarm,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : Column(
              children: [
                _buildHeader(topPad),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(DT.xl, 0, DT.xl, DT.xxl),
                    children: [
                      _buildCurrentStatus(),
                      const SizedBox(height: DT.xl),
                      ..._plans.map((plan) => _buildPlanCard(plan)),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  // ── Header ──

  Widget _buildHeader(double topPad) {
    return Padding(
      padding: EdgeInsets.fromLTRB(DT.sm, topPad + DT.xs, DT.xl, DT.sm),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: DT.surface.withValues(alpha: 0.8),
                shape: BoxShape.circle,
              ),
              child: const Icon(CupertinoIcons.back, size: 18, color: DT.textDarkGrey),
            ),
          ),
          const SizedBox(width: DT.md),
          Text('套餐管理', style: DT.titleLarge.copyWith(fontSize: 18)),
        ],
      ),
    );
  }

  // ── Current Status ──

  Widget _buildCurrentStatus() {
    if (_subscription == null) return const SizedBox.shrink();
    final planName = _plans.firstWhere(
      (p) => p['code'] == _currentPlanCode,
      orElse: () => _plans[0],
    )['name'] as String;

    return Container(
      padding: const EdgeInsets.all(DT.xl),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [NBColors.action, NBColors.action, NBColors.action, NBColors.action],
          begin: Alignment(0.7, -1.0),
          end: Alignment(-0.7, 1.0),
        ),
        borderRadius: BorderRadius.circular(DT.rXxl),
        boxShadow: [BoxShadow(color: DT.primary.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, DT.sm))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('当前套餐', style: DT.captionLarge.copyWith(color: Colors.white.withValues(alpha: 0.7))),
          const SizedBox(height: DT.xs),
          Text(planName, style: DT.displaySmall.copyWith(color: Colors.white)),
          if (_isTrialActive) ...[
            const SizedBox(height: DT.sm),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: DT.md, vertical: 5),
              decoration: BoxDecoration(
                color: DT.surface.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(DT.rFull),
              ),
              child: Text('试用期', style: DT.captionLarge.copyWith(color: Colors.white)),
            ),
          ],
        ],
      ),
    );
  }

  // ── Plan Card ──

  Widget _buildPlanCard(Map<String, Object> plan) {
    final code = plan['code'] as String;
    final isCurrent = code == _currentPlanCode;
    final price = plan['price'] as int;
    final highlights = (plan['highlights'] as List<dynamic>).cast<String>();
    final isPopular = code == 'pro';

    return Container(
      margin: const EdgeInsets.only(bottom: DT.md),
      decoration: BoxDecoration(
        color: isCurrent ? DT.primarySoft : DT.surface,
        borderRadius: BorderRadius.circular(DT.rXxl),
        border: Border.all(
          color: isCurrent ? DT.primary : DT.borderPink,
          width: isCurrent ? 2 : 1,
        ),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 20, offset: const Offset(0, DT.sm))],
      ),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(DT.xl),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name + badges
                Row(
                  children: [
                    Text(plan['name'] as String,
                      style: DT.titleLarge.copyWith(fontSize: 18)),
                    if (isPopular) ...[
                      const SizedBox(width: DT.sm),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                        decoration: BoxDecoration(
                          color: DT.primary,
                          borderRadius: BorderRadius.circular(DT.rFull),
                          boxShadow: [BoxShadow(color: DT.primary.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, DT.xs))],
                        ),
                        child: Text('最受欢迎',
                          style: DT.captionMedium.copyWith(color: Colors.white, fontWeight: FontWeight.w600)),
                      ),
                    ],
                    if (isCurrent) ...[
                      const SizedBox(width: DT.sm),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                        decoration: BoxDecoration(
                          color: DT.actionGreen,
                          borderRadius: BorderRadius.circular(DT.rFull),
                        ),
                        child: Text('当前套餐',
                          style: DT.captionMedium.copyWith(color: Colors.white, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: DT.sm),
                // Price
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(price == 0 ? '免费' : '\u00A5$price',
                      style: DT.monospaceLarge.copyWith(fontSize: 36, letterSpacing: -1)),
                    if (price > 0)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6, left: DT.xs),
                        child: Text('/月', style: DT.bodyMedium.copyWith(color: DT.textMidGrey)),
                      ),
                  ],
                ),
                const SizedBox(height: DT.lg),
                // Highlights
                ...highlights.map((h) => Padding(
                  padding: const EdgeInsets.only(bottom: DT.sm),
                  child: Row(
                    children: [
                      Container(
                        width: 22, height: 22,
                        decoration: const BoxDecoration(
                          color: DT.successSoft,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(CupertinoIcons.checkmark_alt, size: 14, color: DT.actionGreen),
                      ),
                      const SizedBox(width: DT.sm),
                      Expanded(
                        child: Text(h, style: DT.bodyMedium),
                      ),
                    ],
                  ),
                )),
                const SizedBox(height: DT.sm),
                // Action button
                // iOS 合规（App Store 3.1.1）：不在 app 内提供导向外部网页支付的订阅入口。
                // 审核前隐藏购买按钮；订阅仅在网页端运营。
                if (!isCurrent && !Platform.isIOS)
                  SizedBox(
                    width: double.infinity, height: 48,
                    child: ElevatedButton(
                      onPressed: () {
                        HapticFeedback.lightImpact();
                        _showUpgradeDialog(plan);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isPopular ? DT.primary : DT.primarySoft,
                        foregroundColor: isPopular ? Colors.white : DT.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(DT.lg),
                          side: isPopular ? BorderSide.none : const BorderSide(color: DT.avatarBorder),
                        ),
                        elevation: 0,
                        shadowColor: isPopular ? DT.primary.withValues(alpha: 0.25) : null,
                      ),
                      child: Text(price == 0 ? '切换到免费版' : '立即订阅',
                        style: DT.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
                    ),
                  ),
                if (isCurrent)
                  Container(
                    width: double.infinity, height: 48,
                    decoration: BoxDecoration(
                      color: DT.successSoft,
                      borderRadius: BorderRadius.circular(DT.lg),
                    ),
                    alignment: Alignment.center,
                    child: Text('当前使用中',
                      style: DT.bodyMedium.copyWith(fontWeight: FontWeight.w600, color: DT.actionGreen)),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Upgrade Dialog ──

  void _showUpgradeDialog(Map<String, Object> plan) {
    showCupertinoDialog(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: Text('升级到 ${plan['name']}'),
        content: Text('确定要升级到 ${plan['name']}（\u00A5${plan['price']}/月）吗？\n\n升级后将立即生效。'),
        actions: [
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () => Navigator.pop(ctx),
            child: const Text('取消'),
          ),
          CupertinoDialogAction(
            isDestructiveAction: false,
            onPressed: () {
              HapticFeedback.mediumImpact();
              Navigator.pop(ctx);
              NbToast.show(context, '请在网页端完成升级操作');
            },
            child: const Text('确认升级'),
          ),
        ],
      ),
    );
  }
}
