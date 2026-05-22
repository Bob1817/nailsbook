import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../auth/technician_auth_service.dart';
import '../schedule/technician_schedule_screen.dart';
import '../orders/technician_orders_screen.dart';
import '../../shared/chat/conversations_screen.dart';
import '../profile/technician_profile_screen.dart';

class TechnicianHomeScreen extends StatefulWidget {
  const TechnicianHomeScreen({super.key});

  @override
  State<TechnicianHomeScreen> createState() => _TechnicianHomeScreenState();
}

class _TechnicianHomeScreenState extends State<TechnicianHomeScreen> {
  int _currentIndex = 0;
  Map<String, dynamic>? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final apiClient = context.read<ApiClient>();
      final data = await apiClient.get('/auth/me');
      if (mounted) setState(() { _profile = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      _TechnicianHomeTabPage(profile: _profile, loading: _loading, onRefresh: _loadProfile),
      const TechnicianScheduleScreen(),
      const TechnicianOrdersScreen(),
      const ConversationsScreen(),
      const TechnicianProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: pages),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFFE91E63),
        unselectedItemColor: const Color(0xFF757575),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: '首页'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today), label: '日程'),
          BottomNavigationBarItem(icon: Icon(Icons.receipt_long), label: '订单'),
          BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), label: '消息'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: '我的'),
        ],
      ),
    );
  }
}

class _TechnicianHomeTabPage extends StatelessWidget {
  final Map<String, dynamic>? profile;
  final bool loading;
  final Future<void> Function() onRefresh;

  const _TechnicianHomeTabPage({this.profile, this.loading = true, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('NailBook')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(onRefresh: onRefresh, child: _buildBody(context)),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (profile == null) {
      return ListView(children: [
        const SizedBox(height: 100),
        Center(child: Text('加载失败', style: Theme.of(context).textTheme.bodyLarge)),
      ]);
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              CircleAvatar(
                backgroundColor: const Color(0xFFE91E63),
                radius: 28,
                child: Text(
                  (profile!['name'] as String?)?.substring(0, 1) ?? '?',
                  style: const TextStyle(color: Colors.white, fontSize: 24),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(profile!['name']?.toString() ?? '', style: Theme.of(context).textTheme.titleLarge),
                  if (profile!['city'] != null)
                    Text('${profile!['city']} · ${profile!['serviceArea'] ?? ''}', style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: profile!['status'] == 'active' ? Colors.green.shade50 : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      profile!['status'] == 'active' ? '接单中' : '休息中',
                      style: TextStyle(
                        fontSize: 12,
                        color: profile!['status'] == 'active' ? Colors.green : Colors.grey,
                      ),
                    ),
                  ),
                ]),
              ),
            ]),
          ),
        ),
        const SizedBox(height: 16),
        Text('快捷操作', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        Row(children: [
          _quickAction(context, Icons.receipt_long, '订单管理', Colors.blue),
          const SizedBox(width: 8),
          _quickAction(context, Icons.people, '客户管理', Colors.orange),
          const SizedBox(width: 8),
          _quickAction(context, Icons.photo_library, '作品管理', Colors.purple),
        ]),
        const SizedBox(height: 16),
        Row(children: [
          _quickAction(context, Icons.miscellaneous_services, '服务管理', Colors.teal),
          const SizedBox(width: 8),
          _quickAction(context, Icons.toggle_on, '状态切换', profile!['status'] == 'active' ? Colors.red : Colors.green),
          const SizedBox(width: 8),
          _quickAction(context, Icons.settings, '资料设置', Colors.grey),
        ]),
      ],
    );
  }

  Widget _quickAction(BuildContext context, IconData icon, String label, Color color) {
    return Expanded(
      child: Material(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => _handleQuickAction(context, label),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Column(children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(height: 6),
              Text(label, style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w500)),
            ]),
          ),
        ),
      ),
    );
  }

  Future<void> _handleQuickAction(BuildContext context, String label) async {
    if (label == '状态切换') {
      final newStatus = profile?['status'] == 'active' ? 'inactive' : 'active';
      try {
        final apiClient = context.read<ApiClient>();
        await TechnicianAuthService(apiClient).updateStatus(newStatus);
        await onRefresh();
      } catch (_) {}
    }
  }
}