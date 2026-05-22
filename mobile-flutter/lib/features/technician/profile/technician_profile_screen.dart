import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../auth/technician_auth_service.dart';
import '../auth/technician_auth_models.dart';
import '../works/technician_works_screen.dart';
import '../services/technician_services_screen.dart';
import '../customers/technician_customers_screen.dart';
import '../orders/technician_orders_screen.dart';
import '../../shared/chat/conversations_screen.dart';

class TechnicianProfileScreen extends StatefulWidget {
  const TechnicianProfileScreen({super.key});

  @override
  State<TechnicianProfileScreen> createState() => _TechnicianProfileScreenState();
}

class _TechnicianProfileScreenState extends State<TechnicianProfileScreen> {
  TechnicianProfile? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final apiClient = context.read<ApiClient>();
      final profile = await TechnicianAuthService(apiClient).getProfile();
      if (mounted) setState(() { _profile = profile; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final name = _profile?.name ?? '';
    final phone = _profile?.phone ?? '';
    final avatarUrl = _profile?.avatarUrl;
    final status = _profile?.status ?? 'inactive';
    final homeService = _profile?.homeService ?? false;
    final shopService = _profile?.shopService ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('我的')),
      body: ListView(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [const Color(0xFFE91E63), const Color(0xFFF06292)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(children: [
              CircleAvatar(
                radius: 40,
                backgroundColor: Colors.white,
                backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                child: avatarUrl == null
                    ? Text(name.isNotEmpty ? name.substring(0, 1) : '?',
                        style: const TextStyle(fontSize: 28, color: Color(0xFFE91E63)))
                    : null,
              ),
              const SizedBox(height: 12),
              Text(name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 4),
              Text(phone, style: const TextStyle(color: Colors.white70)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: status == 'active' ? Colors.green.shade700 : Colors.grey.shade600,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(status == 'active' ? '接单中' : '休息中', style: const TextStyle(color: Colors.white, fontSize: 12)),
              ),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              if (homeService) _serviceBadge('上门服务', Icons.home, Colors.blue),
              if (homeService && shopService) const SizedBox(width: 8),
              if (shopService) _serviceBadge('到店服务', Icons.store, Colors.orange),
            ]),
          ),
          _menuSection('快捷入口', [
            _MenuItem(Icons.receipt_long, '订单管理', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TechnicianOrdersScreen()))),
            _MenuItem(Icons.people, '客户管理', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TechnicianCustomersScreen()))),
            _MenuItem(Icons.photo_library, '作品管理', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TechnicianWorksScreen()))),
            _MenuItem(Icons.miscellaneous_services, '服务管理', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TechnicianServicesScreen()))),
            _MenuItem(Icons.chat_bubble_outline, '消息', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ConversationsScreen()))),
          ]),
          _menuSection('设置', [
            _MenuItem(Icons.toggle_on, '状态切换', () => _toggleStatus()),
            _MenuItem(Icons.edit, '个人设置', () => _showProfileEdit()),
            _MenuItem(Icons.home_repair_service, '服务类型设置', () => _showServiceTypeEdit()),
          ]),
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              height: 44,
              child: OutlinedButton(
                onPressed: () => context.read<AuthSession>().logout(),
                style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                child: const Text('退出登录'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _serviceBadge(String label, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 12, color: color)),
      ]),
    );
  }

  Widget _menuSection(String title, List<_MenuItem> items) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
        child: Text(title, style: Theme.of(context).textTheme.titleMedium),
      ),
      ...items.map((item) => ListTile(
        leading: Icon(item.icon, color: const Color(0xFFE91E63)),
        title: Text(item.label),
        trailing: const Icon(Icons.chevron_right, size: 20),
        onTap: item.onTap,
      )),
    ]);
  }

  Future<void> _toggleStatus() async {
    final newStatus = _profile?.status == 'active' ? 'inactive' : 'active';
    try {
      final apiClient = context.read<ApiClient>();
      await TechnicianAuthService(apiClient).updateStatus(newStatus);
      _loadProfile();
    } catch (_) {}
  }

  void _showProfileEdit() {
    final nameCtl = TextEditingController(text: _profile?.name ?? '');
    final cityCtl = TextEditingController(text: _profile?.city ?? '');
    final areaCtl = TextEditingController(text: _profile?.serviceArea ?? '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('个人设置'),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: nameCtl, decoration: const InputDecoration(labelText: '名称')),
            TextField(controller: cityCtl, decoration: const InputDecoration(labelText: '城市')),
            TextField(controller: areaCtl, decoration: const InputDecoration(labelText: '服务区域')),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final apiClient = context.read<ApiClient>();
                await TechnicianAuthService(apiClient).updateProfile({
                  'name': nameCtl.text,
                  'city': cityCtl.text,
                  'serviceArea': areaCtl.text,
                });
                _loadProfile();
              } catch (_) {}
            },
            child: const Text('保存'),
          ),
        ],
      ),
    );
  }

  void _showServiceTypeEdit() {
    bool homeService = _profile?.homeService ?? false;
    bool shopService = _profile?.shopService ?? false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('服务类型设置'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            SwitchListTile(
              title: const Text('上门服务'),
              value: homeService,
              onChanged: (v) => setDialogState(() => homeService = v),
            ),
            SwitchListTile(
              title: const Text('到店服务'),
              value: shopService,
              onChanged: (v) => setDialogState(() => shopService = v),
            ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  final apiClient = context.read<ApiClient>();
                  await TechnicianAuthService(apiClient).updateServiceType({
                    'homeService': homeService,
                    'shopService': shopService,
                  });
                  _loadProfile();
                } catch (_) {}
              },
              child: const Text('保存'),
            ),
          ],
        ),
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  _MenuItem(this.icon, this.label, this.onTap);
}
