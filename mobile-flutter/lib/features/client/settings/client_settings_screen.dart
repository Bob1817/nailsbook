import 'package:nailbook_mobile/core/widgets/glass_container.dart';

import 'client_change_password_screen.dart';
import 'client_legal_doc_screen.dart';
import 'client_notification_settings_screen.dart';

/// 设置入口：修改密码 / 通知设置 / 用户协议 / 隐私政策。
class ClientSettingsScreen extends StatelessWidget {
  const ClientSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ET.bg,
      appBar: const GlassAppBar(title: Text('设置'), dark: true),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _group(context, [
            _Item(
                Icons.lock_outline, '修改密码', const ClientChangePasswordScreen()),
            _Item(Icons.notifications_none, '通知设置',
                const ClientNotificationSettingsScreen()),
          ]),
          const SizedBox(height: 16),
          _group(context, [
            _Item(Icons.description_outlined, '用户协议',
                const ClientLegalDocScreen(type: 'terms')),
            _Item(Icons.privacy_tip_outlined, '隐私政策',
                const ClientLegalDocScreen(type: 'privacy')),
          ]),
        ],
      ),
    );
  }

  Widget _group(BuildContext context, List<_Item> items) {
    return Material(
      color: ET.surface,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: List.generate(items.length, (i) {
          final it = items[i];
          return Column(
            children: [
              if (i > 0)
                const Divider(height: 1, indent: 56, color: Color(0x11000000)),
              ListTile(
                leading: Icon(it.icon, color: ET.accent),
                title: Text(it.label,
                    style: const TextStyle(fontSize: 15, color: ET.ink)),
                trailing: const Icon(Icons.chevron_right, color: ET.inkMuted),
                onTap: () => Navigator.push(
                    context, MaterialPageRoute(builder: (_) => it.page)),
              ),
            ],
          );
        }),
      ),
    );
  }
}

class _Item {
  final IconData icon;
  final String label;
  final Widget page;
  _Item(this.icon, this.label, this.page);
}
