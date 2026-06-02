import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/client_auth_models.dart';
import '../auth/client_auth_service.dart';
import '../addresses/client_address_models.dart';
import '../addresses/client_address_service.dart';
import 'client_order_service.dart';

const _timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30',
];

class ClientCreateOrderScreen extends StatefulWidget {
  final int? preselectedTechId;
  const ClientCreateOrderScreen({super.key, this.preselectedTechId});

  @override
  State<ClientCreateOrderScreen> createState() => _ClientCreateOrderScreenState();
}

class _ClientCreateOrderScreenState extends State<ClientCreateOrderScreen> {
  List<Technician> _technicians = [];
  List<ClientAddress> _addresses = [];
  bool _loading = true;
  bool _submitting = false;

  int? _selectedTechId;
  String _serviceType = '';
  String _shopAddressName = '';
  int? _selectedAddressId;
  String _serviceDate = '';
  String _startTime = '14:00';
  List<String> _selectedServiceIds = [];
  String _remark = '';

  bool _isCustomService = false;
  String _customTitle = '';
  String _customDescription = '';
  List<String> _customImages = [];
  bool _uploadingImage = false;

  @override
  void initState() {
    super.initState();
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    _serviceDate =
        '${tomorrow.year}-${tomorrow.month.toString().padLeft(2, '0')}-${tomorrow.day.toString().padLeft(2, '0')}';
    _load();
  }

  Future<void> _load() async {
    final api = context.read<ApiClient>();
    try {
      final profile = await ClientAuthService(api).getProfile();
      final techsRaw = (profile['technicians'] as List<dynamic>?) ?? [];
      final techs = techsRaw
          .map((e) => Technician.fromJson(e as Map<String, dynamic>))
          .where((t) => t.status == 'active' && ((t.homeService == true) || (t.shopAddresses?.isNotEmpty == true)))
          .toList();
      final addrs = await ClientAddressService(api).list();
      if (mounted) {
        setState(() {
          _technicians = techs;
          _addresses = addrs;
          _loading = false;
          if (widget.preselectedTechId != null) {
            _selectedTechId = widget.preselectedTechId;
          } else if (techs.length == 1) {
            _selectedTechId = techs[0].id;
          }
          if (addrs.isNotEmpty) {
            final def = addrs.firstWhere((a) => a.isDefault, orElse: () => addrs[0]);
            _selectedAddressId = def.id;
          }
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Technician? get _selectedTech =>
      _selectedTechId == null ? null : _technicians.cast<Technician?>().firstWhere((t) => t?.id == _selectedTechId, orElse: () => null);

  List<String> get _availableServiceTypes {
    final t = _selectedTech;
    if (t == null) return [];
    final types = <String>[];
    if (t.homeService == true) types.add('上门美甲');
    if (t.shopService == true && (t.shopAddresses?.isNotEmpty == true)) types.add('到店美甲');
    return types;
  }

  List<Map<String, dynamic>> get _shopAddresses {
    final t = _selectedTech;
    if (t == null) return [];
    return (t.shopAddresses ?? []).cast<Map<String, dynamic>>().where((s) => s['enabled'] != false).toList();
  }

  List<Map<String, dynamic>> get _serviceItems {
    final t = _selectedTech;
    if (t == null) return [];
    return (t.serviceItems ?? []).cast<Map<String, dynamic>>().where((s) => s['isActive'] == true).toList();
  }

  bool get _canSubmit {
    if (_selectedTech == null) return false;
    if (_serviceType.isEmpty) return false;
    if (_serviceType == '上门美甲' && _selectedAddressId == null) return false;
    if (_serviceType == '到店美甲' && _shopAddressName.isEmpty) return false;
    if (_isCustomService) return _customTitle.trim().isNotEmpty;
    return _selectedServiceIds.isNotEmpty;
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _submitting = true);
    try {
      final api = context.read<ApiClient>();
      final body = <String, dynamic>{
        'techId': _selectedTechId,
        'serviceType': _serviceType,
        'serviceDate': _serviceDate,
        'startTime': _startTime,
        'remark': _remark,
      };
      if (_serviceType == '上门美甲') body['addressId'] = _selectedAddressId;
      if (_serviceType == '到店美甲') {
        final shop = _shopAddresses.firstWhere((s) => s['name'] == _shopAddressName, orElse: () => {});
        if (shop.isNotEmpty) body['shopAddress'] = shop;
      }
      if (_isCustomService) {
        body['customTitle'] = _customTitle.trim();
        if (_customDescription.trim().isNotEmpty) body['customDescription'] = _customDescription.trim();
        if (_customImages.isNotEmpty) body['customImages'] = _customImages;
      } else {
        body['selectedServiceIds'] = _selectedServiceIds;
      }
      await ClientOrderService(api).create(body);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('预约已提交')));
        context.go('/client/orders');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('提交失败：$e')));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _pickAndUploadImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery);
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
    final topPad = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFFFFDFD), Color(0xFFF7F3F6), Color(0xFFF2F6FB)],
            stops: [0.0, 0.48, 1.0],
          ),
        ),
        child: _loading
            ? Center(child: CircularProgressIndicator(color: DT.primary))
            : Stack(
                children: [
                  ListView(
                    padding: EdgeInsets.fromLTRB(20, topPad + 68, 20, 120 + MediaQuery.of(context).padding.bottom),
                    children: [
                      _glassCard('选择美甲师', _technicians.length > 1 ? '请选择当前已开启接单的美甲师' : '当前仅有 1 位可预约的美甲师',
                        _technicians.isEmpty
                            ? [_emptyState('暂无可预约的美甲师', '请等待美甲师开启接单并配置可用服务后再发起预约')]
                            : _technicians.map(_buildTechCard).toList()),
                      const SizedBox(height: 16),
                      _glassCard('服务类型', _selectedTech != null ? '根据当前美甲师的服务能力选择本次预约方式' : '请先选择美甲师，再继续选择服务类型',
                        _availableServiceTypes.isEmpty
                            ? [_emptyPlaceholder('选择美甲师后，这里会显示可预约的服务类型')]
                            : _availableServiceTypes.map(_buildServiceTypeCard).toList()),
                      const SizedBox(height: 16),
                      _buildServiceContentSection(),
                      if (_serviceType == '上门美甲') ...[
                        const SizedBox(height: 16),
                        _buildAddressSection(),
                      ],
                      if (_serviceType == '到店美甲') ...[
                        const SizedBox(height: 16),
                        _buildShopSection(),
                      ],
                      const SizedBox(height: 16),
                      _glassCard('预约时间', '确认服务方式后，选择你方便的预约时间段', [_buildTimeSection()]),
                      const SizedBox(height: 16),
                      _glassCard('补充说明', '填写特殊需求，方便美甲师提前准备', [
                        TextField(
                          maxLines: 4,
                          decoration: InputDecoration(
                            hintText: '请输入你的特殊需求，如：想做粉色渐变、需要自带卸甲等...',
                            filled: true,
                            fillColor: const Color(0xFFF8FAFC),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(DT.rXxl),
                              borderSide: BorderSide.none,
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(DT.rXxl),
                              borderSide: const BorderSide(color: DT.primary, width: 1.5),
                            ),
                          ),
                          onChanged: (v) => _remark = v,
                        ),
                      ]),
                    ],
                  ),
                  // Sticky header
                  Container(
                    padding: EdgeInsets.fromLTRB(16, topPad + 6, 16, 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.78),
                      border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.6), width: 0.5)),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(DT.rHero),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                        child: Row(
                          children: [
                            GestureDetector(
                              onTap: () => context.pop(),
                              child: Container(
                                width: 42, height: 42,
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.8),
                                  shape: BoxShape.circle,
                                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 24, offset: const Offset(0, 10))],
                                  border: Border.all(color: Colors.black.withOpacity(0.05)),
                                ),
                                child: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF334155)),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('CREATE BOOKING', style: TextStyle(fontSize: 11, letterSpacing: 2.2, color: DT.textMuted)),
                                  const SizedBox(height: 1),
                                  const Text('创建预约', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Submit button
                  Positioned(
                    left: 0, right: 0, bottom: 0,
                    child: Container(
                      padding: EdgeInsets.fromLTRB(20, 14, 20, MediaQuery.of(context).padding.bottom + 14),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.88),
                        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.6), width: 0.5)),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: (_canSubmit && !_submitting) ? _submit : null,
                            child: _submitting
                                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : Text(_isCustomService ? '提交需求等待报价' : '提交预约'),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  // ── Technician Card ──
  Widget _buildTechCard(Technician tech) {
    final selected = _selectedTechId == tech.id;
    return GestureDetector(
      onTap: () => setState(() {
        _selectedTechId = tech.id;
        _serviceType = '';
        _shopAddressName = '';
        _selectedServiceIds = [];
      }),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: selected
              ? const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFFFF0F5), Color(0xFFFAFBFF)])
              : null,
          color: selected ? null : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(DT.rXxl),
          border: Border.all(color: selected ? DT.primary.withOpacity(0.25) : Colors.black.withOpacity(0.05)),
        ),
        child: Row(
          children: [
            _RadioDot(selected: selected),
            const SizedBox(width: 10),
            Container(
              width: 46, height: 46,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFFFFE0EA), Color(0xFFF4F7FB)]),
                borderRadius: BorderRadius.circular(16),
                image: tech.avatarUrl != null ? DecorationImage(image: NetworkImage(tech.avatarUrl!), fit: BoxFit.cover) : null,
              ),
              child: tech.avatarUrl == null
                  ? Center(child: Text(tech.name.isNotEmpty ? tech.name.substring(0, 1) : '?', style: const TextStyle(fontWeight: FontWeight.w600, color: DT.primary)))
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(tech.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textPrimary)),
                      if (tech.isDefault == true) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(color: DT.primarySoft, borderRadius: BorderRadius.circular(999)),
                          child: const Text('默认', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: DT.primary)),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(tech.city ?? tech.serviceArea ?? '暂未设置服务区域', style: const TextStyle(fontSize: 12, color: DT.textMuted)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 5,
                    children: [
                      if (tech.homeService == true) _infoBadge('上门美甲'),
                      if (tech.shopService == true) _infoBadge('到店美甲'),
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

  // ── Service Type Card ──
  Widget _buildServiceTypeCard(String type) {
    final selected = _serviceType == type;
    final desc = type == '上门美甲' ? '美甲师按预约时间上门服务' : '前往美甲师提供的门店地址服务';
    final isForced = _availableServiceTypes.length == 1;
    return GestureDetector(
      onTap: isForced ? null : () => setState(() { _serviceType = type; _shopAddressName = ''; }),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: selected
              ? const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFFFF0F5), Color(0xFFFAFBFF)])
              : null,
          color: selected ? null : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(DT.rXxl),
          border: Border.all(color: selected ? DT.primary.withOpacity(0.25) : Colors.black.withOpacity(0.05)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(type, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textPrimary)),
                      if (isForced) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(color: DT.primarySoft, borderRadius: BorderRadius.circular(999)),
                          child: const Text('固定服务', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: DT.primary)),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(desc, style: const TextStyle(fontSize: 13, height: 1.5, color: DT.textMuted)),
                ],
              ),
            ),
            _RadioDot(selected: selected),
          ],
        ),
      ),
    );
  }

  // ── Service Content Section ──
  Widget _buildServiceContentSection() {
    final children = <Widget>[];
    if (_selectedTech == null) {
      children.add(_emptyPlaceholder('选择美甲师后，这里会显示她在服务管理里设置的服务内容'));
    } else {
      children.add(_buildCustomServiceToggle());
      if (_isCustomService) children.add(_buildCustomServiceForm());
      if (!_isCustomService) {
        if (_serviceItems.isEmpty) {
          children.add(_emptyPlaceholder('该美甲师暂未设置可预约的服务内容'));
        } else {
          children.addAll(_serviceItems.map(_buildServiceItemCard));
        }
      }
    }
    return _glassCard('服务内容', _selectedTech != null ? '选择本次预约需要的具体服务内容，可多选' : '请先选择美甲师，再选择她当前开放的服务内容', children);
  }

  Widget _buildCustomServiceToggle() {
    return GestureDetector(
      onTap: () => setState(() { _isCustomService = !_isCustomService; if (_isCustomService) _selectedServiceIds = []; }),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: _isCustomService
              ? const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFFFF0F5), Color(0xFFFAFBFF)])
              : null,
          color: _isCustomService ? null : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(DT.rXxl),
          border: Border.all(color: _isCustomService ? DT.primary.withOpacity(0.25) : Colors.black.withOpacity(0.05)),
        ),
        child: Row(
          children: [
            _CheckboxDot(selected: _isCustomService),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('自定义服务', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textPrimary)),
                  SizedBox(height: 3),
                  Text('描述你的需求，上传参考图片或选择美甲师作品，等待报价', style: TextStyle(fontSize: 13, height: 1.5, color: DT.textMuted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomServiceForm() {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC).withOpacity(0.8),
        borderRadius: BorderRadius.circular(DT.rXxl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('服务名称', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: DT.textPrimary)),
          const SizedBox(height: 6),
          TextField(
            decoration: InputDecoration(
              hintText: '例如：法式渐变美甲',
              filled: true, fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(DT.rXxl), borderSide: BorderSide(color: Colors.grey.shade200)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(DT.rXxl), borderSide: BorderSide(color: Colors.grey.shade200)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(DT.rXxl), borderSide: const BorderSide(color: DT.primary)),
            ),
            onChanged: (v) => setState(() => _customTitle = v),
          ),
          const SizedBox(height: 12),
          const Text('详细描述', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: DT.textPrimary)),
          const SizedBox(height: 6),
          TextField(
            maxLines: 3,
            decoration: InputDecoration(
              hintText: '描述你的具体需求，如颜色、款式、特殊要求等...',
              filled: true, fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(DT.rXxl), borderSide: BorderSide(color: Colors.grey.shade200)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(DT.rXxl), borderSide: BorderSide(color: Colors.grey.shade200)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(DT.rXxl), borderSide: const BorderSide(color: DT.primary)),
            ),
            onChanged: (v) => setState(() => _customDescription = v),
          ),
          const SizedBox(height: 12),
          const Text('参考图片（可选）', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: DT.textPrimary)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8, runSpacing: 8,
            children: [
              ..._customImages.asMap().entries.map((e) => Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(DT.rMd),
                    child: Image.network(e.value, width: 72, height: 72, fit: BoxFit.cover),
                  ),
                  Positioned(
                    top: 2, right: 2,
                    child: GestureDetector(
                      onTap: () => setState(() { final list = List<String>.from(_customImages); list.removeAt(e.key); _customImages = list; }),
                      child: Container(
                        width: 20, height: 20,
                        decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle),
                        child: const Icon(Icons.close, color: Colors.white, size: 12),
                      ),
                    ),
                  ),
                ],
              )),
              if (_customImages.length < 3)
                GestureDetector(
                  onTap: _uploadingImage ? null : _pickAndUploadImage,
                  child: Container(
                    width: 72, height: 72,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
                      borderRadius: BorderRadius.circular(DT.rMd),
                    ),
                    child: _uploadingImage
                        ? const Center(child: CircularProgressIndicator(strokeWidth: 2, color: DT.primary))
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.add_photo_alternate_outlined, color: Colors.grey.shade400, size: 22),
                              Text('添加', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                            ],
                          ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text('最多可上传3张图片', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
        ],
      ),
    );
  }

  Widget _buildServiceItemCard(Map<String, dynamic> svc) {
    final id = svc['id'] as String;
    final selected = _selectedServiceIds.contains(id);
    return GestureDetector(
      onTap: () => setState(() {
        if (selected) {
          _selectedServiceIds = _selectedServiceIds.where((s) => s != id).toList();
        } else {
          _selectedServiceIds = [..._selectedServiceIds, id];
        }
      }),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: selected
              ? const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFFFF0F5), Color(0xFFFAFBFF)])
              : null,
          color: selected ? null : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(DT.rXxl),
          border: Border.all(color: selected ? DT.primary.withOpacity(0.25) : Colors.black.withOpacity(0.05)),
        ),
        child: Row(
          children: [
            _CheckboxDot(selected: selected),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(svc['name']?.toString() ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textPrimary)),
                  if (svc['description'] != null) ...[
                    const SizedBox(height: 3),
                    Text(svc['description'].toString(), style: const TextStyle(fontSize: 13, height: 1.5, color: DT.textMuted)),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Address Section ──
  Widget _buildAddressSection() {
    final children = <Widget>[];
    if (_addresses.isEmpty) {
      children.add(_emptyState('暂无上门地址，请先添加', '至少添加一个上门地址后，才能继续预约上门美甲',
        action: '添加地址', onAction: () => context.push('/client/addresses')));
    } else {
      children.addAll(_addresses.map((addr) {
        final selected = _selectedAddressId == addr.id;
        return GestureDetector(
          onTap: () => setState(() => _selectedAddressId = addr.id),
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: selected
                  ? const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFFFF0F5), Color(0xFFFAFBFF)])
                  : null,
              color: selected ? null : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(DT.rXxl),
              border: Border.all(color: selected ? DT.primary.withOpacity(0.25) : Colors.black.withOpacity(0.05)),
            ),
            child: Row(
              children: [
                _RadioDot(selected: selected),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(addr.contactName ?? '未命名', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textPrimary)),
                          if (addr.contactPhone != null) ...[
                            const SizedBox(width: 8),
                            Text(addr.contactPhone!, style: const TextStyle(fontSize: 12, color: DT.textMuted)),
                          ],
                          if (addr.isDefault) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(color: DT.primarySoft, borderRadius: BorderRadius.circular(999)),
                              child: const Text('默认', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: DT.primary)),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(addr.fullAddress, style: const TextStyle(fontSize: 13, height: 1.5, color: DT.textSecondary)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      }));
    }
    return _glassCard('上门服务地址', '美甲师会按你选择的地址安排上门服务', children,
      trailing: GestureDetector(
        onTap: () => context.push('/client/addresses'),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(color: DT.primarySoft, borderRadius: BorderRadius.circular(999)),
          child: const Text('管理地址', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: DT.primary)),
        ),
      ));
  }

  // ── Shop Section ──
  Widget _buildShopSection() {
    final children = <Widget>[];
    if (_shopAddresses.isEmpty) {
      children.add(_emptyPlaceholder('该美甲师暂未配置可预约门店'));
    } else {
      children.addAll(_shopAddresses.map((shop) {
        final name = shop['name']?.toString() ?? '';
        final selected = _shopAddressName == name;
        final addr = [shop['province'], shop['city'], shop['district'], shop['detailAddress']].where((s) => s != null).join(' ');
        return GestureDetector(
          onTap: () => setState(() => _shopAddressName = name),
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: selected
                  ? const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFFFF0F5), Color(0xFFFAFBFF)])
                  : null,
              color: selected ? null : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(DT.rXxl),
              border: Border.all(color: selected ? DT.primary.withOpacity(0.25) : Colors.black.withOpacity(0.05)),
            ),
            child: Row(
              children: [
                _RadioDot(selected: selected),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textPrimary)),
                          if (shop['phone'] != null) ...[
                            const SizedBox(width: 8),
                            Text(shop['phone'].toString(), style: const TextStyle(fontSize: 12, color: DT.textMuted)),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(addr, style: const TextStyle(fontSize: 13, height: 1.5, color: DT.textSecondary)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      }));
    }
    return _glassCard('到店门店地址', '请选择本次要前往的具体门店地址', children);
  }

  // ── Time Section ──
  Widget _buildTimeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () async {
            final now = DateTime.now();
            final picked = await showDatePicker(
              context: context,
              initialDate: now.add(const Duration(days: 1)),
              firstDate: now,
              lastDate: now.add(const Duration(days: 60)),
            );
            if (picked != null) {
              setState(() {
                _serviceDate = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
              });
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(DT.rXxl),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today_rounded, size: 16, color: DT.primary),
                const SizedBox(width: 8),
                Text(_serviceDate, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textPrimary)),
                const Spacer(),
                Icon(Icons.chevron_right_rounded, size: 18, color: Colors.grey.shade400),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            childAspectRatio: 2,
          ),
          itemCount: _timeSlots.length,
          itemBuilder: (_, i) {
            final t = _timeSlots[i];
            final selected = _startTime == t;
            return GestureDetector(
              onTap: () => setState(() => _startTime = t),
              child: Container(
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: selected ? DT.primaryGradient : null,
                  color: selected ? null : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(DT.rXxl),
                  boxShadow: selected ? [BoxShadow(color: const Color(0x4DFF6B8A), blurRadius: 12, offset: const Offset(0, 4))] : null,
                ),
                child: Text(t, style: TextStyle(
                  fontSize: 13,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                  color: selected ? Colors.white : const Color(0xFF64748B),
                )),
              ),
            );
          },
        ),
      ],
    );
  }

  // ── Helpers ──
  Widget _glassCard(String title, String subtitle, List<Widget> children, {Widget? trailing}) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.88),
        borderRadius: BorderRadius.circular(DT.rCard),
        boxShadow: DT.shadowMd,
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
                    const SizedBox(height: 4),
                    Text(subtitle, style: const TextStyle(fontSize: 13, color: DT.textMuted)),
                  ],
                ),
              ),
              if (trailing != null) trailing,
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  Widget _emptyPlaceholder(String msg) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(DT.rXxl)),
      child: Text(msg, style: const TextStyle(fontSize: 13, color: DT.textMuted)),
    );
  }

  Widget _emptyState(String title, String subtitle, {String? action, VoidCallback? onAction}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(DT.rXxl)),
      child: Column(
        children: [
          Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: DT.textPrimary)),
          const SizedBox(height: 6),
          Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, color: DT.textMuted)),
          if (action != null && onAction != null) ...[
            const SizedBox(height: 14),
            GestureDetector(
              onTap: onAction,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(color: DT.primary, borderRadius: BorderRadius.circular(999)),
                child: Text(action, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _infoBadge(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.8),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
      child: Text(text, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFF475569))),
    );
  }
}

class _RadioDot extends StatelessWidget {
  final bool selected;
  const _RadioDot({required this.selected});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 20, height: 20,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: selected ? DT.primary : const Color(0xFFCBD5E1), width: 2),
        color: selected ? DT.primary : Colors.transparent,
      ),
      child: selected
          ? const Icon(Icons.check_rounded, size: 14, color: Colors.white)
          : null,
    );
  }
}

class _CheckboxDot extends StatelessWidget {
  final bool selected;
  const _CheckboxDot({required this.selected});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 20, height: 20,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: selected ? DT.primary : const Color(0xFFCBD5E1), width: 2),
        color: selected ? DT.primary : Colors.transparent,
      ),
      child: selected
          ? const Icon(Icons.check_rounded, size: 14, color: Colors.white)
          : null,
    );
  }
}
