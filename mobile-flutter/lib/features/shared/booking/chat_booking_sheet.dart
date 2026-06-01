import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/theme/design_tokens.dart';
import '../../client/addresses/client_address_models.dart';
import '../../client/addresses/client_address_service.dart';
import 'chat_booking_service.dart';

const _kTimeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30',
];

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
  String _startTime = '14:00';
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
        if (mounted) {
          setState(() {
            _techData = tech;
            _addresses = addrs;
            _autoSelectServiceType();
            _autoSelectAddress();
            _loading = false;
          });
        }
      } else {
        if (mounted) setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
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

  List<Map<String, dynamic>> get _shopAddresses {
    if (!_isClientMode) return [];
    return ((_techData?['shopAddresses'] as List<dynamic>?) ?? [])
        .cast<Map<String, dynamic>>()
        .where((s) => s['enabled'] != false)
        .toList();
  }

  bool get _canSubmit {
    if (_serviceType.isEmpty) return false;
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
          ScaffoldMessenger.of(context)
              .showSnackBar(const SnackBar(content: Text('预约已提交')));
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
          ScaffoldMessenger.of(context)
              .showSnackBar(const SnackBar(content: Text('预约已创建')));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('提交失败：$e')));
      }
    } finally {
      if (mounted && _confirmUrl == null) setState(() => _submitting = false);
    }
  }

  Future<void> _pickImage() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (file == null) return;
    setState(() => _uploadingImage = true);
    try {
      final api = context.read<ApiClient>();
      final resp = await api.uploadMultipart('/uploads/image', file.path, 'image');
      final body = await resp.stream.bytesToString();
      final json = jsonDecode(body) as Map<String, dynamic>;
      final url = json['url'] as String?;
      if (url != null && mounted) setState(() => _customImages = [..._customImages, url]);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('图片上传失败')));
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
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          _handle(),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: DT.primary))
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
          _buildSubmitBar(bottomPad),
        ],
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
              }),
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: sel ? DT.primarySoft : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: sel ? DT.primary.withOpacity(0.3) : Colors.black.withOpacity(0.06)),
                ),
                alignment: Alignment.center,
                child: Text(type,
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500,
                        color: sel ? DT.primary : DT.textSecondary)),
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
            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
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
          filled: true, fillColor: const Color(0xFFF8FAFC),
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
            color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12),
            border: Border.all(color: DT.primary.withOpacity(0.2)),
          ),
          child: Row(children: const [
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
          decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
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
          child: Row(children: const [
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
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
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
    return GestureDetector(
      onTap: () async {
        final now = DateTime.now();
        final picked = await showDatePicker(
          context: context,
          initialDate: now.add(const Duration(days: 1)),
          firstDate: now,
          lastDate: now.add(const Duration(days: 60)),
        );
        if (picked != null && mounted) {
          setState(() {
            _serviceDate =
                '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
          });
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          const Icon(Icons.calendar_today_rounded, size: 16, color: DT.primary),
          const SizedBox(width: 8),
          Text(_serviceDate, style: const TextStyle(fontSize: 14, color: DT.textPrimary)),
          const Spacer(),
          Icon(Icons.chevron_right_rounded, size: 18, color: Colors.grey.shade400),
        ]),
      ),
    );
  }

  Widget _buildTimeSlots() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 4, crossAxisSpacing: 8, mainAxisSpacing: 8, childAspectRatio: 2),
      itemCount: _kTimeSlots.length,
      itemBuilder: (_, i) {
        final t = _kTimeSlots[i];
        final sel = _startTime == t;
        return GestureDetector(
          onTap: () => setState(() => _startTime = t),
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: sel ? DT.primaryGradient : null,
              color: sel ? null : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(t,
                style: TextStyle(fontSize: 13,
                    fontWeight: sel ? FontWeight.w600 : FontWeight.w400,
                    color: sel ? Colors.white : const Color(0xFF64748B))),
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
        filled: true, fillColor: const Color(0xFFF8FAFC),
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
        filled: true, fillColor: const Color(0xFFF8FAFC),
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
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8)),
              child: _uploadingImage
                  ? const Center(child: CircularProgressIndicator(strokeWidth: 2, color: DT.primary))
                  : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.add_photo_alternate_outlined, color: Colors.grey.shade400, size: 20),
                Text('添加', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
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
          color: _shareToClient ? DT.primarySoft : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: _shareToClient ? DT.primary.withOpacity(0.3) : Colors.black.withOpacity(0.06)),
        ),
        child: Row(children: [
          Icon(_shareToClient ? Icons.check_circle_rounded : Icons.circle_outlined,
              color: _shareToClient ? DT.primary : Colors.grey.shade400, size: 20),
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
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.black.withOpacity(0.06))),
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
          color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
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
            ScaffoldMessenger.of(context)
                .showSnackBar(const SnackBar(content: Text('链接已复制')));
          },
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12),
                border: Border.all(color: DT.primary.withOpacity(0.2))),
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
        decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(999))),
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
        filled: true, fillColor: const Color(0xFFF8FAFC),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: DT.primary, width: 1.5)),
      ),
    );
  }
}
