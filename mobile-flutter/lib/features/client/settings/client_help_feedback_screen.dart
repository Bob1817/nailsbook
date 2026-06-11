import 'package:nailbook_mobile/core/widgets/glass_container.dart';

import 'client_feedback_screen.dart';

/// 帮助与反馈：常见问题（折叠）+ 联系客服。对齐 webapp HelpFeedback.tsx。
class ClientHelpFeedbackScreen extends StatefulWidget {
  const ClientHelpFeedbackScreen({super.key});

  @override
  State<ClientHelpFeedbackScreen> createState() =>
      _ClientHelpFeedbackScreenState();
}

const _faqs = <(String, String)>[
  ('如何绑定美甲师？', '通过美甲师分享的邀请链接进入并完成注册即可自动绑定；已注册用户可在【我的】页面输入美甲师提供的邀请码完成绑定。'),
  ('如何发起预约？', '在【预约】页面新建预约，选择已绑定的美甲师、服务时间与地址后提交，等待美甲师报价确认即可。'),
  ('定金是如何处理的？', '平台不内置线上支付，定金通过线下方式支付。支付后在订单中标记「已付定金」，仅作状态记录。'),
  ('如何提交设计需求？', '在【设计】页面上传你喜欢的款式图片并填写描述，提交给美甲师报价，确认后可转为预约。'),
  ('可以绑定多个美甲师吗？', '可以。你可以绑定多位美甲师，并设置默认美甲师，预约时也可选择不同的美甲师。'),
];

class _ClientHelpFeedbackScreenState extends State<ClientHelpFeedbackScreen> {
  int? _open = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ET.bg,
      appBar: const GlassAppBar(title: Text('帮助与反馈'), dark: true),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Padding(
            padding: EdgeInsets.only(left: 4, bottom: 10),
            child: Text('常见问题',
                style: TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w600, color: ET.ink)),
          ),
          Material(
            color: ET.surface,
            borderRadius: BorderRadius.circular(16),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: List.generate(_faqs.length, (i) => _faqTile(i)),
            ),
          ),
          const SizedBox(height: 24),
          const Padding(
            padding: EdgeInsets.only(left: 4, bottom: 10),
            child: Text('需要帮助？',
                style: TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w600, color: ET.ink)),
          ),
          Material(
            color: ET.surface,
            borderRadius: BorderRadius.circular(16),
            clipBehavior: Clip.antiAlias,
            child: ListTile(
              leading: const Icon(Icons.headset_mic_outlined, color: ET.accent),
              title: const Text('联系客服'),
              trailing: const Icon(Icons.chevron_right, color: ET.inkMuted),
              onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const ClientFeedbackScreen())),
            ),
          ),
        ],
      ),
    );
  }

  Widget _faqTile(int i) {
    final faq = _faqs[i];
    final open = _open == i;
    return Column(
      children: [
        if (i > 0) const Divider(height: 1, color: Color(0x11000000)),
        ListTile(
          title: Text(faq.$1,
              style: const TextStyle(
                  fontSize: 14, fontWeight: FontWeight.w500, color: ET.ink)),
          trailing: Icon(open ? Icons.expand_less : Icons.expand_more,
              color: ET.inkMuted),
          onTap: () => setState(() => _open = open ? null : i),
        ),
        if (open)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(faq.$2,
                  style: const TextStyle(
                      fontSize: 13, height: 1.6, color: ET.inkSecondary)),
            ),
          ),
      ],
    );
  }
}
