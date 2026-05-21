import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';

class ClientHomeScreen extends StatefulWidget {
  const ClientHomeScreen({super.key});

  @override
  State<ClientHomeScreen> createState() => _ClientHomeScreenState();
}

class _ClientHomeScreenState extends State<ClientHomeScreen> {
  int _currentIndex = 0;
  Map<String, dynamic>? _homeData;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadHomeData();
  }

  Future<void> _loadHomeData() async {
    try {
      final apiClient = context.read<ApiClient>();
      final data = await apiClient.get('/home');
      if (mounted) {
        setState(() { _homeData = data; _loading = false; });
      }
    } catch (_) {
      if (mounted) {
        setState(() { _loading = false; });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('NailBook'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => context.read<AuthSession>().logout(),
            tooltip: '退出登录',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadHomeData,
              child: _buildBody(),
            ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: '首页'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today), label: '订单'),
          BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), label: '消息'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: '我的'),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_homeData == null) {
      return ListView(children: [
        const SizedBox(height: 100),
        Center(child: Text('暂无数据', style: Theme.of(context).textTheme.bodyLarge)),
      ]);
    }

    final technician = _homeData!['technician'] as Map<String, dynamic>?;
    final works = _homeData!['works'] as List<dynamic>? ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (technician != null) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(children: [
                CircleAvatar(
                  backgroundColor: const Color(0xFFE91E63),
                  child: Text(
                    (technician['name'] as String?)?.substring(0, 1) ?? '?',
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(technician['name']?.toString() ?? '', style: Theme.of(context).textTheme.titleMedium),
                    if (technician['city'] != null)
                      Text(technician['city'].toString(), style: Theme.of(context).textTheme.bodySmall),
                  ]),
                ),
              ]),
            ),
          ),
          const SizedBox(height: 16),
        ],
        Text('作品', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (works.isEmpty)
          const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('暂无作品')))
        else
          ...works.map((w) => Card(
            child: ListTile(
              title: Text(w['title']?.toString() ?? '未命名作品'),
              subtitle: w['description'] != null ? Text(w['description'].toString(), maxLines: 2) : null,
            ),
          )),
      ],
    );
  }
}
