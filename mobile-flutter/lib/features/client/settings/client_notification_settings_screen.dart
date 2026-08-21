import 'package:nailbook_mobile/core/widgets/glass_container.dart';

/// 通知设置：本地偏好（SharedPreferences）。对齐 webapp NotificationSettings.tsx。
class ClientNotificationSettingsScreen extends StatefulWidget {
  const ClientNotificationSettingsScreen({super.key});

  @override
  State<ClientNotificationSettingsScreen> createState() => _State();
}

const _items = <(String, String, String, bool)>[
  ('orderStatus', '预约状态提醒', '报价、确认、行程等状态变化通知', true),
  ('artistMessage', '美甲师消息', '美甲师给你发来新消息时通知', true),
  ('marketing', '活动与优惠', '美甲师活动、优惠等推广通知', false),
];

class _State extends State<ClientNotificationSettingsScreen> {
  final Map<String, bool> _prefs = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final sp = await SharedPreferences.getInstance();
    setState(() {
      for (final it in _items) {
        _prefs[it.$1] = sp.getBool('client_notify_${it.$1}') ?? it.$4;
      }
      _loading = false;
    });
  }

  Future<void> _set(String key, bool value) async {
    setState(() => _prefs[key] = value);
    final sp = await SharedPreferences.getInstance();
    await sp.setBool('client_notify_$key', value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ET.bg,
      appBar: const GlassAppBar(title: Text('通知设置'), dark: true),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: ET.accent))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Material(
                  color: ET.surface,
                  borderRadius: BorderRadius.circular(16),
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    children: List.generate(_items.length, (i) {
                      final it = _items[i];
                      return Column(
                        children: [
                          if (i > 0)
                            const Divider(height: 1, color: Color(0x11000000)),
                          SwitchListTile(
                            activeThumbColor: ET.accent,
                            title: Text(it.$2,
                                style: const TextStyle(
                                    fontSize: 15, color: ET.ink)),
                            subtitle: Text(it.$3,
                                style: const TextStyle(
                                    fontSize: 12, color: ET.inkSecondary)),
                            value: _prefs[it.$1] ?? it.$4,
                            onChanged: (v) => _set(it.$1, v),
                          ),
                        ],
                      );
                    }),
                  ),
                ),
              ],
            ),
    );
  }
}
