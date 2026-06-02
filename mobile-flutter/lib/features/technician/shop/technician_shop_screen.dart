import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/technician_auth_service.dart';
import '../auth/technician_auth_models.dart';

class TechnicianShopScreen extends StatefulWidget {
  const TechnicianShopScreen({super.key});

  @override
  State<TechnicianShopScreen> createState() => _TechnicianShopScreenState();
}

class _TechnicianShopScreenState extends State<TechnicianShopScreen> {
  TechnicianProfile? _profile;
  bool _loading = true;
  bool _saving = false;

  static const _weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  static const _weekdayKeys = [1, 2, 3, 4, 5, 6, 0];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      final p = await TechnicianAuthService(api).getProfile();
      if (mounted) setState(() { _profile = p; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _shops =>
      (_profile?.shopAddresses ?? []).cast<Map<String, dynamic>>();

  Future<void> _saveShops(List<Map<String, dynamic>> shops) async {
    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      final hasShops = shops.any((s) => s['enabled'] != false);
      await TechnicianAuthService(api).updateServiceType({
        'homeService': _profile?.homeService ?? false,
        'shopService': hasShops,
        'shopAddresses': shops,
      });
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('保存成功'),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ));
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: DT.bgWarm,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : Column(
              children: [
                _buildHeader(topPad),
                Expanded(
                  child: RefreshIndicator(
                    color: DT.primary,
                    onRefresh: _load,
                    child: _shops.isEmpty
                        ? _buildEmpty()
                        : ListView(
                            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                            children: [
                              _buildInfoBanner(),
                              const SizedBox(height: 16),
                              ..._shops.asMap().entries.map((e) =>
                                _buildShopCard(e.key, e.value)),
                            ],
                          ),
                  ),
                ),
                _buildBottomBar(bottomPad),
              ],
            ),
    );
  }

  // ── Header ──

  Widget _buildHeader(double topPad) {
    return Padding(
      padding: EdgeInsets.fromLTRB(8, topPad + 4, 20, 8),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.8),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF374151)),
            ),
          ),
          const SizedBox(width: 12),
          const Text('店铺管理',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: DT.textPrimary)),
        ],
      ),
    );
  }

  // ── Info Banner ──

  Widget _buildInfoBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline, size: 20, color: Color(0xFF3B82F6)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('到店美甲配置',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1E40AF))),
                const SizedBox(height: 4),
                Text('添加并启用店铺后，用户预约时将显示"到店美甲"选项。',
                  style: TextStyle(fontSize: 13, color: const Color(0xFF2563EB).withOpacity(0.8), height: 1.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Shop Card ──

  Widget _buildShopCard(int index, Map<String, dynamic> shop) {
    final enabled = shop['enabled'] as bool? ?? true;
    final name = shop['name']?.toString() ?? '未命名门店';
    final addr = [
      shop['province'], shop['city'], shop['district'], shop['detailAddress'],
    ].where((s) => s != null && s.toString().isNotEmpty).join(' ');
    final phone = shop['phone']?.toString() ?? '';
    final businessHours = (shop['businessHours'] as List<dynamic>?) ?? [];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: DT.shadowSm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Name + status
          Row(
            children: [
              const Text('🏪', style: TextStyle(fontSize: 22)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(name,
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: enabled ? const Color(0xFFECFDF5) : const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(enabled ? '营业中' : '已关闭',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500,
                    color: enabled ? const Color(0xFF059669) : const Color(0xFF6B7280))),
              ),
            ],
          ),
          // Address
          if (addr.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(addr,
              style: const TextStyle(fontSize: 14, color: Color(0xFF6B7280), height: 1.5)),
          ],
          // Phone
          if (phone.isNotEmpty) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.phone_outlined, size: 14, color: Color(0xFF9CA3AF)),
                const SizedBox(width: 4),
                Text(phone,
                  style: const TextStyle(fontSize: 14, color: Color(0xFF6B7280))),
              ],
            ),
          ],
          // Business hours
          if (businessHours.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6, runSpacing: 4,
              children: businessHours.map((h) {
                final bh = h as Map<String, dynamic>;
                final wd = bh['weekday'] as int? ?? 0;
                final closed = bh['closed'] as bool? ?? false;
                final labelIdx = _weekdayKeys.indexOf(wd).clamp(0, 6);
                final label = _weekdayLabels[labelIdx];
                final time = closed ? '休息' : '${bh['start'] ?? ''}-${bh['end'] ?? ''}';
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: closed ? const Color(0xFFF3F4F6) : const Color(0xFFFFF1F5),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text('$label $time',
                    style: TextStyle(fontSize: 11,
                      color: closed ? const Color(0xFF9CA3AF) : DT.primary)),
                );
              }).toList(),
            ),
          ],
          // Actions
          Container(
            margin: const EdgeInsets.only(top: 12),
            padding: const EdgeInsets.only(top: 12),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                _shopActionBtn(
                  enabled ? '关闭店铺' : '启用店铺',
                  enabled ? const Color(0xFFFFF7ED) : const Color(0xFFECFDF5),
                  enabled ? const Color(0xFFEA580C) : const Color(0xFF059669),
                  () async {
                    final shops = List<Map<String, dynamic>>.from(_shops);
                    shops[index] = Map<String, dynamic>.from(shops[index]);
                    shops[index]['enabled'] = !enabled;
                    await _saveShops(shops);
                  },
                ),
                const SizedBox(width: 8),
                _shopActionBtn('编辑', const Color(0xFFF3F4F6), const Color(0xFF6B7280),
                  () => _showShopSheet(index)),
                const SizedBox(width: 8),
                _shopActionBtn('删除', const Color(0xFFFEF2F2), const Color(0xFFEF4444),
                  () => _deleteShop(index)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _shopActionBtn(String label, Color bg, Color fg, VoidCallback onTap) {
    return GestureDetector(
      onTap: _saving ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
        child: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: fg)),
      ),
    );
  }

  Future<void> _deleteShop(int index) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除门店'),
        content: const Text('确定要删除这个门店吗？'),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('删除', style: TextStyle(color: Color(0xFFEF4444)))),
        ],
      ),
    );
    if (confirmed != true) return;
    final shops = List<Map<String, dynamic>>.from(_shops)..removeAt(index);
    await _saveShops(shops);
  }

  // ── Bottom Bar ──

  Widget _buildBottomBar(double bottomPad) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, 12 + bottomPad),
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(top: BorderSide(color: Color(0xFFF1F5F9))),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, -4))],
      ),
      child: GestureDetector(
        onTap: () => _showShopSheet(null),
        child: Container(
          height: 50,
          decoration: BoxDecoration(
            gradient: DT.heroGradient,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [BoxShadow(color: DT.primary.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
          ),
          alignment: Alignment.center,
          child: const Text('+ 新增店铺',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
        ),
      ),
    );
  }

  // ── Shop Form Sheet ──

  void _showShopSheet(int? editIndex) {
    final existing = editIndex != null ? _shops[editIndex] : null;
    final nameCtl = TextEditingController(text: existing?['name']?.toString() ?? '');
    final phoneCtl = TextEditingController(text: existing?['phone']?.toString() ?? '');
    final provinceCtl = TextEditingController(text: existing?['province']?.toString() ?? '');
    final cityCtl = TextEditingController(text: existing?['city']?.toString() ?? '');
    final districtCtl = TextEditingController(text: existing?['district']?.toString() ?? '');
    final detailCtl = TextEditingController(text: existing?['detailAddress']?.toString() ?? '');

    List<Map<String, dynamic>> hours = List.from(
      (existing?['businessHours'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [],
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Container(
          height: MediaQuery.of(ctx).size.height * 0.85,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(editIndex == null ? '添加门店' : '编辑门店',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(ctx),
                    child: Container(
                      width: 32, height: 32,
                      decoration: const BoxDecoration(color: Color(0xFFF2F0F3), shape: BoxShape.circle),
                      child: const Icon(Icons.close, size: 16, color: Color(0xFF6D6570)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView(
                  children: [
                    _formField('门店名称', nameCtl),
                    _formField('门店电话', phoneCtl, keyboard: TextInputType.phone),
                    _formField('省份', provinceCtl),
                    _formField('城市', cityCtl),
                    _formField('区/县', districtCtl),
                    _formField('详细地址', detailCtl),
                    const SizedBox(height: 16),
                    const Text('营业时间',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: DT.textPrimary)),
                    const SizedBox(height: 10),
                    ..._weekdayKeys.asMap().entries.map((entry) {
                      final i = entry.key;
                      final wd = entry.value;
                      final idx = hours.indexWhere((h) => h['weekday'] == wd);
                      final h = idx >= 0 ? hours[idx] : null;
                      final closed = h?['closed'] as bool? ?? false;
                      final startCtl = TextEditingController(text: h?['start']?.toString() ?? '10:00');
                      final endCtl = TextEditingController(text: h?['end']?.toString() ?? '21:00');
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 36,
                              child: Text(_weekdayLabels[i],
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: DT.textPrimary)),
                            ),
                            SizedBox(
                              width: 44, height: 24,
                              child: Switch(
                                value: !closed,
                                activeColor: DT.primary,
                                onChanged: (v) {
                                  setSheetState(() {
                                    if (idx >= 0) {
                                      hours[idx] = {...hours[idx], 'closed': !v};
                                    } else {
                                      hours.add({
                                        'weekday': wd, 'closed': !v,
                                        'start': '10:00', 'end': '21:00',
                                      });
                                    }
                                  });
                                },
                              ),
                            ),
                            if (!closed) ...[
                              const SizedBox(width: 8),
                              Expanded(
                                child: SizedBox(
                                  height: 36,
                                  child: TextField(
                                    controller: startCtl,
                                    style: const TextStyle(fontSize: 13),
                                    decoration: InputDecoration(
                                      hintText: '10:00',
                                      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFFB0AAB4)),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                                      ),
                                      isDense: true,
                                    ),
                                    onChanged: (v) {
                                      if (idx >= 0) hours[idx]['start'] = v;
                                    },
                                  ),
                                ),
                              ),
                              const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 4),
                                child: Text(' - ', style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
                              ),
                              Expanded(
                                child: SizedBox(
                                  height: 36,
                                  child: TextField(
                                    controller: endCtl,
                                    style: const TextStyle(fontSize: 13),
                                    decoration: InputDecoration(
                                      hintText: '21:00',
                                      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFFB0AAB4)),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                                      ),
                                      isDense: true,
                                    ),
                                    onChanged: (v) {
                                      if (idx >= 0) hours[idx]['end'] = v;
                                    },
                                  ),
                                ),
                              ),
                            ] else
                              const Padding(
                                padding: EdgeInsets.only(left: 8),
                                child: Text('休息',
                                  style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
                              ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity, height: 50,
                child: ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    final shopData = <String, dynamic>{
                      'name': nameCtl.text.trim(),
                      'phone': phoneCtl.text.trim(),
                      'province': provinceCtl.text.trim(),
                      'city': cityCtl.text.trim(),
                      'district': districtCtl.text.trim(),
                      'detailAddress': detailCtl.text.trim(),
                      'enabled': true,
                      if (hours.isNotEmpty) 'businessHours': hours,
                    };
                    final shops = List<Map<String, dynamic>>.from(_shops);
                    if (editIndex != null) {
                      shops[editIndex] = shopData;
                    } else {
                      shops.add(shopData);
                    }
                    await _saveShops(shops);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: DT.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: const Text('保存', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _formField(String label, TextEditingController ctl, {TextInputType? keyboard}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF374151))),
          const SizedBox(height: 4),
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFE5E7EB)),
              borderRadius: BorderRadius.circular(14),
            ),
            child: TextField(
              controller: ctl,
              keyboardType: keyboard,
              style: const TextStyle(fontSize: 15, color: DT.textPrimary),
              decoration: InputDecoration(
                hintText: '请输入$label',
                hintStyle: const TextStyle(fontSize: 14, color: Color(0xFFB0AAB4)),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Empty ──

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64, height: 64,
              decoration: const BoxDecoration(color: Color(0xFFFFF1F5), shape: BoxShape.circle),
              alignment: Alignment.center,
              child: const Text('🏪', style: TextStyle(fontSize: 32)),
            ),
            const SizedBox(height: 16),
            const Text('暂无店铺',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: Color(0xFF374151))),
            const SizedBox(height: 4),
            Text('添加店铺信息，让客户知道您的店铺位置',
              style: TextStyle(fontSize: 14, color: DT.textMuted)),
          ],
        ),
      ),
    );
  }
}
