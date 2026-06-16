import '../../../core/maps/map_service.dart';
import '../customers/technician_customer_service.dart';
import '../../shared/chat/chat_screen.dart';
import '../../shared/chat/chat_service.dart';
import 'technician_create_booking_sheet.dart';
import 'technician_order_detail_screen.dart';
import '../orders/technician_order_service.dart';
import '../widgets/technician_appointment_card.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';
import 'package:nailbook_mobile/core/widgets/technician_glass_header.dart';

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
    return topPad + 122;
  }

  Widget _topPanel() {
    final topPad = MediaQuery.of(context).padding.top;
    return GlassContainer(
      tint: TechnicianGlassHeader.glassTint,
      blur: TechnicianGlassHeader.glassBlur,
      opacity: TechnicianGlassHeader.glassOpacity,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.fromLTRB(DT.lg, topPad + DT.sm, DT.lg, DT.md),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            height: 44,
            child: Row(
              children: [
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    HapticFeedback.lightImpact();
                    Navigator.maybePop(context);
                  },
                  child: Container(
                    width: 44,
                    height: 44,
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
                    constraints: const BoxConstraints(minHeight: 36),
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: DT.cream,
                      borderRadius: BorderRadius.circular(999),
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
      height: 36,
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
          _filterChip('expired', '已过期'),
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
    final customerName = order['customerName']?.toString() ??
        (order['client'] as Map<String, dynamic>?)?['nickname']?.toString() ??
        (order['customer'] as Map<String, dynamic>?)?['name']?.toString() ??
        '客户';
    final customerPhone = order['customerPhone']?.toString();
    return TechnicianAppointmentCard(
      order: order,
      isTrip: false,
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
      onCall: () => _callCustomer(customerPhone),
      onMessage: () => _openChat(order, customerName),
      onNavigate: () => _navigateOrder(order),
    );
  }

  Future<void> _navigateOrder(Map<String, dynamic> order) async {
    final address = order['address']?.toString() ?? '';
    if (address.isEmpty) {
      NbToast.error(context, '当前预约还没有地址信息');
      return;
    }
    HapticFeedback.lightImpact();
    await MapService.launchAddressNavigation(address);
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
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: selected ? DT.cream : DT.surface,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: selected ? DT.cream : DT.border),
          ),
          child: Text(label,
              style: TextStyle(
                fontSize: 13,
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
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: DT.cream,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: DT.cream),
        ),
        child: const Text('未支付定金',
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: DT.onCream)),
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

}
