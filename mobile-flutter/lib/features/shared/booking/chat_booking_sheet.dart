import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/media/image_pick.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/theme/design_tokens.dart';
import '../../client/addresses/client_address_models.dart';
import '../../client/addresses/client_address_service.dart';
import '../../client/orders/client_order_service.dart';
import 'booking_availability.dart';
import 'chat_booking_service.dart';
import '../../../core/widgets/nb_toast.dart';

/// Shows the chat booking bottom sheet. Returns true if a booking was created.
Future<bool?> showChatBookingSheet(
  BuildContext context, {
  required int otherPartyId,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => ChatBookingSheet(otherPartyId: otherPartyId),
  );
}

class ChatBookingSheet extends StatefulWidget {
  final int otherPartyId;
  const ChatBookingSheet({super.key, required this.otherPartyId});

  @override
  State<ChatBookingSheet> createState() => _ChatBookingSheetState();
}

class _ChatBookingSheetState extends State<ChatBookingSheet> {
  bool _loading = true;
  bool _submitting = false;
  bool _uploadingImage = false;
  bool _isClientMode = true;

  Map<String, dynamic>? _techData;
  List<ClientAddress> _addresses = [];

  // Form state
  String _serviceType = '';
  int? _selectedAddressId;
  bool _showInlineAddressForm = false;
  final _nameCtl = TextEditingController();
  final _phoneCtl = TextEditingController();
  final _inlineAddrCtl = TextEditingController();
  String _techAddressText = '';   // technician mode: free text address
  String _serviceDate = '';
  String _startTime = '';
  List<Map<String, dynamic>> _blockedSlots = [];
  String _customDescription = '';
  List<String> _customImages = [];
  double? _price;
  bool _shareToClient = false;
  String? _confirmUrl;

  @override
  void initState() {
    super.initState();
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    _serviceDate =
        '${tomorrow.year}-${tomorrow.month.toString().padLeft(2, '0')}-${tomorrow.day.toString().padLeft(2, '0')}';
    _load();
  }

  @override
  void dispose() {
    _nameCtl.dispose();
    _phoneCtl.dispose();
    _inlineAddrCtl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final authSession = context.read<AuthSession>();
    _isClientMode = authSession.isClient;
    final api = context.read<ApiClient>();

    try {
      if (_isClientMode) {
        final svc = ChatBookingService(api);
        final tech = await svc.fetchTechnicianForClient(widget.otherPartyId);
        final addrs = await ClientAddressService(api).list();
        List<Map<String, dynamic>> blocked = [];
        try {
          blocked = await ClientOrderService(api)
              .getBlockedSlots(widget.otherPartyId)
              .timeout(const Duration(seconds: 10));
        } catch (_) {}
        if (mounted) {
          setState(() {
            _techData = tech;
            _addresses = addrs;
            _blockedSlots = blocked;
            _autoSelectServiceType();
            _autoSelectAddress();
            _ensureChatSelection();
            _loading = false;
          });
        }
      } else {
        if (mounted) setState(() { _ensureChatSelection(); _loading = false; });
      }
    } catch (_) {
      if (mounted) setState(() { _ensureChatSelection(); _loading = false; });
    }
  }

  // ── 预约时间联动 ──

  Map<String, dynamic>? get _chatSchedule => _techData?['serviceSchedule'] as Map<String, dynamic>?;
  bool get _chatShopMode => _serviceType == '到店美甲';
  Map<String, dynamic>? get _chatShopMap =>
      _chatShopMode && _shopAddresses.isNotEmpty ? _shopAddresses[0] : null;

  bool _chatDateAvailable(String ds) =>
      _chatShopMode ? isShopOpenOnDate(_chatShopMap, ds) : isDateAvailable(_chatSchedule, ds);

  List<SlotStatus> get _chatSlotStatuses => getSlotStatuses(
        dateStr: _serviceDate,
        range: _chatShopMode ? null : scheduleRange(_chatSchedule),
        blockedSlots: _blockedSlots,
        shopMode: _chatShopMode,
        shopHours: _chatShopMode ? shopHoursOptionForDate(_chatShopMap, _serviceDate) : null,
      );

  List<String> get _chatAvailableSlots =>
      _chatSlotStatuses.where((s) => !s.occupied).map((s) => s.time).toList();

  String _fmtDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  void _ensureChatSelection() {
    if (_serviceDate.isEmpty || !_chatDateAvailable(_serviceDate)) {
      final now = DateTime.now();
      final base = DateTime(now.year, now.month, now.day);
      for (int i = 0; i <= 60; i++) {
        final s = _fmtDate(base.add(Duration(days: i)));
        if (_chatDateAvailable(s)) { _serviceDate = s; break; }
      }
    }
    final avail = _chatAvailableSlots;
    if (_startTime.isEmpty || !avail.contains(_startTime)) {
      _startTime = avail.isNotEmpty ? avail.first : '';
    }
  }

  void _autoSelectServiceType() {
    final home = _techData?['homeService'] == true;
    final shop = _techData?['shopService'] == true;
    if (home && !shop) _serviceType = '上门美甲';
    if (shop && !home) _serviceType = '到店美甲';
  }

  void _autoSelectAddress() {
    if (_serviceType == '上门美甲' && _addresses.isNotEmpty) {
      final def = _addresses.firstWhere((a) => a.isDefault, orElse: () => _addresses[0]);
      _selectedAddressId = def.id;
    }
  }

  List<String> get _availableTypes {
    if (!_isClientMode) return ['上门美甲', '到店美甲'];
    final home = _techData?['homeService'] == true;
    final shop = _techData?['shopService'] == true;
    if (home && shop) return ['上门美甲', '到店美甲'];
    if (home) return ['上门美甲'];
    if (shop) return ['到店美甲'];
    return [];
  }

  /// 客户端：技师未开启任何服务类型（上门/到店都关）→ 无法发起预约。
  /// 与后端 client-orders 的就绪门控保持一致。
  bool get _techNotServing =>
      _isClientMode &&
      _techData != null &&
      _techData?['homeService'] != true &&
      _techData?['shopService'] != true;

  List<Map<String, dynamic>> get _shopAddresses {
    if (!_isClientMode) return [];
    return ((_techData?['shopAddresses'] as List<dynamic>?) ?? [])
        .cast<Map<String, dynamic>>()
        .where((s) => s['enabled'] != false)
        .toList();
  }

  bool get _canSubmit {
    if (_serviceType.isEmpty) return false;
    if (_startTime.isEmpty || !_chatAvailableSlots.contains(_startTime)) return false;
    if (_serviceType == '上门美甲') {
      if (_isClientMode) {
        if (_showInlineAddressForm) {
          return _nameCtl.text.trim().isNotEmpty &&
              _inlineAddrCtl.text.trim().isNotEmpty;
        }
        return _selectedAddressId != null;
      }
      return _techAddressText.trim().isNotEmpty;
    }
    if (_serviceType == '到店美甲' && _isClientMode) {
      return _shopAddresses.isNotEmpty;
    }
    if (!_isClientMode && _shareToClient) return _price != null;
    return true;
  }

  Future<void> _submit() async {
    if (!_canSubmit || _submitting) return;
    setState(() => _submitting = true);
    final api = context.read<ApiClient>();
    final svc = ChatBookingService(api);
    try {
      if (_isClientMode) {
        int? addrId;
        Map<String, dynamic>? shopAddr;
        if (_serviceType == '上门美甲') {
          if (_showInlineAddressForm) {
            final saved = await ClientAddressService(api).create({
              'contactName': _nameCtl.text.trim(),
              'contactPhone': _phoneCtl.text.trim(),
              'detailAddress': _inlineAddrCtl.text.trim(),
              'isDefault': _addresses.isEmpty,
            });
            addrId = saved.id;
          } else {
            addrId = _selectedAddressId;
          }
        } else if (_serviceType == '到店美甲' && _shopAddresses.isNotEmpty) {
          shopAddr = _shopAddresses[0];
        }
        await svc.createClientChatBooking(
          techId: widget.otherPartyId,
          serviceType: _serviceType,
          serviceDate: _serviceDate,
          startTime: _startTime,
          addressId: addrId,
          shopAddress: shopAddr,
          customDescription: _customDescription,
          customImages: _customImages,
        );
        if (mounted) {
          Navigator.pop(context, true);
          NbToast.show(context, '预约已提交');
        }
      } else {
        final result = await svc.createTechnicianChatBooking(
          clientUserId: widget.otherPartyId,
          serviceType: _serviceType,
          serviceDate: _serviceDate,
          startTimSlot: _startTime,
          address: _techAddressText.trim(),
          price: _price,
          shareToClient: _shareToClient,
          customDescription: _customDescription,
          customImages: _customImages,
        );
        if (_shareToClient && result['confirmUrl'] != null) {
          if (mounted) setState(() { _submitting = false; _confirmUrl = result['confirmUrl'] as String; });
          return;
        }
        if (mounted) {
          Navigator.pop(context, true);
          NbToast.show(context, '预约已创建');
        }
      }
    } catch (e) {
      if (mounted) {
        NbToast.show(context, '提交失败：$e');
      }
    } finally {
      if (mounted && _confirmUrl == null) setState(() => _submitting = false);
    }
  }

  Future<void> _pickImage() async {
    final file = await ImagePick.content();
    if (file == null || !mounted) return;
    setState(() => _uploadingImage = true);
    try {
      final api = context.read<ApiClient>();
      final resp = await api.uploadMultipart('/uploads/image', file.path, 'image');
      final body = await resp.stream.bytesToString();
      final json = jsonDecode(body) as Map<String, dynamic>;
      final url = json['url'] as String?;
      if (url != null && mounted) setState(() => _customImages = [..._customImages, url]);
    } catch (_) {
      if (mounted) NbToast.show(context, '图片上传失败');
    } finally {
      if (mounted) setState(() => _uploadingImage = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).padding.bottom;
    if (_confirmUrl != null) return _buildCopyLinkView(bottomPad);

    return Container(
      margin: EdgeInsets.only(top: MediaQuery.of(context).size.height * 0.2),
      decoration: const BoxDecoration(
        color: DT.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          _sheetTopBar(),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: DT.primary))
                : _techNotServing
                    ? _buildNotServingView()
                    : ListView(
                    padding: EdgeInsets.fromLTRB(20, 4, 20, bottomPad + 100),
                    children: [
                      const Text('📅 发起预约',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: DT.textPrimary)),
                      const SizedBox(height: 20),
                      ..._buildServiceTypeSection(),
                      ..._buildAddressSection(),
                      _label('预约日期'),
                      _buildDatePicker(),
                      const SizedBox(height: 16),
                      _label('预约时间'),
                      _buildTimeSlots(),
                      const SizedBox(height: 16),
                      if (!_isClientMode) ...[
                        _label('服务价格${_shareToClient ? "（必填）" : "（选填）"}'),
                        _buildPriceField(),
                        const SizedBox(height: 16),
                      ],
                      _label('服务说明（选填）'),
                      _buildNoteField(),
                      const SizedBox(height: 8),
                      _buildImageRow(),
                      if (!_isClientMode) ...[
                        const SizedBox(height: 16),
                        _buildShareToggle(),
                      ],
                    ],
                  ),
          ),
          if (!_techNotServing) _buildSubmitBar(bottomPad),
        ],
      ),
    );
  }

  Widget _buildNotServingView() {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.info_outline_rounded, size: 48, color: DT.textMuted),
            SizedBox(height: 16),
            Text('美甲师未开启美甲服务，请联系美甲师开启服务',
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 15, height: 1.5, color: DT.textSecondary)),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildServiceTypeSection() {
    if (_availableTypes.length <= 1) {
      if (_availableTypes.isEmpty) return [];
      return [
        Row(children: [
          _label('服务方式'),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: DT.primarySoft, borderRadius: BorderRadius.circular(999)),
            child: Text(_availableTypes[0],
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: DT.primary)),
          ),
        ]),
        const SizedBox(height: 16),
      ];
    }
    return [
      _label('服务方式'),
      Row(
        children: _availableTypes.map((type) {
          final sel = _serviceType == type;
          return Expanded(
            child: GestureDetector(
              onTap: () => setState(() {
                _serviceType = type;
                _selectedAddressId = null;
                _showInlineAddressForm = false;
                _autoSelectAddress();
                _ensureChatSelection();
              }),
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: sel ? DT.cream : const Color(0xFF211C17),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: sel ? DT.cream : Colors.white.withValues(alpha: 0.06)),
                ),
                alignment: Alignment.center,
                child: Text(type,
                    style: TextStyle(fontSize: 14, fontWeight: sel ? FontWeight.w600 : FontWeight.w500,
                        color: sel ? DT.onCream : DT.textSecondary)),
              ),
            ),
          );
        }).toList(),
      ),
      const SizedBox(height: 16),
    ];
  }

  List<Widget> _buildAddressSection() {
    if (_serviceType != '上门美甲') {
      if (_serviceType == '到店美甲' && _isClientMode && _shopAddresses.isNotEmpty) {
        final shop = _shopAddresses[0];
        final addr = [shop['province'], shop['city'], shop['district'], shop['detailAddress']]
            .where((s) => s != null).join(' ');
        return [
          _label('门店地址'),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: const Color(0xFF211C17), borderRadius: BorderRadius.circular(12)),
            child: Row(children: [
              const Icon(Icons.store_rounded, color: DT.primary, size: 16),
              const SizedBox(width: 8),
              Expanded(child: Text(addr.isNotEmpty ? addr : shop['name']?.toString() ?? '',
                  style: const TextStyle(fontSize: 13, color: DT.textPrimary))),
            ]),
          ),
          const SizedBox(height: 16),
        ];
      }
      return [];
    }
    final widgets = <Widget>[_label(_isClientMode ? '上门地址' : '客户地址')];
    if (_isClientMode) {
      widgets.add(_buildClientAddressWidget());
    } else {
      widgets.add(TextField(
        maxLines: 2,
        onChanged: (v) => setState(() => _techAddressText = v),
        decoration: InputDecoration(
          hintText: '输入客户上门地址...',
          filled: true, fillColor: const Color(0xFF211C17),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        ),
      ));
    }
    widgets.add(const SizedBox(height: 16));
    return widgets;
  }

  Widget _buildClientAddressWidget() {
    if (_showInlineAddressForm) {
      return Column(children: [
        _textField(_nameCtl, '姓名'),
        const SizedBox(height: 8),
        _textField(_phoneCtl, '手机号', type: TextInputType.phone),
        const SizedBox(height: 8),
        _textField(_inlineAddrCtl, '详细地址', maxLines: 2),
      ]);
    }
    if (_addresses.isEmpty) {
      return GestureDetector(
        onTap: () => setState(() => _showInlineAddressForm = true),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF211C17), borderRadius: BorderRadius.circular(12),
            border: Border.all(color: DT.primary.withValues(alpha: 0.2)),
          ),
          child: const Row(children: [
            Icon(Icons.add_location_alt_rounded, color: DT.primary, size: 18),
            SizedBox(width: 8),
            Text('添加上门地址', style: TextStyle(color: DT.primary, fontSize: 14, fontWeight: FontWeight.w500)),
          ]),
        ),
      );
    }
    if (_addresses.length > 1) {
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
          decoration: BoxDecoration(color: const Color(0xFF211C17), borderRadius: BorderRadius.circular(12)),
          child: DropdownButton<int>(
            value: _selectedAddressId,
            isExpanded: true, underline: const SizedBox(),
            items: _addresses.map((a) => DropdownMenuItem(
              value: a.id,
              child: Text(a.fullAddress, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13)),
            )).toList(),
            onChanged: (v) => setState(() => _selectedAddressId = v),
          ),
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () => setState(() { _showInlineAddressForm = true; _selectedAddressId = null; }),
          child: const Row(children: [
            Icon(Icons.add_circle_outline, color: DT.primary, size: 16),
            SizedBox(width: 4),
            Text('+ 新增地址', style: TextStyle(fontSize: 13, color: DT.primary)),
          ]),
        ),
      ]);
    }
    // Single address
    final addr = _addresses[0];
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: const Color(0xFF211C17), borderRadius: BorderRadius.circular(12)),
      child: Row(children: [
        const Icon(Icons.location_on_rounded, color: DT.primary, size: 16),
        const SizedBox(width: 8),
        Expanded(child: Text(addr.fullAddress, style: const TextStyle(fontSize: 13, color: DT.textPrimary))),
        GestureDetector(
          onTap: () => setState(() { _showInlineAddressForm = true; _selectedAddressId = null; }),
          child: const Text('更换', style: TextStyle(fontSize: 12, color: DT.primary)),
        ),
      ]),
    );
  }

  Widget _buildDatePicker() {
    final now = DateTime.now();
    final base = DateTime(now.year, now.month, now.day);
    const wk = ['一', '二', '三', '四', '五', '六', '日'];
    return SizedBox(
      height: 58,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: 45,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final d = base.add(Duration(days: i));
          final ds = _fmtDate(d);
          final enabled = _chatDateAvailable(ds);
          final selected = _serviceDate == ds;
          final label = i == 0 ? '今天' : i == 1 ? '明天' : '周${wk[d.weekday - 1]}';
          return GestureDetector(
            onTap: enabled
                ? () => setState(() {
                      _serviceDate = ds;
                      final avail = _chatAvailableSlots;
                      if (_startTime.isEmpty || !avail.contains(_startTime)) {
                        _startTime = avail.isNotEmpty ? avail.first : '';
                      }
                    })
                : null,
            child: Container(
              width: 56,
              decoration: BoxDecoration(
                color: selected ? DT.cream : const Color(0xFF211C17),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: selected ? DT.cream : Colors.white.withValues(alpha: 0.06)),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(label, style: TextStyle(fontSize: 11, color: selected ? DT.onCream.withValues(alpha: 0.7) : (enabled ? DT.textMuted : DT.textTertiary.withValues(alpha: 0.5)))),
                  const SizedBox(height: 3),
                  Text('${d.month}/${d.day}', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: selected ? DT.onCream : (enabled ? DT.textPrimary : DT.textTertiary.withValues(alpha: 0.45)))),
                  if (!enabled) ...[
                    const SizedBox(height: 2),
                    Text('休', style: TextStyle(fontSize: 9, height: 1, color: DT.textTertiary.withValues(alpha: 0.7))),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTimeSlots() {
    final statuses = _chatSlotStatuses;
    if (statuses.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 14),
        decoration: BoxDecoration(color: const Color(0xFF211C17), borderRadius: BorderRadius.circular(12)),
        child: Text(_chatShopMode ? '所选日期店铺休息，请改选日期' : '该美甲师当天暂无可预约时段，请改选日期',
            style: const TextStyle(fontSize: 13, color: DT.textMuted)),
      );
    }
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 4, crossAxisSpacing: 8, mainAxisSpacing: 8, childAspectRatio: 1.7),
      itemCount: statuses.length,
      itemBuilder: (_, i) {
        final s = statuses[i];
        final sel = _startTime == s.time && !s.occupied;
        return GestureDetector(
          onTap: s.occupied ? null : () => setState(() => _startTime = s.time),
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: sel ? DT.cream : (s.occupied ? const Color(0xFF2A241E) : const Color(0xFF211C17)),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(s.time, style: TextStyle(
                    fontSize: 13,
                    fontWeight: sel ? FontWeight.w600 : FontWeight.w400,
                    color: sel ? DT.onCream : (s.occupied ? DT.textTertiary : DT.textSecondary),
                    decoration: s.occupied ? TextDecoration.lineThrough : null)),
                if (s.occupied)
                  const Text('已约', style: TextStyle(fontSize: 9, height: 1.2, color: DT.textTertiary)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPriceField() {
    return TextField(
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      onChanged: (v) => setState(() => _price = double.tryParse(v)),
      decoration: InputDecoration(
        hintText: '输入服务价格',
        prefixText: '¥ ',
        filled: true, fillColor: const Color(0xFF211C17),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: DT.primary, width: 1.5)),
      ),
    );
  }

  Widget _buildNoteField() {
    return TextField(
      maxLines: 3,
      onChanged: (v) => _customDescription = v,
      decoration: InputDecoration(
        hintText: '简短描述美甲需求，或上传参考图片...',
        filled: true, fillColor: const Color(0xFF211C17),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: DT.primary, width: 1.5)),
      ),
    );
  }

  Widget _buildImageRow() {
    return Wrap(
      spacing: 8, runSpacing: 8,
      children: [
        ..._customImages.asMap().entries.map((e) => Stack(children: [
          ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(e.value, width: 64, height: 64, fit: BoxFit.cover)),
          Positioned(
            top: 2, right: 2,
            child: GestureDetector(
              onTap: () => setState(() {
                final l = List<String>.from(_customImages);
                l.removeAt(e.key);
                _customImages = l;
              }),
              child: Container(
                width: 18, height: 18,
                decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle),
                child: const Icon(Icons.close, color: Colors.white, size: 10),
              ),
            ),
          ),
        ])),
        if (_customImages.length < 3)
          GestureDetector(
            onTap: _uploadingImage ? null : _pickImage,
            child: Container(
              width: 64, height: 64,
              decoration: BoxDecoration(
                  border: Border.all(color: DT.border),
                  borderRadius: BorderRadius.circular(8)),
              child: _uploadingImage
                  ? const Center(child: CircularProgressIndicator(strokeWidth: 2, color: DT.primary))
                  : const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.add_photo_alternate_outlined, color: DT.textTertiary, size: 20),
                Text('添加', style: TextStyle(fontSize: 10, color: DT.textTertiary)),
              ]),
            ),
          ),
      ],
    );
  }

  Widget _buildShareToggle() {
    return GestureDetector(
      onTap: () => setState(() => _shareToClient = !_shareToClient),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _shareToClient ? DT.primarySoft : const Color(0xFF211C17),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: _shareToClient ? DT.primary.withValues(alpha: 0.3) : Colors.black.withValues(alpha: 0.06)),
        ),
        child: Row(children: [
          Icon(_shareToClient ? Icons.check_circle_rounded : Icons.circle_outlined,
              color: _shareToClient ? DT.primary : DT.textTertiary, size: 20),
          const SizedBox(width: 10),
          const Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('生成微信确认链接', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textPrimary)),
              Text('创建后生成链接，发给客户在微信中确认预约',
                  style: TextStyle(fontSize: 12, color: DT.textMuted)),
            ]),
          ),
        ]),
      ),
    );
  }

  Widget _buildSubmitBar(double bottomPad) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, bottomPad + 12),
      decoration: BoxDecoration(
        color: DT.surface,
        border: Border(top: BorderSide(color: Colors.black.withValues(alpha: 0.06))),
      ),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: (_canSubmit && !_submitting) ? _submit : null,
          child: _submitting
              ? const SizedBox(height: 20, width: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(_shareToClient ? '生成确认链接' : '发起预约'),
        ),
      ),
    );
  }

  Widget _buildCopyLinkView(double bottomPad) {
    return Container(
      margin: EdgeInsets.only(top: MediaQuery.of(context).size.height * 0.4),
      decoration: const BoxDecoration(
          color: DT.surface, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      padding: EdgeInsets.fromLTRB(24, 24, 24, bottomPad + 24),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        _handle(),
        const Icon(Icons.check_circle_rounded, color: DT.primary, size: 48),
        const SizedBox(height: 12),
        const Text('预约已创建', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: DT.textPrimary)),
        const SizedBox(height: 6),
        const Text('复制下面的链接，在微信发给客户确认预约',
            style: TextStyle(fontSize: 14, color: DT.textMuted), textAlign: TextAlign.center),
        const SizedBox(height: 20),
        GestureDetector(
          onTap: () {
            Clipboard.setData(ClipboardData(text: _confirmUrl!));
            NbToast.show(context, '链接已复制');
          },
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
                color: const Color(0xFF211C17), borderRadius: BorderRadius.circular(12),
                border: Border.all(color: DT.primary.withValues(alpha: 0.2))),
            child: Row(children: [
              Expanded(
                  child: Text(_confirmUrl!,
                      style: const TextStyle(fontSize: 12, color: DT.primary),
                      maxLines: 2, overflow: TextOverflow.ellipsis)),
              const SizedBox(width: 8),
              const Icon(Icons.copy_rounded, size: 18, color: DT.primary),
            ]),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('完成')),
        ),
      ]),
    );
  }

  Widget _handle() => Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Container(
        width: 40, height: 4,
        decoration: BoxDecoration(color: const Color(0xFF3A2F23), borderRadius: BorderRadius.circular(999))),
  );

  /// 顶部条：居中拖拽手柄 + 右上角关闭按钮（整行铺满宽度）。
  Widget _sheetTopBar() => Padding(
    padding: const EdgeInsets.fromLTRB(12, 10, 12, 2),
    child: Row(
      children: [
        const SizedBox(width: 30), // 与右侧关闭按钮对称，保证手柄真正居中
        Expanded(child: Center(child: _handle())),
        GestureDetector(
          onTap: () => Navigator.of(context).maybePop(),
          behavior: HitTestBehavior.opaque,
          child: Container(
            width: 30, height: 30,
            alignment: Alignment.center,
            decoration: const BoxDecoration(color: DT.surfaceAlt, shape: BoxShape.circle),
            child: const Icon(Icons.close_rounded, size: 18, color: DT.textSecondary),
          ),
        ),
      ],
    ),
  );

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(text,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: DT.textPrimary)),
  );

  Widget _textField(TextEditingController ctl, String hint,
      {TextInputType? type, int maxLines = 1}) {
    return TextField(
      controller: ctl,
      maxLines: maxLines,
      keyboardType: type,
      onChanged: (_) => setState(() {}),
      decoration: InputDecoration(
        hintText: hint,
        filled: true, fillColor: const Color(0xFF211C17),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: DT.primary, width: 1.5)),
      ),
    );
  }
}
