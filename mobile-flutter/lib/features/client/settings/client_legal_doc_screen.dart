import 'package:nailbook_mobile/core/widgets/glass_container.dart';


/// 法律文档（用户协议 / 隐私政策）。静态内容，对齐 webapp LegalDoc.tsx。
class ClientLegalDocScreen extends StatelessWidget {
  /// 'terms' 或 'privacy'
  final String type;
  const ClientLegalDocScreen({super.key, required this.type});

  static const _docs = <String, (String, String)>{
    'terms': ('用户协议', '使用本应用即表示你同意遵守相关法律法规与平台规则。平台仅提供预约与沟通工具，不参与线上支付与交易。'),
    'privacy': (
      '隐私政策',
      '我们仅收集为提供服务所必需的信息（账号、预约与联系信息），用于预约管理与通知，不会向无关第三方出售你的个人信息。'
    ),
  };

  @override
  Widget build(BuildContext context) {
    final doc = _docs[type] ?? _docs['terms']!;
    return Scaffold(
      backgroundColor: ET.bg,
      appBar: GlassAppBar(title: Text(doc.$1), dark: true),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
                color: ET.surface, borderRadius: BorderRadius.circular(20)),
            child: Text(doc.$2,
                style: const TextStyle(
                    fontSize: 14, height: 1.8, color: ET.inkSecondary)),
          ),
        ],
      ),
    );
  }
}
