import 'dart:async';
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/theme/editorial_tokens.dart';
import '../../../core/widgets/client_glass_header.dart';
import '../../../core/widgets/glass_container.dart';
import '../discover/client_discover_screen.dart';
import '../../shared/chat/conversations_screen.dart';
import '../orders/client_create_order_screen.dart';
import '../orders/client_orders_screen.dart';
import '../orders/client_order_detail_screen.dart';
import '../orders/client_order_models.dart';
import '../orders/client_order_service.dart';
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
      if (mounted)
        setState(() {
          _homeData = data;
          _loading = false;
        });
    } catch (_) {
      if (mounted)
        setState(() {
          _loading = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      _ClientHomeTabPage(
        homeData: _homeData,
        loading: _loading,
        onRefresh: _loadHomeData,
        onSelectTab: (i) => setState(() => _currentIndex = i),
      ),
      const ClientOrdersScreen(),
      const ClientDiscoverScreen(),
      const ConversationsScreen(),
      const ClientProfileScreen(),
    ];

    return Scaffold(
      extendBody: true,
      body: IndexedStack(index: _currentIndex, children: pages),
      bottomNavigationBar: _GlassTabBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
      ),
    );
  }
}

/// 浮动玻璃态底部导航（Liquid Glass）。对齐 CLAUDE_CODE_GUIDE Step 4。
class _GlassTabBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const _GlassTabBar({required this.currentIndex, required this.onTap});

  static const _items = <(IconData, IconData, String)>[
    (Icons.home_rounded, Icons.home_outlined, '首页'),
    (Icons.calendar_today_rounded, Icons.calendar_today_outlined, '预约'),
    (Icons.explore_rounded, Icons.explore_outlined, '发现'),
    (Icons.chat_bubble_rounded, Icons.chat_bubble_outline_rounded, '消息'),
    (Icons.person_rounded, Icons.person_outline_rounded, '我的'),
  ];

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).padding.bottom;
    // 缩小与屏幕底部的距离：只保留 home indicator 之上的小间隙
    final bottomGap = (bottomInset * 0.4).clamp(8.0, 16.0);
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, bottomGap),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: BackdropFilter(
          // 增强毛玻璃：更大模糊 + 更透的底色，让滚动内容透出
          filter: ImageFilter.blur(sigmaX: 36, sigmaY: 36),
          child: Container(
            decoration: BoxDecoration(
              color: ET.bgElevated.withValues(alpha: 0.58),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: ET.hairlineStrong),
              boxShadow: const [
                BoxShadow(
                    color: Color(0x66000000),
                    blurRadius: 28,
                    offset: Offset(0, 10))
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 2),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(_items.length, (i) => _tab(i)),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _tab(int i) {
    final item = _items[i];
    final active = i == currentIndex;
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => onTap(i),
        child: SizedBox(
          height: 48,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(active ? item.$1 : item.$2,
                  size: 24, color: active ? ET.accent : ET.inkSecondary),
              const SizedBox(height: 2),
              Text(
                item.$3,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                  color: active ? ET.accent : ET.inkSecondary,
                ),
              ),
              const SizedBox(height: 3),
              // 4px 选中指示点
              Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: active ? ET.accent : Colors.transparent,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 客户端首页 — 图片优先编辑式（Hero 作品轮播 / 我的预约 / 最新动态）。
/// 保留 webapp Home.tsx 的功能模块，UI 对齐 Apple + Liquid Glass 设计准则。
class _ClientHomeTabPage extends StatefulWidget {
  final Map<String, dynamic>? homeData;
  final bool loading;
  final Future<void> Function() onRefresh;
  final ValueChanged<int> onSelectTab;

  const _ClientHomeTabPage({
    this.homeData,
    this.loading = true,
    required this.onRefresh,
    required this.onSelectTab,
  });

  @override
  State<_ClientHomeTabPage> createState() => _ClientHomeTabPageState();
}

const _upcomingStatuses = {
  'pending_quote',
  'pending_agree',
  'pending_confirm',
  'pending_home',
  'pending_shop',
  'in_progress',
};

class _ClientHomeTabPageState extends State<_ClientHomeTabPage> {
  final _scrollController = ScrollController();
  final _pageController = PageController();

  final List<Map<String, dynamic>> _featured = [];
  int _featPage = 1;
  bool _featHasMore = true;
  bool _featLoading = false;

  ClientOrder? _upcoming;
  int _heroIndex = 0;
  Timer? _heroTimer;

  @override
  void initState() {
    super.initState();
    _loadFeatured(reset: true);
    _loadUpcoming();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _heroTimer?.cancel();
    _scrollController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _heroWorks {
    final works = (widget.homeData?['works'] as List<dynamic>?) ?? const [];
    return works.take(5).cast<Map<String, dynamic>>().toList();
  }

  void _ensureHeroTimer() {
    final count = _heroWorks.length;
    if (count <= 1) {
      _heroTimer?.cancel();
      return;
    }
    _heroTimer ??= Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || !_pageController.hasClients) return;
      final next = (_heroIndex + 1) % count;
      _pageController.animateToPage(next,
          duration: const Duration(milliseconds: 600), curve: Curves.easeInOut);
    });
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 400) {
      _loadFeatured();
    }
  }

  Future<void> _loadFeatured({bool reset = false}) async {
    if (_featLoading) return;
    if (!reset && !_featHasMore) return;
    setState(() => _featLoading = true);
    final page = reset ? 1 : _featPage + 1;
    try {
      final json =
          await context.read<ApiClient>().get('/featured-works', queryParams: {
        'page': '$page',
        'limit': '10',
      });
      final works =
          (json['works'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [];
      if (mounted) {
        setState(() {
          if (reset) _featured.clear();
          _featured.addAll(works);
          _featHasMore = json['hasMore'] as bool? ?? false;
          _featPage = page;
          _featLoading = false;
        });
      }
    } catch (_) {
      if (mounted)
        setState(() {
          _featHasMore = false;
          _featLoading = false;
        });
    }
  }

  Future<void> _loadUpcoming() async {
    try {
      final orders = await ClientOrderService(context.read<ApiClient>()).list();
      final upcoming = orders
          .where((o) =>
              _upcomingStatuses.contains(o.status) &&
              (o.startTime?.isNotEmpty ?? false))
          .toList()
        ..sort((a, b) => (a.startTime ?? '').compareTo(b.startTime ?? ''));
      if (mounted)
        setState(() => _upcoming = upcoming.isEmpty ? null : upcoming.first);
    } catch (_) {/* 静默 */}
  }

  Future<void> _refreshAll() async {
    await Future.wait(
        [widget.onRefresh(), _loadFeatured(reset: true), _loadUpcoming()]);
  }

  @override
  Widget build(BuildContext context) {
    _ensureHeroTimer();
    final headerH = ClientGlassHeader.estimateHeight(context);
    final tech = widget.homeData?['technician'] as Map<String, dynamic>?;
    final avatar = tech?['avatarUrl']?.toString();
    return Container(
      color: ET.bg,
      child: Stack(
        children: [
          RefreshIndicator(
            color: ET.accent,
            backgroundColor: ET.surface,
            onRefresh: _refreshAll,
            child: CustomScrollView(
              controller: _scrollController,
              slivers: [
                SliverToBoxAdapter(child: SizedBox(height: headerH + 4)),
                SliverToBoxAdapter(child: _heroSection()),
                SliverToBoxAdapter(child: _bookingSection()),
                SliverToBoxAdapter(child: _latestHeader()),
                _featuredGrid(),
                SliverToBoxAdapter(child: _footer()),
                const SliverToBoxAdapter(child: SizedBox(height: 96)),
              ],
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: ClientGlassHeader(
              title: '首页',
              actions: [
                HeaderCircleButton(
                  onTap: () => widget.onSelectTab(3),
                  child: const Icon(Icons.chat_bubble_outline_rounded,
                      size: 20, color: ET.inkSecondary),
                ),
                const SizedBox(width: 8),
                _headerAvatar(avatar),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _headerAvatar(String? avatar) {
    return GestureDetector(
      onTap: () => widget.onSelectTab(4),
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: ET.surface,
          border: Border.all(color: ET.hairline),
          image: (avatar != null && avatar.isNotEmpty)
              ? DecorationImage(
                  image: CachedNetworkImageProvider(avatar), fit: BoxFit.cover)
              : null,
        ),
        child: (avatar == null || avatar.isEmpty)
            ? const Icon(Icons.person_outline_rounded,
                size: 20, color: ET.inkSecondary)
            : null,
      ),
    );
  }

  // ── Hero carousel ───────────────────────────────────────
  Widget _heroSection() {
    final works = _heroWorks;
    if (works.isEmpty) return const SizedBox.shrink();
    final current = works[_heroIndex.clamp(0, works.length - 1)];
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: GestureDetector(
        onTap: () => Navigator.push(context,
            MaterialPageRoute(builder: (_) => const ClientWorksScreen())),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(DT.rHero),
          child: SizedBox(
            height: 440,
            child: Stack(
              fit: StackFit.expand,
              children: [
                // 美甲图：主角，满铺
                PageView.builder(
                  controller: _pageController,
                  itemCount: works.length,
                  onPageChanged: (i) => setState(() => _heroIndex = i),
                  itemBuilder: (_, i) => _heroSlide(works[i]),
                ),
                // 仅底部轻渐变，保证文字可读，上方照片不被压暗
                const IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Colors.transparent,
                          Color(0x73000000),
                          Color(0xB3000000),
                        ],
                        stops: [0.0, 0.55, 0.82, 1.0],
                      ),
                    ),
                  ),
                ),
                // 底部轻量信息 + 分页点（弱化非图片内容）
                Positioned(
                  left: 16,
                  right: 16,
                  bottom: 16,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(child: _heroCaption(current)),
                      const SizedBox(width: 12),
                      if (works.length > 1)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 2),
                          child: _heroDots(works.length),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // 底部轻量说明：标题 + 小达人，直接叠在图片上（无玻璃卡片）
  Widget _heroCaption(Map<String, dynamic> w) {
    final title = w['title']?.toString();
    final techName = w['technicianName']?.toString() ?? '已绑定美甲师';
    final techAvatar = w['technicianAvatarUrl']?.toString();
    const shadow = [
      Shadow(color: Color(0xB3000000), blurRadius: 12, offset: Offset(0, 1))
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(title?.isNotEmpty == true ? title! : '最新作品',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                shadows: shadow)),
        const SizedBox(height: 6),
        Row(
          children: [
            _heroAvatar(techName, techAvatar),
            const SizedBox(width: 7),
            Flexible(
              child: Text(techName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Colors.white.withValues(alpha: 0.9),
                      shadows: shadow)),
            ),
          ],
        ),
      ],
    );
  }

  Widget _heroSlide(Map<String, dynamic> w) {
    final cover = w['coverUrl']?.toString();
    final imgs = (w['imageUrls'] as List<dynamic>?) ?? const [];
    final url = (cover != null && cover.isNotEmpty)
        ? cover
        : (imgs.isNotEmpty ? imgs.first.toString() : null);
    if (url == null) return Container(color: ET.surface);
    return CachedNetworkImage(
      imageUrl: url,
      fit: BoxFit.cover,
      placeholder: (_, __) => Container(color: ET.surface),
      errorWidget: (_, __, ___) => Container(color: ET.surface),
    );
  }

  Widget _heroAvatar(String name, String? avatar) {
    if (avatar != null && avatar.isNotEmpty) {
      return Container(
        decoration: const BoxDecoration(shape: BoxShape.circle, boxShadow: [
          BoxShadow(color: Color(0x66000000), blurRadius: 6)
        ]),
        child: ClipOval(
            child: CachedNetworkImage(
                imageUrl: avatar, width: 22, height: 22, fit: BoxFit.cover)),
      );
    }
    return Container(
      width: 22,
      height: 22,
      alignment: Alignment.center,
      decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.28), shape: BoxShape.circle),
      child: Text(name.isNotEmpty ? name.substring(0, 1) : '美',
          style: const TextStyle(
              fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white)),
    );
  }

  // 精致分页点：当前页为细长胶囊，其余为小圆点
  Widget _heroDots(int count) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(count, (i) {
        final active = i == _heroIndex;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOut,
          margin: const EdgeInsets.only(left: 5),
          width: active ? 16 : 5,
          height: 5,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: active ? 0.95 : 0.5),
            borderRadius: BorderRadius.circular(999),
            boxShadow: const [
              BoxShadow(color: Color(0x59000000), blurRadius: 4)
            ],
          ),
        );
      }),
    );
  }

  // ── My booking ──────────────────────────────────────────
  Widget _bookingSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionHeader(
            '我的预约',
            _upcoming != null ? '距离最近的一次预约' : '快速发起你的下一次美甲',
            onMore: _upcoming != null
                ? () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => const ClientOrdersScreen()))
                : null,
          ),
          const SizedBox(height: 12),
          _upcoming != null ? _bookingCard(_upcoming!) : _bookingEmpty(),
        ],
      ),
    );
  }

  Widget _bookingCard(ClientOrder o) {
    final tech = o.technician;
    final start = DateTime.tryParse(o.startTime ?? '');
    return GestureDetector(
      onTap: () => _openOrder(o.id),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: ET.surface,
          borderRadius: BorderRadius.circular(DT.rCard),
          border: Border.all(color: ET.hairline),
          boxShadow: ET.shadowTile,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _tintPill(o.statusLabel, ET.accentSoft, ET.accentOnDark),
                const Spacer(),
                Text(_countdown(start),
                    style:
                        const TextStyle(fontSize: 12, color: ET.inkSecondary)),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _dateBlock(start),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(o.serviceType ?? '美甲服务',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: ET.ink)),
                      const SizedBox(height: 6),
                      _metaRow(Icons.access_time_rounded,
                          '${_hm(o.startTime)} - ${_hm(o.endTime)}'),
                      if (tech?['name'] != null) ...[
                        const SizedBox(height: 4),
                        _metaRow(Icons.person_outline_rounded,
                            tech!['name'].toString()),
                      ],
                      if (o.address != null && o.address!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        _metaRow(Icons.location_on_outlined, o.address!,
                            maxLines: 2),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            const Divider(height: 1, color: ET.hairline),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                    child: _bookingAction('发消息', () => widget.onSelectTab(3),
                        filled: false)),
                if (tech?['phone'] != null) ...[
                  const SizedBox(width: 8),
                  Expanded(
                      child: _bookingAction(
                          '打电话', () => _call(tech!['phone'].toString()),
                          filled: false)),
                ],
                const SizedBox(width: 8),
                Expanded(
                    child: _bookingAction('查看详情', () => _openOrder(o.id),
                        filled: true)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _bookingEmpty() {
    return GestureDetector(
      onTap: () => Navigator.push(context,
          MaterialPageRoute(builder: (_) => const ClientCreateOrderScreen())),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: ET.surface,
          borderRadius: BorderRadius.circular(DT.rCard),
          border: Border.all(color: ET.hairline),
          boxShadow: ET.shadowTile,
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                  color: ET.accentSoft,
                  borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.add_rounded, color: ET.accent, size: 26),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('还没有预约美甲',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: ET.ink)),
                  SizedBox(height: 4),
                  Text('预约你的美甲吧 ～',
                      style: TextStyle(fontSize: 13, color: ET.inkSecondary)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
              decoration: BoxDecoration(
                  color: ET.cream, borderRadius: BorderRadius.circular(999)),
              child: const Text('立即预约',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: ET.onCream)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _dateBlock(DateTime? d) {
    return Container(
      width: 72,
      height: 72,
      decoration: BoxDecoration(
          color: ET.accentSoft, borderRadius: BorderRadius.circular(16)),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(d != null ? '${d.month}月' : '--',
              style: const TextStyle(fontSize: 11, color: ET.accentOnDark)),
          Text(d != null ? '${d.day}' : '--',
              style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  height: 1.1,
                  color: ET.ink)),
        ],
      ),
    );
  }

  Widget _metaRow(IconData icon, String text, {int maxLines = 1}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 14, color: ET.inkMuted),
        const SizedBox(width: 6),
        Expanded(
          child: Text(text,
              maxLines: maxLines,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: ET.inkSecondary)),
        ),
      ],
    );
  }

  Widget _bookingAction(String label, VoidCallback onTap,
      {required bool filled}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: filled ? ET.cream : ET.surfaceGlass,
          borderRadius: BorderRadius.circular(999),
          border: filled ? null : Border.all(color: ET.hairline),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: filled ? ET.onCream : ET.ink)),
      ),
    );
  }

  // ── Latest works ────────────────────────────────────────
  Widget _latestHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
      child: _sectionHeader('最新动态', '来自你已绑定美甲师的作品发布',
          onMore: () => Navigator.push(context,
              MaterialPageRoute(builder: (_) => const ClientWorksScreen()))),
    );
  }

  Widget _featuredGrid() {
    if (_featured.isEmpty) {
      return SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Center(
            child: Text(_featLoading ? '加载中…' : '暂无作品展示',
                style: const TextStyle(fontSize: 13, color: ET.inkSecondary)),
          ),
        ),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.72,
        ),
        delegate: SliverChildBuilderDelegate(
          (_, i) => _workCard(_featured[i]),
          childCount: _featured.length,
        ),
      ),
    );
  }

  Widget _workCard(Map<String, dynamic> w) {
    final id = w['id'] as int;
    final cover = w['coverUrl']?.toString();
    final imgs = (w['imageUrls'] as List<dynamic>?) ?? const [];
    final url = (cover != null && cover.isNotEmpty)
        ? cover
        : (imgs.isNotEmpty ? imgs.first.toString() : null);
    final title = w['title']?.toString();
    final techName = w['technicianName']?.toString() ?? '';
    final techAvatar = w['technicianAvatarUrl']?.toString();
    final likeCount = w['likeCount'] as int? ?? 0;
    final liked = w['isLiked'] as bool? ?? false;
    final tags =
        (w['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
            const [];

    return GestureDetector(
      onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) => ClientWorkDetailScreen(workId: id))),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (url != null)
              CachedNetworkImage(
                  imageUrl: url,
                  fit: BoxFit.cover,
                  placeholder: (_, __) =>
                      Container(color: ET.surface),
                  errorWidget: (_, __, ___) =>
                      Container(color: ET.surface))
            else
              Container(color: ET.surface),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Color(0x12000000),
                    Color(0xC2000000)
                  ],
                  stops: [0.45, 0.65, 1.0],
                ),
              ),
            ),
            Positioned(
              left: 8,
              top: 8,
              child: GlassContainer(
                tint: Colors.black,
                opacity: 0.24,
                blur: DT.glassBlurLight,
                borderRadius: 999,
                padding: const EdgeInsets.fromLTRB(4, 4, 10, 4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(
                      radius: 9,
                      backgroundColor: Colors.white24,
                      backgroundImage:
                          (techAvatar != null && techAvatar.isNotEmpty)
                              ? CachedNetworkImageProvider(techAvatar)
                              : null,
                      child: (techAvatar == null || techAvatar.isEmpty)
                          ? Text(
                              techName.isNotEmpty
                                  ? techName.substring(0, 1)
                                  : '美',
                              style: const TextStyle(
                                  fontSize: 9, color: Colors.white))
                          : null,
                    ),
                    const SizedBox(width: 6),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 70),
                      child: Text(techName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                              color: Colors.white)),
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              left: 10,
              right: 10,
              bottom: 10,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(title?.isNotEmpty == true ? title! : '未命名作品',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.white)),
                  if (tags.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 5,
                      children: tags
                          .take(2)
                          .map((t) => Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.16),
                                    borderRadius: BorderRadius.circular(999)),
                                child: Text('#$t',
                                    style: TextStyle(
                                        fontSize: 9,
                                        color: Colors.white.withOpacity(0.92))),
                              ))
                          .toList(),
                    ),
                  ],
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(liked ? Icons.favorite : Icons.favorite_border,
                          size: 12, color: liked ? ET.like : Colors.white),
                      const SizedBox(width: 3),
                      Text('$likeCount',
                          style: const TextStyle(
                              fontSize: 11, color: Colors.white)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _footer() {
    if (_featured.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Center(
        child: _featLoading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: ET.accent))
            : Text(_featHasMore ? '' : '没有更多了',
                style: const TextStyle(fontSize: 12, color: ET.inkMuted)),
      ),
    );
  }

  // ── Shared ──────────────────────────────────────────────
  Widget _sectionHeader(String title, String subtitle, {VoidCallback? onMore}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: ET.displaySmall),
              const SizedBox(height: 2),
              Text(subtitle,
                  style: const TextStyle(fontSize: 12, color: ET.inkMuted)),
            ],
          ),
        ),
        if (onMore != null)
          GestureDetector(
            onTap: onMore,
            child: const Row(
              children: [
                Text('查看全部',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: ET.accentOnDark)),
                Icon(Icons.chevron_right_rounded,
                    size: 18, color: ET.accentOnDark),
              ],
            ),
          ),
      ],
    );
  }

  Widget _tintPill(String text, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration:
          BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(text,
          style:
              TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: fg)),
    );
  }

  void _openOrder(int id) {
    Navigator.push(
            context,
            MaterialPageRoute(
                builder: (_) => ClientOrderDetailScreen(orderId: id)))
        .then((_) => _loadUpcoming());
  }

  Future<void> _call(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  String _hm(String? iso) {
    final d = DateTime.tryParse(iso ?? '');
    if (d == null) return '--';
    return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }

  String _countdown(DateTime? target) {
    if (target == null) return '';
    final diff = target.difference(DateTime.now());
    if (diff.isNegative) return '已开始';
    final days = diff.inDays;
    final hours = diff.inHours % 24;
    final mins = diff.inMinutes % 60;
    if (days >= 1) return '倒计时 $days 天 $hours 小时';
    if (hours >= 1) return '倒计时 $hours 小时 $mins 分';
    return '倒计时 $mins 分钟';
  }
}
