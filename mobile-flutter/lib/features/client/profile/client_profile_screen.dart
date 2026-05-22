import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../auth/client_auth_service.dart';
import '../auth/client_auth_models.dart';
import '../addresses/client_addresses_screen.dart';
import '../orders/client_orders_screen.dart';
import '../designs/client_designs_screen.dart';
import '../../shared/chat/conversations_screen.dart';

class ClientProfileScreen extends StatefulWidget {
  const ClientProfileScreen({super.key});

  @override
  State<ClientProfileScreen> createState() => _ClientProfileScreenState();
}

class _ClientProfileScreenState extends State<ClientProfileScreen> {
  Map<String, dynamic>? _profile;
  List<Technician>? _technicians;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final apiClient = context.read<ApiClient>();
      final data = await ClientAuthService(apiClient).getProfile();
      if (mounted) {
        setState(() {
          _profile = data;
          _technicians = (data['technicians'] as List<dynamic>?)
                  ?.map((e) => Technician.fromJson(e as Map<String, dynamic>))
                  .toList() ??
              [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final client = (_profile?['client'] as Map<String, dynamic>?) ?? _profile;
    final nickname = (client?['nickname'] as String?) ?? '';
    final phone = (client?['phone'] as String?) ?? '';
    final avatarUrl = client?['avatarUrl'] as String?;

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
                    ? Text(nickname.isNotEmpty ? nickname.substring(0, 1) : '?',
                        style: const TextStyle(fontSize: 28, color: Color(0xFFE91E63)))
                    : null,
              ),
              const SizedBox(height: 12),
              Text(nickname.isNotEmpty ? nickname : '未设置昵称',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 4),
              Text(phone, style: const TextStyle(color: Colors.white70)),
            ]),
          ),
          if (_technicians != null && _technicians!.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text('我的美甲师', style: Theme.of(context).textTheme.titleMedium),
            ),
            ..._technicians!.map((tech) => Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: const Color(0xFFE91E63),
                  child: Text(tech.name.substring(0, 1),
                      style: const TextStyle(color: Colors.white)),
                ),
                title: Row(children: [
                  Expanded(child: Text(tech.name)),
                  if (tech.isDefault == true)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE91E63),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text('默认', style: TextStyle(color: Colors.white, fontSize: 11)),
                    ),
                ]),
                subtitle: Text(tech.city ?? ''),
                trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                  if (tech.isDefault != true)
                    TextButton(
                      onPressed: () => _setDefault(tech.id),
                      child: const Text('设为默认', style: TextStyle(fontSize: 12)),
                    ),
                  TextButton(
                    onPressed: () => _unbind(tech.id),
                    child: const Text('解除', style: TextStyle(fontSize: 12, color: Colors.red)),
                  ),
                ]),
              ),
            )),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: OutlinedButton.icon(
                onPressed: () => _showBindDialog(context),
                icon: const Icon(Icons.add),
                label: const Text('绑定新美甲师'),
              ),
            ),
          ],
          const SizedBox(height: 16),
          _menuSection('我的服务', [
            _MenuItem(Icons.location_on, '地址管理', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ClientAddressesScreen()))),
            _MenuItem(Icons.calendar_today, '我的预约', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ClientOrdersScreen()))),
            _MenuItem(Icons.palette, '我的设计', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ClientDesignsScreen()))),
            _MenuItem(Icons.chat_bubble_outline, '联系客服', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ConversationsScreen()))),
          ]),
          _menuSection('更多', [
            _MenuItem(Icons.settings, '设置', null),
            _MenuItem(Icons.help_outline, '帮助与反馈', null),
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
          const Center(child: Text('v1.0.0', style: TextStyle(color: Color(0xFF9E9E9E), fontSize: 12))),
          const SizedBox(height: 16),
        ],
      ),
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

  Future<void> _setDefault(int techId) async {
    try {
      final apiClient = context.read<ApiClient>();
      await ClientAuthService(apiClient).setDefaultTechnician(techId);
      _loadProfile();
    } catch (_) {}
  }

  Future<void> _unbind(int techId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('解除绑定'),
        content: const Text('确定要解除与该美甲师的绑定吗？'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('确定')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      final apiClient = context.read<ApiClient>();
      await ClientAuthService(apiClient).unbindTechnician(techId);
      _loadProfile();
    } catch (_) {}
  }

  void _showBindDialog(BuildContext context) {
    final codeCtl = TextEditingController();
    Technician? found;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('绑定美甲师'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(
              controller: codeCtl,
              decoration: const InputDecoration(labelText: '邀请码', hintText: '输入美甲师邀请码'),
              onChanged: (v) async {
                if (v.length >= 4) {
                  try {
                    final apiClient = context.read<ApiClient>();
                    final tech = await ClientAuthService(apiClient).findTechnicianByInviteCode(v.trim());
                    setDialogState(() => found = tech);
                  } catch (_) {
                    setDialogState(() => found = null);
                  }
                }
              },
            ),
            if (found != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF5F5F5),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(children: [
                  const Icon(Icons.person, color: Color(0xFFE91E63)),
                  const SizedBox(width: 8),
                  Text(found!.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                  if (found!.city != null) Text(' · ${found!.city!}', style: const TextStyle(color: Color(0xFF757575))),
                ]),
              ),
            ],
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
            ElevatedButton(
              onPressed: found != null ? () async {
                Navigator.pop(ctx);
                try {
                  final apiClient = context.read<ApiClient>();
                  await ClientAuthService(apiClient).bindTechnician(
                    techId: found!.id,
                    inviteCode: codeCtl.text.trim(),
                    isDefault: _technicians?.isEmpty ?? true,
                  );
                  _loadProfile();
                } catch (_) {}
              } : null,
              child: const Text('确认绑定'),
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
