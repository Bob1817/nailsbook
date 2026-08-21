import 'package:nailbook_mobile/core/widgets/glass_container.dart';

import '../auth/technician_auth_models.dart';
import '../auth/technician_auth_service.dart';
import '../home_service/technician_home_service_settings_screen.dart';
import '../shop/technician_shop_screen.dart';
import '../services/technician_services_screen.dart';
import '../schedule/technician_service_time_screen.dart';
import '../profile/technician_business_card_screen.dart';

/// 首次登录强制配置引导：开启接单前的配置清单。
/// 设计要求的步骤：服务类型（上门 / 店铺）→ 服务管理 → 服务时间 → 名片。
/// 解锁条件（与后端 bookingReady 一致）：至少开启一种服务类型；
/// 未解锁前不可退出，邀请码 / 邀请链接与客户预约均锁定。
class TechnicianSetupGuideScreen extends StatefulWidget {
  const TechnicianSetupGuideScreen({super.key});

  @override
  State<TechnicianSetupGuideScreen> createState() =>
      _TechnicianSetupGuideScreenState();
}

class _TechnicianSetupGuideScreenState
    extends State<TechnicianSetupGuideScreen> {
  TechnicianProfile? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      final p = await TechnicianAuthService(api).getProfile();
      if (mounted) {
        setState(() {
        _profile = p;
        _loading = false;
      });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(Widget screen) async {
    await Navigator.push(
        context, MaterialPageRoute(builder: (_) => screen));
    _load(); // 返回后刷新状态/勾选
  }

  bool get _ready => _profile?.bookingReady ?? false;

  @override
  Widget build(BuildContext context) {
    final p = _profile;
    final bottomPad = MediaQuery.of(context).padding.bottom;
    final homeOn = p?.homeService == true;
    final shopOn = p?.shopService == true;
    final hasServices = (p?.serviceItems ?? const []).isNotEmpty;
    final hasSchedule = p?.serviceSchedule != null;
    final hasCard = (p?.avatarUrl ?? '').isNotEmpty;

    return PopScope(
      // 未开启任何服务类型前不可退出，强制完成接单前配置
      canPop: _ready,
      child: Scaffold(
        backgroundColor: ET.bg,
        appBar: const GlassAppBar(
          title: Text('开启接单前配置'),
          dark: true,
          automaticallyImplyLeading: false,
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: DT.primary))
            : SafeArea(
                child: ListView(
                  padding: EdgeInsets.fromLTRB(20, 16, 20, bottomPad + 100),
                  children: [
                    const Text('完善以下配置即可开始接单',
                        style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: ET.ink)),
                    const SizedBox(height: 6),
                    const Text('至少开启「上门」或「到店」服务，才能邀请客户、生成邀请链接并接单。',
                        style: TextStyle(
                            fontSize: 13, height: 1.5, color: ET.inkSecondary)),
                    const SizedBox(height: 20),
                    _stepCard(
                      n: '1',
                      title: '服务类型 · 上门设置',
                      subtitle: '开启上门美甲服务',
                      done: homeOn,
                      onTap: () => _open(
                          const TechnicianHomeServiceSettingsScreen()),
                    ),
                    _stepCard(
                      n: '1',
                      title: '服务类型 · 店铺设置',
                      subtitle: '开启到店美甲服务',
                      done: shopOn,
                      onTap: () => _open(const TechnicianShopScreen()),
                    ),
                    _stepCard(
                      n: '2',
                      title: '服务管理',
                      subtitle: '添加你提供的服务项目',
                      done: hasServices,
                      onTap: () => _open(const TechnicianServicesScreen()),
                    ),
                    _stepCard(
                      n: '3',
                      title: '服务时间',
                      subtitle: '设置可预约的服务时段',
                      done: hasSchedule,
                      onTap: () => _open(const TechnicianServiceTimeScreen()),
                    ),
                    _stepCard(
                      n: '4',
                      title: '名片配置',
                      subtitle: '完善公开名片信息',
                      done: hasCard,
                      onTap: () => _open(const TechnicianBusinessCardScreen()),
                    ),
                  ],
                ),
              ),
        bottomNavigationBar: _loading
            ? null
            : _bottomBar(bottomPad),
      ),
    );
  }

  Widget _bottomBar(double bottomPad) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, bottomPad + 12),
      decoration: const BoxDecoration(
        color: ET.bg,
        border: Border(top: BorderSide(color: ET.hairline)),
      ),
      child: SizedBox(
        height: 50,
        child: ElevatedButton(
          onPressed: _ready ? () => Navigator.pop(context) : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: ET.cream,
            foregroundColor: ET.onCream,
            disabledBackgroundColor: ET.cream.withValues(alpha: 0.35),
            elevation: 0,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14)),
          ),
          child: Text(_ready ? '完成，进入工作台' : '请先开启一种服务类型',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        ),
      ),
    );
  }

  Widget _stepCard({
    required String n,
    required String title,
    required String subtitle,
    required bool done,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: ET.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: done ? DT.success.withValues(alpha: 0.5) : ET.hairline),
        ),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: done ? DT.success : ET.bg,
                shape: BoxShape.circle,
              ),
              child: done
                  ? const Icon(Icons.check_rounded,
                      size: 18, color: Colors.white)
                  : Text(n,
                      style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: ET.inkSecondary)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: ET.ink)),
                  const SizedBox(height: 2),
                  Text(subtitle,
                      style: const TextStyle(
                          fontSize: 12.5, color: ET.inkSecondary)),
                ],
              ),
            ),
            const Icon(CupertinoIcons.chevron_right,
                size: 16, color: ET.inkMuted),
          ],
        ),
      ),
    );
  }
}
