import '../../../core/theme/colors.generated.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

class TechnicianAboutScreen extends StatefulWidget {
  const TechnicianAboutScreen({super.key});

  @override
  State<TechnicianAboutScreen> createState() => _TechnicianAboutScreenState();
}

class _TechnicianAboutScreenState extends State<TechnicianAboutScreen> {
  int? _openIndex;

  static const _docs = [
    {
      'title': '用户协议',
      'body':
          '用户在使用本平台时应遵守相关法律法规。本平台仅提供预约管理和沟通工具，不参与线上支付和收入分成。服务费用由美甲师与客户线下协商确定。',
    },
    {
      'title': '隐私政策',
      'body': '我们仅收集必要的信息（账号、预约、联系方式），不会将您的数据出售给第三方。您可以在隐私设置中控制信息的展示范围。',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DT.bgWarm,
      appBar: GlassAppBar(
        technician: true,
        elevation: 0,
        leading: IconButton(
          icon:
              const Icon(CupertinoIcons.back, size: 20, color: DT.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('关于我们', style: DT.titleMedium),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(DT.xl),
        children: [
          // App identity
          Center(
            child: Column(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(DT.xxl),
                    gradient: const LinearGradient(
                      colors: [
                        NBColors.action,
                        NBColors.action,
                        NBColors.action
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: const [
                      BoxShadow(
                          color: Color(0x40000000),
                          blurRadius: 32,
                          offset: Offset(0, DT.lg))
                    ],
                  ),
                  alignment: Alignment.center,
                  child:
                      const Text('\u{1F485}', style: TextStyle(fontSize: 36)),
                ),
                const SizedBox(height: DT.md),
                const Text('美甲师 Studio', style: DT.titleLarge),
                const SizedBox(height: DT.xs),
                const Text('版本 1.0.0', style: DT.captionLarge),
              ],
            ),
          ),
          const SizedBox(height: DT.xl),
          // Description
          Text(
            '专为独立移动美甲师打造的预约管理与客户维护工具。高效管理行程、客户档案和作品集，让美甲事业更轻松。',
            textAlign: TextAlign.center,
            style: DT.bodyMedium.copyWith(height: 1.6, color: DT.textSecondary),
          ),
          const SizedBox(height: DT.xxl),
          // Legal docs accordion
          Container(
            decoration: BoxDecoration(
              color: DT.surface,
              borderRadius: BorderRadius.circular(DT.rXxl),
              boxShadow: DT.shadowSm,
            ),
            child: Column(
              children: List.generate(_docs.length, (i) {
                final isOpen = _openIndex == i;
                final isLast = i == _docs.length - 1;
                return Column(
                  children: [
                    GestureDetector(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        setState(() => _openIndex = isOpen ? null : i);
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: DT.xl, vertical: DT.lg),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(_docs[i]['title']!,
                                  style: DT.bodyMedium
                                      .copyWith(fontWeight: FontWeight.w500)),
                            ),
                            AnimatedRotation(
                              turns: isOpen ? 0.5 : 0,
                              duration: const Duration(milliseconds: 200),
                              child: const Icon(CupertinoIcons.chevron_down,
                                  size: 22, color: DT.textMuted),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (isOpen)
                      Padding(
                        padding:
                            const EdgeInsets.fromLTRB(DT.xl, 0, DT.xl, DT.lg),
                        child: Text(_docs[i]['body']!,
                            style: DT.bodySmall.copyWith(height: 1.7)),
                      ),
                    if (!isLast)
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: DT.xl),
                        child: Divider(height: 1, color: DT.dividerWarm),
                      ),
                  ],
                );
              }),
            ),
          ),
          const SizedBox(height: DT.xxxl),
          // Copyright
          const Center(
            child: Text('\u00A9 2026 美甲师 Studio \u00B7 保留所有权利',
                style: DT.captionLarge),
          ),
        ],
      ),
    );
  }
}
