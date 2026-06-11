import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/design_tokens.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

class TechnicianHelpFeedbackScreen extends StatefulWidget {
  const TechnicianHelpFeedbackScreen({super.key});

  @override
  State<TechnicianHelpFeedbackScreen> createState() =>
      _TechnicianHelpFeedbackScreenState();
}

class _TechnicianHelpFeedbackScreenState
    extends State<TechnicianHelpFeedbackScreen> {
  int? _openFaq;

  static const _faqs = [
    {
      'q': '客户如何绑定我？',
      'a':
          '客户可以通过您分享的邀请码或主页链接绑定您。在「我的」页面点击「分享名片」即可生成邀请码和链接。客户在注册时输入邀请码，或通过链接直接关联。',
    },
    {
      'q': '预约的状态流转是怎样的？',
      'a': '预约流程：待报价 → 待确认 → 待上门/待到店 → 服务中 → 已完成。您可以在收到新预约后报价，客户确认后进入待服务状态。',
    },
    {
      'q': '定金是如何处理的？',
      'a': '目前平台不支持线上支付，定金由美甲师与客户线下协商收取。您可以在预约中标记定金是否已支付。',
    },
    {
      'q': '如何让作品出现在客户首页推荐？',
      'a': '将作品标记为「精品」即可出现在客户首页推荐中。在作品管理页面编辑作品，开启精品标记即可。',
    },
    {
      'q': '上门与到店服务如何设置？',
      'a': '在「服务类型设置」中可以分别开启上门和到店服务。上门服务需要设置服务区域，到店服务需要添加店铺地址和营业时间。',
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
        title: Text('帮助与反馈', style: DT.titleMedium),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(DT.xl),
        children: [
          // FAQ
          Text('常见问题', style: DT.titleMedium),
          const SizedBox(height: DT.md),
          Container(
            decoration: BoxDecoration(
              color: DT.surface,
              borderRadius: BorderRadius.circular(DT.rXxl),
              boxShadow: DT.shadowSm,
            ),
            child: Column(
              children: List.generate(_faqs.length, (i) {
                final isOpen = _openFaq == i;
                final isLast = i == _faqs.length - 1;
                return Column(
                  children: [
                    GestureDetector(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        setState(() => _openFaq = isOpen ? null : i);
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: DT.xl, vertical: DT.lg),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(_faqs[i]['q']!,
                                  style: DT.bodyMedium
                                      .copyWith(fontWeight: FontWeight.w500)),
                            ),
                            AnimatedRotation(
                              turns: isOpen ? 0.5 : 0,
                              duration: const Duration(milliseconds: 200),
                              child: Icon(CupertinoIcons.chevron_down,
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
                        child: Text(_faqs[i]['a']!,
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
          const SizedBox(height: DT.xxl),
          // Contact
          Text('联系客服', style: DT.titleMedium),
          const SizedBox(height: DT.md),
          Container(
            decoration: BoxDecoration(
              color: DT.surface,
              borderRadius: BorderRadius.circular(DT.rXxl),
              boxShadow: DT.shadowSm,
            ),
            child: Column(
              children: [
                _buildContactRow(
                  icon: CupertinoIcons.phone,
                  label: '客服电话',
                  value: '400-800-1234',
                  action: '拨打',
                  onTap: () {
                    HapticFeedback.lightImpact();
                  },
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: DT.xl),
                  child: Divider(height: 1, color: DT.dividerWarm),
                ),
                _buildContactRow(
                  icon: CupertinoIcons.chat_bubble,
                  label: '客服微信',
                  value: 'nailbook-service',
                  action: '复制',
                  onTap: () {
                    HapticFeedback.lightImpact();
                    Clipboard.setData(
                        const ClipboardData(text: 'nailbook-service'));
                    NbToast.show(context, '客服微信号已复制');
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: DT.lg),
          Center(
            child: Text('客服工作时间：每日 9:00 - 21:00', style: DT.captionLarge),
          ),
        ],
      ),
    );
  }

  Widget _buildContactRow({
    required IconData icon,
    required String label,
    required String value,
    required String action,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: DT.xl, vertical: DT.md),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: DT.primarySoft,
                borderRadius: BorderRadius.circular(DT.rMd),
              ),
              alignment: Alignment.center,
              child: Icon(icon, size: 20, color: DT.primary),
            ),
            const SizedBox(width: DT.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style:
                          DT.bodyMedium.copyWith(fontWeight: FontWeight.w500)),
                  Text(value, style: DT.captionLarge),
                ],
              ),
            ),
            Text(action,
                style: DT.bodyMedium
                    .copyWith(fontWeight: FontWeight.w600, color: DT.primary)),
          ],
        ),
      ),
    );
  }
}
