import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/maps/map_service.dart';
import '../customers/technician_customer_service.dart';
import '../../shared/chat/chat_screen.dart';
import '../../shared/chat/chat_service.dart';
import 'technician_create_booking_sheet.dart';
import 'technician_order_detail_screen.dart';
import '../orders/technician_order_service.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

class TechnicianOrdersScreen extends StatefulWidget {
  /// 初始状态过滤（如 'pending_confirm'）。
  final String? initialStatusFilter;

  /// 初始客户过滤，用于从客户详情页查看该客户预约。
  final int? initialCustomerId;
  final String? initialCustomerName;
  final bool initialActiveOnly;

  /// true 时仅展示未付定金的进行中预约（用于「未支付定金」入口）。
  final bool initialUnpaidDepositOnly;
  const TechnicianOrdersScreen({
    super.key,
    this.initialStatusFilter,
    this.initialCustomerId,
    this.initialCustomerName,
    this.initialActiveOnly = false,
    this.initialUnpaidDepositOnly = false,
  });

  @override
  State<TechnicianOrdersScreen> createState() => _TechnicianOrdersScreenState();
}

class _TechnicianOrdersScreenState extends State<TechnicianOrdersScreen> {
  List<Map<String, dynamic>> _orders = [];
  List<Map<String, dynamic>> _customers = [];
  bool _loading = true;
  String? _statusFilter;
  late bool _unpaidDepositOnly = widget.initialUnpaidDepositOnly;

  static const _activeStatuses = {
    'pending_quote',
    'pending_agree',
    'pending_confirm',
    'pending_home',
    'pending_shop',
    'in_progress'
  };

  @override
  void initState() {
    super.initState();
    _statusFilter = widget.initialStatusFilter;
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    try {
      final apiClient = context.read<ApiClient>();
      final service = TechnicianOrderService(apiClient);
      final results = await Future.wait([
        service.list(
            status: _statusFilter, customerId: widget.initialCustomerId),
        TechnicianCustomerService(apiClient).list(),
      ]);
      var orders = (results[0] as List).cast<Map<String, dynamic>>();
      if (_unpaidDepositOnly) {
        orders = orders
            .where((o) =>
                _activeStatuses.contains(o['status']) &&
                !((o['depositPaid'] ?? o['isDepositPaid']) as bool? ?? false))
            .toList();
      }
      if (widget.initialActiveOnly) {
        orders =
            orders.where((o) => _activeStatuses.contains(o['status'])).toList();
      }
      if (mounted) {
        setState(() {
          _orders = orders;
          _customers = (results[1] as List).cast<Map<String, dynamic>>();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final topPanelH = _topPanelHeight(context);
    return Scaffold(
      backgroundColor: DT.bg,
      body: Stack(
        children: [
          Positioned.fill(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: DT.primary))
                : _orders.isEmpty
                    ? _emptyList(topPanelH)
                    : RefreshIndicator(
                        color: DT.primary,
                        onRefresh: _loadOrders,
                        child: ListView.separated(
                          padding: EdgeInsets.fromLTRB(
                              DT.lg, topPanelH + DT.md, DT.lg, 100),
                          itemCount: _orders.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: DT.sm + 2),
                          itemBuilder: (context, index) =>
                              _bookingCard(_orders[index]),
                        ),
                      ),
          ),
          Positioned(left: 0, right: 0, top: 0, child: _topPanel()),
        ],
      ),
    );
  }

  double _topPanelHeight(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return topPad + 116;
  }

  Widget _topPanel() {
    final topPad = MediaQuery.of(context).padding.top;
    return GlassContainer(
      tint: ET.glassTint,
      blur: ET.glassBlur,
      opacity: ET.glassOpacity,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.fromLTRB(DT.lg, topPad + DT.sm, DT.lg, DT.md),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            height: 40,
            child: Row(
              children: [
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    HapticFeedback.lightImpact();
                    Navigator.maybePop(context);
                  },
                  child: Container(
                    width: 36,
                    height: 36,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(CupertinoIcons.back,
                        size: 17, color: DT.textPrimary),
                  ),
                ),
                const SizedBox(width: DT.md),
                Expanded(child: Text(_title, style: DT.titleMedium)),
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: _showCreateBookingSheet,
                  child: Container(
                    height: 36,
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(horizontal: DT.md),
                    decoration: BoxDecoration(
                      color: DT.cream,
                      borderRadius: BorderRadius.circular(DT.rFull),
                    ),
                    child: Text('新建预约',
                        style: DT.captionLarge.copyWith(
                            color: DT.onCream, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: DT.md),
          _filterStrip(),
        ],
      ),
    );
  }

  Widget _filterStrip() {
    return SizedBox(
      height: 38,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.zero,
        children: [
          if (_unpaidDepositOnly) _depositChip(),
          _filterChip(null, '全部'),
          _filterChip('pending_quote', '待报价'),
          _filterChip('pending_agree', '待用户确认'),
          _filterChip('pending_confirm', '待我确认'),
          _filterChip('pending_home', '待上门'),
          _filterChip('pending_shop', '待到店'),
          _filterChip('in_progress', '进行中'),
          _filterChip('completed', '已完成'),
          _filterChip('cancelled', '已取消'),
        ],
      ),
    );
  }

  void _showCreateBookingSheet() {
    HapticFeedback.lightImpact();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => TechnicianCreateBookingSheet(
        customers: _customers,
        presetCustomerId: widget.initialCustomerId,
        onCreated: (_) => _loadOrders(),
      ),
    );
  }

  String get _title {
    if (_unpaidDepositOnly) return '未支付定金';
    final name = widget.initialCustomerName;
    if (name != null && name.isNotEmpty) {
      return widget.initialActiveOnly ? '$name 的预约' : '$name 的历史预约';
    }
    return '预约管理';
  }

  Widget _emptyList(double topPanelH) {
    return ListView(
      padding: EdgeInsets.fromLTRB(DT.lg, topPanelH + 80, DT.lg, 100),
      children: [
        Center(
          child: Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: DT.surfaceAlt,
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Icon(CupertinoIcons.calendar,
                size: 32, color: DT.textTertiary),
          ),
        ),
        const SizedBox(height: 14),
        const Center(
            child: Text('暂无预约',
                style: TextStyle(fontSize: 14, color: DT.textMuted))),
      ],
    );
  }

  Widget _bookingCard(Map<String, dynamic> order) {
    final status = order['status']?.toString() ?? '';
    final startTime = order['startTime']?.toString() ?? '';
    final serviceType = order['serviceType']?.toString() ?? '';
    final serviceName = order['serviceName']?.toString() ??
        order['customTitle']?.toString() ??
        '预约服务';
    final address = order['address']?.toString() ?? '';
    final customerName = order['customerName']?.toString() ??
        (order['client'] as Map<String, dynamic>?)?['nickname']?.toString() ??
        (order['customer'] as Map<String, dynamic>?)?['name']?.toString() ??
        '客户';
    final customerPhone = order['customerPhone']?.toString();
    final customerAvatar = _customerAvatarUrl(order);

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) =>
                TechnicianOrderDetailScreen(orderId: order['id'] as int),
          ),
        ).then((_) => _loadOrders());
      },
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: DT.surface.withValues(alpha: 0.78),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                SizedBox(
                  width: 68,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(_fmtClock(startTime),
                            maxLines: 1,
                            softWrap: false,
                            style: const TextStyle(
                                fontSize: 19,
                                fontWeight: FontWeight.w700,
                                color: DT.textPrimary,
                                letterSpacing: -0.3)),
                      ),
                      const SizedBox(height: 3),
                      Text(_dateWeekLabel(startTime),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 10.5, color: DT.textTertiary)),
                    ],
                  ),
                ),
                const SizedBox(width: 4),
                _avatar(customerName, customerAvatar),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(customerName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: DT.textPrimary)),
                      const SizedBox(height: 2),
                      Text('${_serviceTypeLabel(serviceType)} · $serviceName',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 12, color: DT.textTertiary)),
                      const SizedBox(height: 5),
                      _statusMeta(status),
                    ],
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _iconEntry(CupertinoIcons.phone_fill,
                        onTap: () => _callCustomer(customerPhone)),
                    const SizedBox(width: 8),
                    _iconEntry(CupertinoIcons.chat_bubble_fill,
                        onTap: () => _openChat(order, customerName)),
                  ],
                ),
              ],
            ),
            if (address.isNotEmpty) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(CupertinoIcons.location_solid,
                      size: 13, color: DT.textTertiary),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(address,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 12, color: DT.textTertiary)),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _statusMeta(String status) {
    final sc = _statusColors(status);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(
            color: sc.$2.withValues(alpha: 0.78),
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 5),
        Text(_statusLabel(status),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: sc.$2.withValues(alpha: 0.86))),
      ],
    );
  }

  Widget _iconEntry(IconData icon, {required VoidCallback onTap}) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: DT.surfaceAlt.withValues(alpha: 0.86),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 17, color: DT.textPrimary),
      ),
    );
  }

  Future<void> _callCustomer(String? phone) async {
    if (phone == null || phone.trim().isEmpty) {
      NbToast.error(context, '当前客户暂无联系电话');
      return;
    }
    HapticFeedback.lightImpact();
    final ok = await MapService.launchPhoneCall(phone);
    if (!ok && mounted) NbToast.error(context, '无法发起电话');
  }

  Future<void> _openChat(Map<String, dynamic> order, String name) async {
    final clientUserId = _clientUserId(order);
    if (clientUserId == null) {
      NbToast.error(context, '该客户尚未注册客户端，暂不支持在线消息');
      return;
    }
    HapticFeedback.lightImpact();
    final api = context.read<ApiClient>();
    int? convId;
    try {
      final convs = await ChatService(api).conversations();
      for (final conv in convs) {
        if ((conv['client'] as Map<String, dynamic>?)?['id'] == clientUserId) {
          convId = conv['id'] as int?;
          break;
        }
      }
    } catch (_) {}
    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatScreen(
          conversationId: convId,
          title: name,
          otherPartyId: clientUserId,
          clientId: clientUserId,
        ),
      ),
    );
  }

  Widget _filterChip(String? value, String label) {
    final selected = _statusFilter == value && !_unpaidDepositOnly;
    return Padding(
      padding: const EdgeInsets.only(right: DT.sm),
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          setState(() {
            _statusFilter = value;
            _unpaidDepositOnly = false;
            _loading = true;
          });
          _loadOrders();
        },
        child: Container(
          alignment: Alignment.center,
          height: 36,
          padding: const EdgeInsets.symmetric(horizontal: DT.md),
          decoration: BoxDecoration(
            color: selected ? DT.cream : DT.surface.withValues(alpha: 0.72),
            borderRadius: BorderRadius.circular(DT.rFull),
          ),
          child: Text(label,
              style: TextStyle(
                fontSize: DT.textSm,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                color: selected ? DT.onCream : DT.textSecondary,
              )),
        ),
      ),
    );
  }

  Widget _depositChip() {
    return Padding(
      padding: const EdgeInsets.only(right: DT.sm),
      child: Container(
        alignment: Alignment.center,
        height: 36,
        padding: const EdgeInsets.symmetric(horizontal: DT.md),
        decoration: BoxDecoration(
          color: DT.cream,
          borderRadius: BorderRadius.circular(DT.rFull),
        ),
        child: const Text('未支付定金',
            style: TextStyle(
                fontSize: DT.textSm,
                fontWeight: FontWeight.w600,
                color: DT.onCream)),
      ),
    );
  }

  Widget _avatar(String name, String? url) {
    if (url != null && url.isNotEmpty) {
      return ClipOval(
        child: CachedNetworkImage(
          imageUrl: url,
          width: 36,
          height: 36,
          fit: BoxFit.cover,
          errorWidget: (_, __, ___) => _avatarFallback(name),
        ),
      );
    }
    return _avatarFallback(name);
  }

  Widget _avatarFallback(String name) {
    return Container(
      width: 36,
      height: 36,
      alignment: Alignment.center,
      decoration:
          const BoxDecoration(color: DT.primarySoft, shape: BoxShape.circle),
      child: Text(name.isNotEmpty ? name.substring(0, 1) : '?',
          style:
              const TextStyle(color: DT.primary, fontWeight: FontWeight.w600)),
    );
  }

  String _fmtClock(String s) {
    final d = DateTime.tryParse(s);
    if (d == null) return s;
    final l = d.toLocal();
    return '${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
  }

  String _dateWeekLabel(String s) {
    final d = DateTime.tryParse(s);
    if (d == null) return '';
    final l = d.toLocal();
    const week = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return '${l.month}/${l.day} ${week[l.weekday - 1]}';
  }

  int? _clientUserId(Map<String, dynamic> order) {
    final client = order['client'] as Map<String, dynamic>?;
    final customer = order['customer'] as Map<String, dynamic>?;
    final clientUser = order['clientUser'] as Map<String, dynamic>?;
    final customerClientUser = customer?['clientUser'] as Map<String, dynamic>?;
    return _int(order['clientUserId']) ??
        _int(clientUser?['id']) ??
        _int(client?['id']) ??
        _int(customer?['clientUserId']) ??
        _int(customerClientUser?['id']);
  }

  int? _int(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }

  String? _customerAvatarUrl(Map<String, dynamic> order) {
    final client = order['client'] as Map<String, dynamic>?;
    final customer = order['customer'] as Map<String, dynamic>?;
    final clientUser = order['clientUser'] as Map<String, dynamic>?;
    final customerClient = customer?['client'] as Map<String, dynamic>?;
    final customerClientUser = customer?['clientUser'] as Map<String, dynamic>?;
    return _str(order['avatarUrl']) ??
        _str(order['customerAvatar']) ??
        _str(order['clientAvatar']) ??
        _str(clientUser?['avatarUrl']) ??
        _str(client?['avatarUrl']) ??
        _str(client?['avatar']) ??
        _str(customer?['avatarUrl']) ??
        _str(customer?['customerAvatar']) ??
        _str(customerClient?['avatarUrl']) ??
        _str(customerClientUser?['avatarUrl']);
  }

  String? _str(dynamic value) {
    final s = value?.toString().trim();
    if (s == null || s.isEmpty || s == 'null') return null;
    return s;
  }

  String _serviceTypeLabel(String s) {
    if (s == 'home' || s == '上门美甲') return '上门美甲';
    if (s == 'shop' || s == '到店美甲') return '到店美甲';
    return s.isEmpty ? '预约服务' : s;
  }

  String _statusLabel(String s) {
    switch (s) {
      case 'pending_quote':
        return '待报价';
      case 'pending_agree':
        return '待确认';
      case 'pending_confirm':
        return '待接单';
      case 'pending_home':
        return '待上门';
      case 'pending_shop':
        return '待到店';
      case 'in_progress':
        return '服务中';
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      default:
        return s;
    }
  }

  (Color, Color) _statusColors(String s) {
    switch (s) {
      case 'pending_quote':
        return (const Color(0xFFFFF6EB), const Color(0xFFB87425));
      case 'pending_agree':
        return (const Color(0xFFFFF4DF), const Color(0xFFC8892F));
      case 'pending_confirm':
        return (const Color(0xFFFFF6EB), const Color(0xFFB87425));
      case 'pending_home':
        return (const Color(0xFFE8F5E9), const Color(0xFF2E7D32));
      case 'pending_shop':
        return (const Color(0xFFE3F2FD), const Color(0xFF1565C0));
      case 'in_progress':
        return (const Color(0xFF3A2F23), DT.primary);
      case 'completed':
        return (const Color(0xFFEDF8F1), const Color(0xFF3B9460));
      default:
        return (const Color(0xFFF4F4F5), const Color(0xFF8F8F95));
    }
  }
}
