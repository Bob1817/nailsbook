import 'package:flutter/material.dart';
import '../../../core/theme/design_tokens.dart';

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
      'body': '用户在使用本平台时应遵守相关法律法规。本平台仅提供预约管理和沟通工具，不参与线上支付和收入分成。服务费用由美甲师与客户线下协商确定。',
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
      appBar: AppBar(
        backgroundColor: Colors.white.withOpacity(0.95),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: DT.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('关于我们',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // App identity
          Center(
            child: Column(
              children: [
                Container(
                  width: 80, height: 80,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFF6FA2), Color(0xFFFF81A4), Color(0xFFFFB387)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [BoxShadow(color: const Color(0x40FF5F86), blurRadius: 32, offset: const Offset(0, 16))],
                  ),
                  alignment: Alignment.center,
                  child: const Text('💅', style: TextStyle(fontSize: 36)),
                ),
                const SizedBox(height: 12),
                const Text('美甲师 Studio',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: DT.textPrimary)),
                const SizedBox(height: 4),
                Text('版本 1.0.0',
                  style: TextStyle(fontSize: 13, color: DT.textMuted)),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // Description
          Text(
            '专为独立移动美甲师打造的预约管理与客户维护工具。高效管理行程、客户档案和作品集，让美甲事业更轻松。',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, height: 1.6, color: DT.textSecondary),
          ),
          const SizedBox(height: 24),
          // Legal docs accordion
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: DT.shadowSm,
            ),
            child: Column(
              children: List.generate(_docs.length, (i) {
                final isOpen = _openIndex == i;
                final isLast = i == _docs.length - 1;
                return Column(
                  children: [
                    GestureDetector(
                      onTap: () => setState(() => _openIndex = isOpen ? null : i),
                      behavior: HitTestBehavior.opaque,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(_docs[i]['title']!,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: DT.textPrimary)),
                            ),
                            AnimatedRotation(
                              turns: isOpen ? 0.5 : 0,
                              duration: const Duration(milliseconds: 200),
                              child: Icon(Icons.keyboard_arrow_down_rounded, size: 22, color: DT.textMuted),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (isOpen)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(18, 0, 18, 16),
                        child: Text(_docs[i]['body']!,
                          style: TextStyle(fontSize: 13, height: 1.7, color: DT.textSecondary)),
                      ),
                    if (!isLast)
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 18),
                        child: Divider(height: 1, color: Color(0xFFF2F0F3)),
                      ),
                  ],
                );
              }),
            ),
          ),
          const SizedBox(height: 32),
          // Copyright
          Center(
            child: Text('© 2026 美甲师 Studio · 保留所有权利',
              style: TextStyle(fontSize: 12, color: DT.textMuted)),
          ),
        ],
      ),
    );
  }
}
