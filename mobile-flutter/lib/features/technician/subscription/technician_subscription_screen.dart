import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';

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
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                    children: [
                      _buildCurrentStatus(),
                      const SizedBox(height: 20),
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
      padding: EdgeInsets.fromLTRB(8, topPad + 4, 20, 8),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.8),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF374151)),
            ),
          ),
          const SizedBox(width: 12),
          const Text('套餐管理',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: DT.textPrimary)),
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
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFF6FA2), Color(0xFFFF6B9B), Color(0xFFFF81A4), Color(0xFFFFB387)],
          begin: Alignment(0.7, -1.0),
          end: Alignment(-0.7, 1.0),
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: DT.primary.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('当前套餐',
            style: TextStyle(fontSize: 13, color: Colors.white70)),
          const SizedBox(height: 4),
          Text(planName,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
          if (_isTrialActive) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(999),
              ),
              child: const Text('试用期',
                style: TextStyle(fontSize: 13, color: Colors.white)),
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
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: isCurrent ? const Color(0xFFFFF1F6) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isCurrent ? DT.primary : const Color(0xFFF2E6EC),
          width: isCurrent ? 2 : 1,
        ),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name + badges
                Row(
                  children: [
                    Text(plan['name'] as String,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: DT.textPrimary)),
                    if (isPopular) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                        decoration: BoxDecoration(
                          color: DT.primary,
                          borderRadius: BorderRadius.circular(999),
                          boxShadow: [BoxShadow(color: DT.primary.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))],
                        ),
                        child: const Text('最受欢迎',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white)),
                      ),
                    ],
                    if (isCurrent) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF31B46C),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text('当前套餐',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white)),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 8),
                // Price
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(price == 0 ? '免费' : '¥$price',
                      style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: DT.textPrimary, letterSpacing: -1)),
                    if (price > 0)
                      const Padding(
                        padding: EdgeInsets.only(bottom: 6, left: 4),
                        child: Text('/月',
                          style: TextStyle(fontSize: 14, color: Color(0xFF7F7681))),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                // Highlights
                ...highlights.map((h) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      Container(
                        width: 22, height: 22,
                        decoration: const BoxDecoration(
                          color: Color(0xFFEEF9F1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.check, size: 14, color: Color(0xFF31B46C)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(h,
                          style: const TextStyle(fontSize: 14, color: Color(0xFF3C3440))),
                      ),
                    ],
                  ),
                )),
                const SizedBox(height: 8),
                // Action button
                if (!isCurrent)
                  SizedBox(
                    width: double.infinity, height: 48,
                    child: ElevatedButton(
                      onPressed: () => _showUpgradeDialog(plan),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isPopular ? DT.primary : const Color(0xFFFFF1F6),
                        foregroundColor: isPopular ? Colors.white : DT.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: isPopular ? BorderSide.none : const BorderSide(color: Color(0xFFFFD9E6)),
                        ),
                        elevation: 0,
                        shadowColor: isPopular ? DT.primary.withOpacity(0.25) : null,
                      ),
                      child: Text(price == 0 ? '切换到免费版' : '立即订阅',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    ),
                  ),
                if (isCurrent)
                  Container(
                    width: double.infinity, height: 48,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEEF9F1),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    alignment: Alignment.center,
                    child: const Text('当前使用中',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF31B46C))),
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
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('升级到 ${plan['name']}'),
        content: Text('确定要升级到 ${plan['name']}（¥${plan['price']}/月）吗？\n\n升级后将立即生效。'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                content: const Text('请在网页端完成升级操作'),
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: DT.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: const Text('确认升级'),
          ),
        ],
      ),
    );
  }
}
