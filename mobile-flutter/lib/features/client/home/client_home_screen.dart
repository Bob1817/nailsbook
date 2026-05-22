import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../orders/client_orders_screen.dart';
import '../../shared/chat/conversations_screen.dart';
import '../profile/client_profile_screen.dart';
import '../works/client_works_screen.dart';
import '../works/client_work_detail_screen.dart';

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
      if (mounted) setState(() { _homeData = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      _ClientHomeTabPage(homeData: _homeData, loading: _loading, onRefresh: _loadHomeData),
      const ClientOrdersScreen(),
      const ConversationsScreen(),
      const ClientProfileScreen(),
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
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today), label: '订单'),
          BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), label: '消息'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: '我的'),
        ],
      ),
    );
  }
}

class _ClientHomeTabPage extends StatelessWidget {
  final Map<String, dynamic>? homeData;
  final bool loading;
  final Future<void> Function() onRefresh;

  const _ClientHomeTabPage({this.homeData, this.loading = true, required this.onRefresh});

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
    if (homeData == null) {
      return ListView(children: [
        const SizedBox(height: 100),
        Center(child: Text('暂无数据', style: Theme.of(context).textTheme.bodyLarge)),
      ]);
    }

    final technician = homeData!['technician'] as Map<String, dynamic>?;
    final works = homeData!['works'] as List<dynamic>? ?? [];

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
        Row(children: [
          Text('作品', style: Theme.of(context).textTheme.titleMedium),
          const Spacer(),
          TextButton(
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ClientWorksScreen())),
            child: const Text('查看全部'),
          ),
        ]),
        const SizedBox(height: 8),
        if (works.isEmpty)
          const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('暂无作品')))
        else
          SizedBox(
            height: 200,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: works.length > 6 ? 6 : works.length,
              itemBuilder: (context, index) {
                final w = works[index];
                final images = (w['imageUrls'] as List<dynamic>?) ?? [];
                return GestureDetector(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => ClientWorkDetailScreen(workId: w['id'] as int)),
                  ),
                  child: Container(
                    width: 160,
                    margin: const EdgeInsets.only(right: 8),
                    child: Card(
                      clipBehavior: Clip.antiAlias,
                      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                        Expanded(
                          child: images.isNotEmpty
                              ? Image.network(images[0].toString(), fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(color: Colors.grey.shade200, child: const Icon(Icons.spa, color: Colors.grey)))
                              : Container(color: Colors.grey.shade200, child: const Icon(Icons.spa, color: Colors.grey)),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(8),
                          child: Text(w['title']?.toString() ?? '未命名作品',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              maxLines: 1, overflow: TextOverflow.ellipsis),
                        ),
                      ]),
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}