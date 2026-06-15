import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../core/media/image_pick.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/theme/editorial_tokens.dart';
import '../auth/client_auth_models.dart';
import '../auth/client_auth_service.dart';
import '../addresses/client_address_models.dart';
import '../addresses/client_address_service.dart';
import '../addresses/client_addresses_screen.dart';
import '../../shared/booking/booking_availability.dart';
import 'client_order_service.dart';
import '../../../core/widgets/nb_toast.dart';

class ClientCreateOrderScreen extends StatefulWidget {
  final int? preselectedTechId;

  /// 从「可约时间」弹窗带入的预选日期/时间（yyyy-MM-dd / HH:mm）。
  final String? preselectedDate;
  final String? preselectedTime;

  /// 「预约同款」：作品标题/图直接作为自定义服务内容预填，并跳过「美甲师/服务内容」步。
  final String? preselectedCustomTitle;
  final List<String>? preselectedCustomImages;
  const ClientCreateOrderScreen({
    super.key,
    this.preselectedTechId,
    this.preselectedDate,
    this.preselectedTime,
    this.preselectedCustomTitle,
    this.preselectedCustomImages,
  });

  @override
  State<ClientCreateOrderScreen> createState() => _ClientCreateOrderScreenState();
}

class _ClientCreateOrderScreenState extends State<ClientCreateOrderScreen> {
  List<Technician> _technicians = [];
  List<ClientAddress> _addresses = [];
  bool _loading = true;
  bool _submitting = false;

  /// 分步向导当前步：0 美甲师 · 1 服务方式 · 2 预约时间 · 3 服务内容 · 4 确认。
  int _step = 0;
  static const _stepTitles = ['选择美甲师', '服务方式', '预约时间', '服务内容', '确认预约'];

  int? _selectedTechId;
  String _serviceType = '';
  String _shopAddressName = '';
  int? _selectedAddressId;
  String _serviceDate = '';
  String _startTime = '';
  List<String> _selectedServiceIds = [];
  String _remark = '';
  List<Map<String, dynamic>> _blockedSlots = [];

  bool _isCustomService = false;
  String _customTitle = '';
  String _customDescription = '';
  List<String> _customImages = [];
  bool _uploadingImage = false;

  /// 待校验的代入时间（来自可约时间弹窗）。
  String? _pendingTime;

  @override
  void initState() {
    super.initState();
    if (widget.preselectedDate != null &&
        widget.preselectedDate!.isNotEmpty) {
      _serviceDate = widget.preselectedDate!;
    } else {
      final tomorrow = DateTime.now().add(const Duration(days: 1));
      _serviceDate =
          '${tomorrow.year}-${tomorrow.month.toString().padLeft(2, '0')}-${tomorrow.day.toString().padLeft(2, '0')}';
    }
    _pendingTime = widget.preselectedTime;
    // 「预约同款」：作品标题/图预填为自定义服务内容。
    if (widget.preselectedCustomTitle != null) {
      _isCustomService = true;
      _customTitle = widget.preselectedCustomTitle!;
      _customImages = List<String>.from(widget.preselectedCustomImages ?? const []);
    }
    _load();
  }

  /// 是否为「预约同款」模式（美甲师固定 + 服务内容已预填）。
  bool get _isQuickSameStyle => widget.preselectedCustomTitle != null;

  /// 当前向导要展示的步骤（绝对索引）。预约同款跳过「美甲师」「服务内容」。
  List<int> get _steps =>
      _isQuickSameStyle ? const [1, 2, 4] : const [0, 1, 2, 3, 4];

  /// 代入时间校验：在可约时段确定后，若代入时间不可约（被服务类型/门店/占用导致冲突）→ 提示。
  void _applyPendingTime() {
    final pending = _pendingTime;
    if (pending == null || pending.isEmpty) return;
    _pendingTime = null;
    if (_availableSlots.contains(pending)) {
      _startTime = pending;
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) NbToast.show(context, '预约时间冲突，请重新选择预约时间～');
      });
    }
  }

  Future<void> _load() async {
    final api = context.read<ApiClient>();
    // 美甲师与地址独立加载：任一接口失败/超时都不会拖垮整页，避免空白。
    List<Technician> techs = [];
    List<ClientAddress> addrs = [];
    try {
      final profile = await ClientAuthService(api)
          .getProfile()
          .timeout(const Duration(seconds: 12));
      final techsRaw = (profile['technicians'] as List<dynamic>?) ?? [];
      // 显示全部已绑定美甲师；可预约性由「服务类型」环节决定，避免整页空白。
      techs = techsRaw
          .map((e) => Technician.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {}
    try {
      addrs = await ClientAddressService(api)
          .list()
          .timeout(const Duration(seconds: 12));
    } catch (_) {}
    if (!mounted) return;
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
      _ensureSelection();
    });
    if (_selectedTechId != null) _loadBlocked(_selectedTechId!);
  }

  /// 拉取该美甲师被占用的时段，用于时段联动。
  Future<void> _loadBlocked(int techId) async {
    try {
      final slots = await ClientOrderService(context.read<ApiClient>())
          .getBlockedSlots(techId)
          .timeout(const Duration(seconds: 10));
      if (mounted) {
        setState(() {
          _blockedSlots = slots;
          _ensureSelection();
          _applyPendingTime();
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _blockedSlots = [];
          _applyPendingTime();
        });
      }
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

  // ── 预约时间联动（与 webapp useTechnicianAvailability 等价）──

  bool get _isShopMode => _serviceType == '到店美甲';

  Map<String, dynamic>? get _selectedShopMap {
    if (!_isShopMode || _shopAddressName.isEmpty) return null;
    final found = _shopAddresses.firstWhere((s) => s['name'] == _shopAddressName, orElse: () => {});
    return found.isEmpty ? null : found;
  }

  /// 该日期是否可约：到店看店铺营业、上门看美甲师工作日。
  bool _dateAvailable(String dateStr) {
    if (_isShopMode) return isShopOpenOnDate(_selectedShopMap, dateStr);
    return isDateAvailable(_selectedTech?.serviceSchedule, dateStr);
  }

  List<SlotStatus> get _slotStatuses {
    if (_selectedTech == null) return const [];
    return getSlotStatuses(
      dateStr: _serviceDate,
      range: _isShopMode ? null : scheduleRange(_selectedTech!.serviceSchedule),
      blockedSlots: _blockedSlots,
      shopMode: _isShopMode,
      shopHours: _isShopMode ? shopHoursOptionForDate(_selectedShopMap, _serviceDate) : null,
    );
  }

  List<String> get _availableSlots =>
      _slotStatuses.where((s) => !s.occupied).map((s) => s.time).toList();

  String _fmtDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String? _firstAvailableDate() {
    final now = DateTime.now();
    final base = DateTime(now.year, now.month, now.day);
    for (int i = 0; i <= 60; i++) {
      final s = _fmtDate(base.add(Duration(days: i)));
      if (_dateAvailable(s)) return s;
    }
    return null;
  }

  /// 选择美甲师/服务方式/门店变化后，自动收敛到合法的服务方式、门店、日期与时段。
  void _ensureSelection() {
    final types = _availableServiceTypes;
    if (_serviceType.isEmpty && types.length == 1) _serviceType = types.first;
    if (_isShopMode && _shopAddressName.isEmpty && _shopAddresses.length == 1) {
      _shopAddressName = _shopAddresses.first['name']?.toString() ?? '';
    }
    if (_serviceDate.isEmpty || !_dateAvailable(_serviceDate)) {
      _serviceDate = _firstAvailableDate() ?? _serviceDate;
    }
    _autoSelectAddress();
    _ensureSlot();
  }

  void _ensureSlot() {
    final avail = _availableSlots;
    if (_startTime.isEmpty || !avail.contains(_startTime)) {
      _startTime = avail.isNotEmpty ? avail.first : '';
    }
  }

  // ── 跨城上门限制 ──

  bool _sameCity(ClientAddress a) => sameCity(a.city, _selectedTech?.city);

  /// 上门服务城市（用于提示文案）。
  String get _techServiceCity => (_selectedTech?.city ?? '').trim();

  /// 仅自动选择同城地址；当前选中的若跨城则清空。
  void _autoSelectAddress() {
    if (_serviceType != '上门美甲') return;
    final sameCityAddrs = _addresses.where(_sameCity).toList();
    if (_selectedAddressId != null && sameCityAddrs.any((a) => a.id == _selectedAddressId)) return;
    ClientAddress? def;
    for (final a in sameCityAddrs) {
      if (a.isDefault) { def = a; break; }
    }
    def ??= sameCityAddrs.isNotEmpty ? sameCityAddrs.first : null;
    _selectedAddressId = def?.id;
  }

  bool get _canSubmit {
    if (_selectedTech == null) return false;
    if (_serviceType.isEmpty) return false;
    if (_startTime.isEmpty || !_availableSlots.contains(_startTime)) return false;
    if (_serviceType == '上门美甲') {
      if (_selectedAddressId == null) return false;
      for (final a in _addresses) {
        if (a.id == _selectedAddressId && !_sameCity(a)) return false;
      }
    }
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
        NbToast.show(context, '预约已提交');
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        NbToast.show(context, '提交失败：$e');
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _pickAndUploadImage() async {
    final file = await ImagePick.content();
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
      if (mounted) NbToast.show(context, '图片上传失败');
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
            colors: [Color(0xFF16120E), Color(0xFF16120E), Color(0xFF16120E)],
            stops: [0.0, 0.48, 1.0],
          ),
        ),
        child: _loading
            ? Center(child: CircularProgressIndicator(color: DT.primary))
            : Stack(
                children: [
                  ListView(
                    padding: EdgeInsets.fromLTRB(20, topPad + 96, 20, 110 + MediaQuery.of(context).padding.bottom),
                    children: _stepContent(_steps[_step]),
                  ),
                  // Sticky header（玻璃模糊仅限于头部区域，避免整页被模糊）
                  Positioned(
                    left: 0, right: 0, top: 0,
                    child: ClipRect(
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: ET.glassBlur, sigmaY: ET.glassBlur),
                        child: Container(
                          padding: EdgeInsets.fromLTRB(16, topPad + 6, 16, 12),
                          decoration: const BoxDecoration(
                            color: ET.glassFill,
                            border: Border(bottom: BorderSide(color: ET.hairlineFaint, width: 0.5)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  GestureDetector(
                                    onTap: _back,
                                    child: Container(
                                      width: 42, height: 42,
                                      decoration: const BoxDecoration(
                                        color: ET.surface,
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: ET.ink),
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('步骤 ${_step + 1}/${_steps.length}', style: const TextStyle(fontSize: 11, letterSpacing: 1.5, color: ET.inkMuted)),
                                        const SizedBox(height: 1),
                                        Text(_stepTitles[_steps[_step]], style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: ET.ink)),
                                      ],
                                    ),
                                  ),
                                  // 终止预约（关闭）
                                  GestureDetector(
                                    onTap: _confirmCancel,
                                    child: Container(
                                      width: 42, height: 42,
                                      decoration: const BoxDecoration(
                                        color: ET.surface,
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.close_rounded, size: 20, color: ET.inkSecondary),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              // 进度条
                              Row(
                                children: List.generate(_steps.length, (i) {
                                  final done = i <= _step;
                                  return Expanded(
                                    child: Container(
                                      height: 3,
                                      margin: EdgeInsets.only(right: i < _steps.length - 1 ? 5 : 0),
                                      decoration: BoxDecoration(
                                        color: done ? ET.accent : ET.hairline,
                                        borderRadius: BorderRadius.circular(999),
                                      ),
                                    ),
                                  );
                                }),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  // 底部导航：上一步 / 下一步（末步为提交）
                  Positioned(
                    left: 0, right: 0, bottom: 0,
                    child: Container(
                      padding: EdgeInsets.fromLTRB(20, 12, 20, MediaQuery.of(context).padding.bottom + 12),
                      decoration: const BoxDecoration(
                        color: ET.bgElevated,
                        border: Border(top: BorderSide(color: ET.hairline, width: 0.5)),
                      ),
                      child: _bottomNav(),
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  // ── 分步向导 ──

  List<Widget> _stepContent(int i) {
    switch (i) {
      case 0:
        return [
          _glassCard(
              '选择美甲师',
              _technicians.length > 1 ? '请选择当前已开启接单的美甲师' : '当前仅有 1 位可预约的美甲师',
              _technicians.isEmpty
                  ? [_emptyState('暂无可预约的美甲师', '请等待美甲师开启接单并配置可用服务后再发起预约')]
                  : _technicians.map(_buildTechCard).toList()),
        ];
      case 1:
        return [
          _glassCard(
              '服务方式',
              _selectedTech != null ? '根据当前美甲师的服务能力选择本次预约方式' : '请先选择美甲师',
              _availableServiceTypes.isEmpty
                  ? [_emptyPlaceholder('选择美甲师后，这里会显示可预约的服务类型')]
                  : _availableServiceTypes.map(_buildServiceTypeCard).toList()),
          if (_serviceType == '到店美甲') ...[
            const SizedBox(height: 16),
            _buildShopSection(),
          ],
        ];
      case 2:
        return [
          _glassCard('预约时间', '已根据美甲师与服务方式列出可约时段', [_buildTimeSection()]),
        ];
      case 3:
        return [
          _buildServiceContentSection(),
          if (_serviceType == '上门美甲') ...[
            const SizedBox(height: 16),
            _buildAddressSection(),
          ],
        ];
      case 4:
        return [
          if (_isQuickSameStyle) ...[
            _sameStylePreview(),
            const SizedBox(height: 16),
          ],
          _summaryCard(),
          // 预约同款 + 上门：地址选择并入确认步（内容步已跳过）
          if (_isQuickSameStyle && _serviceType == '上门美甲') ...[
            const SizedBox(height: 16),
            _buildAddressSection(),
          ],
          const SizedBox(height: 16),
          _notesCard(),
        ];
      default:
        return const [];
    }
  }

  bool _stepValid(int i) {
    switch (i) {
      case 0:
        return _selectedTech != null;
      case 1:
        return _serviceType.isNotEmpty &&
            (_serviceType != '到店美甲' || _shopAddressName.isNotEmpty);
      case 2:
        return _startTime.isNotEmpty && _availableSlots.contains(_startTime);
      case 3:
        final contentOk = _isCustomService
            ? _customTitle.trim().isNotEmpty
            : _selectedServiceIds.isNotEmpty;
        if (!contentOk) return false;
        if (_serviceType == '上门美甲') {
          if (_selectedAddressId == null) return false;
          final a = _addresses
              .cast<ClientAddress?>()
              .firstWhere((x) => x?.id == _selectedAddressId,
                  orElse: () => null);
          if (a != null && !_sameCity(a)) return false;
        }
        return true;
      case 4:
        return _canSubmit;
      default:
        return false;
    }
  }

  void _back() {
    if (_step > 0) {
      setState(() => _step--);
    } else {
      Navigator.pop(context);
    }
  }

  /// 终止预约：弹窗确认后退出整个预约流程。
  Future<void> _confirmCancel() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ET.bgElevated,
        title: const Text('终止预约', style: TextStyle(color: ET.ink)),
        content: const Text('确定要终止本次预约吗？已填写的信息将不会保存。',
            style: TextStyle(color: ET.inkSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('继续预约', style: TextStyle(color: ET.inkSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('确认终止', style: TextStyle(color: ET.like)),
          ),
        ],
      ),
    );
    if (ok == true && mounted) Navigator.pop(context);
  }

  void _next() {
    if (!_stepValid(_step)) return;
    FocusScope.of(context).unfocus();
    setState(() => _step++);
  }

  Widget _bottomNav() {
    final isLast = _step == _steps.length - 1;
    final valid = _stepValid(_steps[_step]);
    return Row(
      children: [
        if (_step > 0) ...[
          SizedBox(
            height: 50,
            child: OutlinedButton(
              onPressed: _back,
              style: OutlinedButton.styleFrom(
                foregroundColor: ET.ink,
                side: const BorderSide(color: ET.hairlineStrong),
                shape: const StadiumBorder(),
                // 覆盖全局 outlinedButtonTheme 的 minimumSize: infinity，否则会撑满整行
                minimumSize: const Size(0, 50),
                padding: const EdgeInsets.symmetric(horizontal: 22),
              ),
              child: const Text('上一步'),
            ),
          ),
          const SizedBox(width: 12),
        ],
        Expanded(
          child: SizedBox(
            height: 50,
            child: ElevatedButton(
              onPressed: !valid || _submitting
                  ? null
                  : (isLast ? _submit : _next),
              style: ElevatedButton.styleFrom(
                backgroundColor: ET.cream,
                foregroundColor: ET.onCream,
                disabledBackgroundColor: ET.cream.withValues(alpha: 0.35),
                elevation: 0,
                shape: const StadiumBorder(),
                textStyle:
                    const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              child: _submitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: ET.onCream))
                  : Text(isLast
                      ? (_isCustomService ? '提交需求等待报价' : '提交预约')
                      : '下一步'),
            ),
          ),
        ),
      ],
    );
  }

  Widget _summaryCard() {
    final addrName = _addresses
        .cast<ClientAddress?>()
        .firstWhere((x) => x?.id == _selectedAddressId, orElse: () => null)
        ?.fullAddress;
    final content = _isCustomService
        ? (_customTitle.trim().isEmpty ? '自定义需求' : _customTitle.trim())
        : '已选 ${_selectedServiceIds.length} 项服务';
    return _glassCard('确认信息', '请核对后提交预约', [
      _summaryRow('美甲师', _selectedTech?.name ?? '—'),
      _summaryRow('服务方式', _serviceType.isEmpty ? '—' : _serviceType),
      _summaryRow('预约时间',
          '$_serviceDate${_startTime.isEmpty ? '' : ' $_startTime'}'),
      _summaryRow('服务内容', content),
      if (_serviceType == '上门美甲')
        _summaryRow('上门地址', addrName ?? '—'),
      if (_serviceType == '到店美甲')
        _summaryRow('到店门店', _shopAddressName.isEmpty ? '—' : _shopAddressName),
    ]);
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
              width: 72,
              child: Text(label,
                  style: const TextStyle(fontSize: 13, color: ET.inkMuted))),
          const SizedBox(width: 8),
          Expanded(
            child: Text(value,
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w500, color: ET.ink)),
          ),
        ],
      ),
    );
  }

  Widget _sameStylePreview() {
    return _glassCard('预约同款', '以下作品将作为本次服务内容，确认后选择方式与时间', [
      // 标题在上
      Text(_customTitle.trim().isEmpty ? '同款作品' : _customTitle.trim(),
          style: const TextStyle(
              fontSize: 15, fontWeight: FontWeight.w600, color: ET.ink)),
      const SizedBox(height: 10),
      // 图片在下：横向可滑，支持多图
      if (_customImages.isEmpty)
        Container(
          height: 96,
          width: double.infinity,
          decoration: BoxDecoration(
              color: ET.surface, borderRadius: BorderRadius.circular(14)),
          alignment: Alignment.center,
          child: const Icon(Icons.image_outlined, color: ET.inkMuted),
        )
      else
        SizedBox(
          height: 110,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _customImages.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) => GestureDetector(
              onTap: () => _openImageViewer(i),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Image.network(_customImages[i],
                    width: 110, height: 110, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                        width: 110, height: 110, color: ET.surface)),
              ),
            ),
          ),
        ),
    ]);
  }

  /// 全屏查看作品图（左右翻页）。
  void _openImageViewer(int index) {
    Navigator.push(
      context,
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.black,
        pageBuilder: (_, __, ___) => _FullscreenImages(
            images: _customImages, initialIndex: index),
      ),
    );
  }

  Widget _notesCard() {
    return _glassCard('补充说明（选填）', '填写特殊需求，方便美甲师提前准备', [
      TextField(
        maxLines: 4,
        cursorColor: ET.accent,
        style: const TextStyle(color: ET.ink, fontSize: 14),
        decoration: InputDecoration(
          hintText: '如：想做粉色渐变、需要自带卸甲等…',
          hintStyle: const TextStyle(color: ET.inkMuted),
          filled: true,
          fillColor: ET.bg,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(DT.rXxl),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(DT.rXxl),
            borderSide: const BorderSide(color: ET.accent, width: 1.5),
          ),
        ),
        onChanged: (v) => _remark = v,
      ),
    ]);
  }

  // ── Technician Card ──
  Widget _buildTechCard(Technician tech) {
    final selected = _selectedTechId == tech.id;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedTechId = tech.id;
          _serviceType = '';
          _shopAddressName = '';
          _selectedServiceIds = [];
          _blockedSlots = [];
          _startTime = '';
          _ensureSelection();
        });
        _loadBlocked(tech.id);
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: selected
              ? const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF3A2F23), Color(0xFF211C17)])
              : null,
          color: selected ? null : const Color(0xFF211C17),
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
                gradient: const LinearGradient(colors: [Color(0xFF3A2F23), Color(0xFF211C17)]),
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
      onTap: isForced ? null : () => setState(() { _serviceType = type; _shopAddressName = ''; _ensureSelection(); }),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: selected
              ? const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF3A2F23), Color(0xFF211C17)])
              : null,
          color: selected ? null : const Color(0xFF211C17),
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
              ? const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF3A2F23), Color(0xFF211C17)])
              : null,
          color: _isCustomService ? null : const Color(0xFF211C17),
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
        color: const Color(0xFF211C17).withOpacity(0.8),
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
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(DT.rXxl), borderSide: BorderSide(color: DT.border)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(DT.rXxl), borderSide: BorderSide(color: DT.border)),
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
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(DT.rXxl), borderSide: BorderSide(color: DT.border)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(DT.rXxl), borderSide: BorderSide(color: DT.border)),
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
                      border: Border.all(color: DT.border, style: BorderStyle.solid),
                      borderRadius: BorderRadius.circular(DT.rMd),
                    ),
                    child: _uploadingImage
                        ? const Center(child: CircularProgressIndicator(strokeWidth: 2, color: DT.primary))
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.add_photo_alternate_outlined, color: DT.textTertiary, size: 22),
                              Text('添加', style: TextStyle(fontSize: 11, color: DT.textTertiary)),
                            ],
                          ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text('最多可上传3张图片', style: TextStyle(fontSize: 11, color: DT.textTertiary)),
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
              ? const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF3A2F23), Color(0xFF211C17)])
              : null,
          color: selected ? null : const Color(0xFF211C17),
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
    final hasCityLimit = (_selectedTech?.city ?? '').trim().isNotEmpty;
    final sameCityCount = _addresses.where(_sameCity).length;

    // 同城上门提示横幅
    if (hasCityLimit) {
      children.add(_cityLimitBanner());
      children.add(const SizedBox(height: 10));
    }

    if (_addresses.isEmpty) {
      children.add(_emptyState('暂无上门地址，请先添加', '至少添加一个上门地址后，才能继续预约上门美甲',
        action: '添加地址', onAction: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ClientAddressesScreen())).then((_) => _load())));
    } else {
      // 提示：有地址但没有同城地址时
      if (hasCityLimit && sameCityCount == 0) {
        children.add(Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: _hintBox('你暂无 ${normCity(_selectedTech?.city)} 的同城地址，请新增一个同城地址后再预约上门'),
        ));
      }
      children.addAll(_addresses.map((addr) {
        final cityOk = _sameCity(addr);
        final selected = _selectedAddressId == addr.id && cityOk;
        return Opacity(
          opacity: cityOk ? 1 : 0.55,
          child: GestureDetector(
            onTap: () {
              if (!cityOk) {
                _showCrossCityTip();
                return;
              }
              setState(() => _selectedAddressId = addr.id);
            },
            child: Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: selected
                    ? const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF3A2F23), Color(0xFF211C17)])
                    : null,
                color: selected ? null : const Color(0xFF211C17),
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
                            if (!cityOk) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(color: const Color(0xFF2A241E), borderRadius: BorderRadius.circular(999)),
                                child: const Text('跨城不可约', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: DT.textTertiary)),
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
          ),
        );
      }));
    }
    return _glassCard('上门服务地址', '美甲师会按你选择的地址安排上门服务', children,
      trailing: GestureDetector(
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ClientAddressesScreen())).then((_) => _load()),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(color: DT.primarySoft, borderRadius: BorderRadius.circular(999)),
          child: const Text('管理地址', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: DT.primary)),
        ),
      ));
  }

  Widget _cityLimitBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: DT.primarySoft,
        borderRadius: BorderRadius.circular(DT.rXxl),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.place_outlined, size: 16, color: DT.primary),
          const SizedBox(width: 8),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: const TextStyle(fontSize: 12.5, height: 1.5, color: DT.primaryDark),
                children: [
                  const TextSpan(text: '该美甲师仅支持 '),
                  TextSpan(text: _techServiceCity, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const TextSpan(text: ' 同城上门，跨城地址不可预约'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showCrossCityTip() {
    final city = normCity(_selectedTech?.city);
    NbToast.error(context, '跨城暂不支持上门，请选择 $city 同城地址');
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
          onTap: () => setState(() { _shopAddressName = name; _ensureSelection(); }),
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: selected
                  ? const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF3A2F23), Color(0xFF211C17)])
                  : null,
              color: selected ? null : const Color(0xFF211C17),
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

  // ── Time Section（日期横滑选择 + 联动时段）──
  Widget _buildTimeSection() {
    if (_selectedTech == null) {
      return _emptyPlaceholder('请先选择美甲师与服务方式，再选择预约时间');
    }
    final statuses = _slotStatuses;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildDateStrip(),
        const SizedBox(height: 6),
        if (_isShopMode && _shopAddressName.isNotEmpty)
          ...() {
            final opt = shopHoursOptionForDate(_selectedShopMap, _serviceDate);
            if (opt == null) return <Widget>[];
            final text = opt['closed'] == true
                ? '所选日期为该店铺休息日，请改选其他日期'
                : '店铺营业时间：${opt['start']} - ${opt['end']}';
            return [Padding(padding: const EdgeInsets.only(bottom: 10), child: _hintBox(text))];
          }(),
        if (statuses.isEmpty)
          _emptyPlaceholder(_isShopMode ? '所选日期店铺休息，请改选日期' : '该美甲师当天暂无可预约时段，请改选日期')
        else
          _buildSlotGrid(statuses),
      ],
    );
  }

  Widget _buildDateStrip() {
    final now = DateTime.now();
    final base = DateTime(now.year, now.month, now.day);
    const wk = ['一', '二', '三', '四', '五', '六', '日']; // Dart weekday 1..7
    return SizedBox(
      height: 42,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: 45,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final d = base.add(Duration(days: i));
          final ds = _fmtDate(d);
          final enabled = _dateAvailable(ds);
          final selected = _serviceDate == ds;
          final label = i == 0 ? '今天' : i == 1 ? '明天' : '周${wk[d.weekday - 1]}';
          return GestureDetector(
            onTap: enabled ? () => setState(() { _serviceDate = ds; _ensureSlot(); }) : null,
            child: Container(
              width: 58,
              decoration: BoxDecoration(
                gradient: selected ? DT.primaryGradient : null,
                color: selected ? null : const Color(0xFF211C17),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: selected ? Colors.transparent : Colors.black.withOpacity(0.05)),
                boxShadow: selected ? [BoxShadow(color: const Color(0x4DC4627A), blurRadius: 12, offset: const Offset(0, 4))] : null,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // 休息日用「休」替代星期，保持两行布局、避免溢出固定高度
                  Text(enabled ? label : '休',
                    style: TextStyle(fontSize: 12, height: 1.1, color: selected ? DT.onCream.withValues(alpha: 0.7) : (enabled ? DT.textMuted : DT.textTertiary.withOpacity(0.6)))),
                  const SizedBox(height: 3),
                  Text('${d.month}/${d.day}',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, height: 1.1, color: selected ? DT.onCream : (enabled ? DT.textPrimary : DT.textTertiary.withOpacity(0.45)))),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSlotGrid(List<SlotStatus> statuses) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 2.4,
      ),
      itemCount: statuses.length,
      itemBuilder: (_, i) {
        final s = statuses[i];
        final selected = _startTime == s.time && !s.occupied;
        return GestureDetector(
          onTap: s.occupied ? null : () => setState(() => _startTime = s.time),
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: selected ? DT.primaryGradient : null,
              color: selected ? null : (s.occupied ? const Color(0xFF2A241E) : const Color(0xFF211C17)),
              borderRadius: BorderRadius.circular(DT.rXxl),
              boxShadow: selected ? [BoxShadow(color: const Color(0x4DC4627A), blurRadius: 12, offset: const Offset(0, 4))] : null,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(s.time, style: TextStyle(
                  fontSize: 13,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                  color: selected ? DT.onCream : (s.occupied ? DT.textTertiary : const Color(0xFF64748B)),
                  decoration: s.occupied ? TextDecoration.lineThrough : null,
                )),
                if (s.occupied)
                  const Text('已约', style: TextStyle(fontSize: 9, height: 1.2, color: DT.textTertiary)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _hintBox(String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(color: const Color(0xFF211C17), borderRadius: BorderRadius.circular(DT.rXxl)),
      child: Text(text, style: const TextStyle(fontSize: 12, color: DT.textMuted)),
    );
  }

  // ── Helpers ──
  Widget _glassCard(String title, String subtitle, List<Widget> children, {Widget? trailing}) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: DT.surface.withOpacity(0.62),
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
      decoration: BoxDecoration(color: const Color(0xFF211C17), borderRadius: BorderRadius.circular(DT.rXxl)),
      child: Text(msg, style: const TextStyle(fontSize: 13, color: DT.textMuted)),
    );
  }

  Widget _emptyState(String title, String subtitle, {String? action, VoidCallback? onAction}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
      decoration: BoxDecoration(color: const Color(0xFF211C17), borderRadius: BorderRadius.circular(DT.rXxl)),
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
        color: DT.surface.withOpacity(0.8),
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

/// 作品图全屏预览：左右翻页 + 双指缩放 + 点击关闭。
class _FullscreenImages extends StatefulWidget {
  final List<String> images;
  final int initialIndex;
  const _FullscreenImages({required this.images, required this.initialIndex});

  @override
  State<_FullscreenImages> createState() => _FullscreenImagesState();
}

class _FullscreenImagesState extends State<_FullscreenImages> {
  late final PageController _ctl =
      PageController(initialPage: widget.initialIndex);
  late int _index = widget.initialIndex;

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          PageView.builder(
            controller: _ctl,
            itemCount: widget.images.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (_, i) => GestureDetector(
              onTap: () => Navigator.pop(context),
              child: InteractiveViewer(
                minScale: 1,
                maxScale: 4,
                child: Center(
                  child: Image.network(widget.images[i], fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => const Icon(
                          Icons.image_not_supported,
                          color: Colors.white24, size: 48)),
                ),
              ),
            ),
          ),
          Positioned(
            left: 16,
            top: topPad + 8,
            child: GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    shape: BoxShape.circle),
                child: const Icon(Icons.close_rounded,
                    color: Colors.white, size: 22),
              ),
            ),
          ),
          if (widget.images.length > 1)
            Positioned(
              bottom: MediaQuery.of(context).padding.bottom + 20,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(999)),
                  child: Text('${_index + 1} / ${widget.images.length}',
                      style:
                          const TextStyle(color: Colors.white, fontSize: 13)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
