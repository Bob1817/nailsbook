import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/glass_container.dart';
import '../auth/technician_auth_service.dart';
import '../auth/technician_auth_models.dart';
import '../../../core/widgets/nb_toast.dart';

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
      if (mounted)
        setState(() {
          _profile = p;
          _loading = false;
        });
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
        NbToast.show(context, '保存成功');
      }
    } catch (_) {
    } finally {
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
                            padding: const EdgeInsets.fromLTRB(
                                DT.xl, 0, DT.xl, DT.xxl),
                            children: [
                              _buildInfoBanner(),
                              const SizedBox(height: DT.lg),
                              ..._shops
                                  .asMap()
                                  .entries
                                  .map((e) => _buildShopCard(e.key, e.value)),
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
    return GlassContainer(
      blur: DT.glassBlurHeavy,
      opacity: 0.64,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.fromLTRB(DT.sm, topPad + DT.xs, DT.xl, DT.sm),
      child: Row(
        children: [
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: DT.surface.withValues(alpha: 0.8),
                shape: BoxShape.circle,
              ),
              child: const Icon(CupertinoIcons.back,
                  size: 18, color: DT.textDarkGrey),
            ),
          ),
          const SizedBox(width: DT.md),
          const Text('店铺管理', style: DT.titleLarge),
        ],
      ),
    );
  }

  // ── Info Banner ──

  Widget _buildInfoBanner() {
    return Container(
      padding: const EdgeInsets.all(DT.md),
      decoration: BoxDecoration(
        color: DT.infoBg,
        borderRadius: BorderRadius.circular(DT.radius14),
        border: Border.all(color: DT.infoBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(CupertinoIcons.info_circle, size: 20, color: DT.info),
          const SizedBox(width: DT.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('到店美甲配置',
                    style: DT.bodyMedium.copyWith(
                        fontWeight: FontWeight.w600, color: DT.infoText)),
                const SizedBox(height: DT.xs),
                Text('添加并启用店铺后，用户预约时将显示"到店美甲"选项。',
                    style: TextStyle(
                        fontSize: 13,
                        color: DT.actionBlue.withValues(alpha: 0.8),
                        height: 1.5)),
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
      shop['province'],
      shop['city'],
      shop['district'],
      shop['detailAddress'],
    ].where((s) => s != null && s.toString().isNotEmpty).join(' ');
    final phone = shop['phone']?.toString() ?? '';
    final businessHours = (shop['businessHours'] as List<dynamic>?) ?? [];

    return GestureDetector(
      onTap: () => HapticFeedback.lightImpact(),
      child: Container(
        margin: const EdgeInsets.only(bottom: DT.md),
        padding: const EdgeInsets.all(DT.lg),
        decoration: BoxDecoration(
          color: DT.surface,
          borderRadius: BorderRadius.circular(DT.xl),
          border: Border.all(color: DT.borderLight),
          boxShadow: DT.shadowSm,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Name + status
            Row(
              children: [
                const Text('\u{1F3EA}', style: TextStyle(fontSize: 22)),
                const SizedBox(width: DT.sm),
                Expanded(
                  child: Text(name, style: DT.titleMedium),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: DT.sm, vertical: DT.xs),
                  decoration: BoxDecoration(
                    color: enabled ? DT.successSoft : DT.fillGreyLight,
                    borderRadius: BorderRadius.circular(DT.rFull),
                  ),
                  child: Text(enabled ? '营业中' : '已关闭',
                      style: DT.captionLarge.copyWith(
                          fontWeight: FontWeight.w500,
                          color: enabled ? DT.actionGreen : DT.textMidGrey)),
                ),
              ],
            ),
            // Address
            if (addr.isNotEmpty) ...[
              const SizedBox(height: DT.sm),
              Text(addr,
                  style: DT.bodyMedium
                      .copyWith(color: DT.textMidGrey, height: 1.5)),
            ],
            // Phone
            if (phone.isNotEmpty) ...[
              const SizedBox(height: DT.xs),
              Row(
                children: [
                  const Icon(CupertinoIcons.phone,
                      size: 14, color: DT.textLightGrey),
                  const SizedBox(width: DT.xs),
                  Text(phone,
                      style: DT.bodyMedium.copyWith(color: DT.textMidGrey)),
                ],
              ),
            ],
            // Business hours
            if (businessHours.isNotEmpty) ...[
              const SizedBox(height: DT.sm),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: businessHours.map((h) {
                  final bh = h as Map<String, dynamic>;
                  final wd = bh['weekday'] as int? ?? 0;
                  final closed = bh['closed'] as bool? ?? false;
                  final labelIdx = _weekdayKeys.indexOf(wd).clamp(0, 6);
                  final label = _weekdayLabels[labelIdx];
                  final time =
                      closed ? '休息' : '${bh['start'] ?? ''}-${bh['end'] ?? ''}';
                  return Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: DT.sm, vertical: DT.xs),
                    decoration: BoxDecoration(
                      color:
                          closed ? DT.fillGreyLight : const Color(0xFF3A2F23),
                      borderRadius: BorderRadius.circular(DT.sm),
                    ),
                    child: Text('$label $time',
                        style: DT.captionMedium.copyWith(
                            color: closed ? DT.textLightGrey : DT.primary)),
                  );
                }).toList(),
              ),
            ],
            // Actions
            Container(
              margin: const EdgeInsets.only(top: DT.md),
              padding: const EdgeInsets.only(top: DT.md),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: DT.borderLight)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  _shopActionBtn(
                    enabled ? '关闭店铺' : '启用店铺',
                    enabled ? DT.orange50 : DT.successSoft,
                    enabled ? DT.actionOrange : DT.actionGreen,
                    () async {
                      HapticFeedback.selectionClick();
                      final shops = List<Map<String, dynamic>>.from(_shops);
                      shops[index] = Map<String, dynamic>.from(shops[index]);
                      shops[index]['enabled'] = !enabled;
                      await _saveShops(shops);
                    },
                  ),
                  const SizedBox(width: DT.sm),
                  _shopActionBtn('编辑', DT.fillGreyLight, DT.textMidGrey, () {
                    HapticFeedback.lightImpact();
                    _showShopSheet(index);
                  }),
                  const SizedBox(width: DT.sm),
                  _shopActionBtn('删除', DT.errorBg, DT.error, () {
                    HapticFeedback.mediumImpact();
                    _deleteShop(index);
                  }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _shopActionBtn(String label, Color bg, Color fg, VoidCallback onTap) {
    return GestureDetector(
      onTap: _saving ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: DT.md, vertical: DT.sm),
        constraints: const BoxConstraints(minHeight: 44),
        decoration: BoxDecoration(
            color: bg, borderRadius: BorderRadius.circular(DT.rFull)),
        child: Center(
          child: Text(label,
              style: DT.bodySmall
                  .copyWith(fontWeight: FontWeight.w500, color: fg)),
        ),
      ),
    );
  }

  Future<void> _deleteShop(int index) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('删除门店'),
        content: const Text('确定要删除这个门店吗？'),
        actions: [
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消'),
          ),
          CupertinoDialogAction(
              isDestructiveAction: true,
              onPressed: () {
                HapticFeedback.heavyImpact();
                Navigator.pop(ctx, true);
              },
              child: const Text('删除')),
        ],
      ),
    );
    if (confirmed != true) return;
    final shops = List<Map<String, dynamic>>.from(_shops)..removeAt(index);
    await _saveShops(shops);
  }

  // ── Bottom Bar ──

  Widget _buildBottomBar(double bottomPad) {
    return GlassBottomSurface(
      padding: EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl, DT.md + bottomPad),
      child: GestureDetector(
        onTap: () {
          HapticFeedback.lightImpact();
          _showShopSheet(null);
        },
        child: Container(
          height: 50,
          decoration: BoxDecoration(
            gradient: DT.heroGradient,
            borderRadius: BorderRadius.circular(DT.lg),
            boxShadow: [
              BoxShadow(
                  color: DT.primary.withValues(alpha: 0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 8))
            ],
          ),
          alignment: Alignment.center,
          child: const Text('+ 新增店铺',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white)),
        ),
      ),
    );
  }

  // ── Shop Form Sheet ──

  void _showShopSheet(int? editIndex) {
    final existing = editIndex != null ? _shops[editIndex] : null;
    final nameCtl =
        TextEditingController(text: existing?['name']?.toString() ?? '');
    final phoneCtl =
        TextEditingController(text: existing?['phone']?.toString() ?? '');
    final provinceCtl =
        TextEditingController(text: existing?['province']?.toString() ?? '');
    final cityCtl =
        TextEditingController(text: existing?['city']?.toString() ?? '');
    final districtCtl =
        TextEditingController(text: existing?['district']?.toString() ?? '');
    final detailCtl = TextEditingController(
        text: existing?['detailAddress']?.toString() ?? '');

    List<Map<String, dynamic>> hours = List.from(
      (existing?['businessHours'] as List<dynamic>?)
              ?.cast<Map<String, dynamic>>() ??
          [],
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Container(
          height: MediaQuery.of(ctx).size.height * 0.85,
          decoration: const BoxDecoration(
            color: DT.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(DT.rCard)),
          ),
          padding: const EdgeInsets.fromLTRB(DT.xl, DT.xl, DT.xl, DT.xxl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(editIndex == null ? '添加门店' : '编辑门店',
                        style: DT.titleMedium),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(ctx),
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                          color: DT.dividerWarm, shape: BoxShape.circle),
                      child: const Icon(CupertinoIcons.xmark,
                          size: 16, color: DT.textMidGrey),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: DT.lg),
              Expanded(
                child: ListView(
                  children: [
                    _formField('门店名称', nameCtl),
                    _formField('门店电话', phoneCtl, keyboard: TextInputType.phone),
                    _formField('省份', provinceCtl),
                    _formField('城市', cityCtl),
                    _formField('区/县', districtCtl),
                    _formField('详细地址', detailCtl),
                    const SizedBox(height: DT.lg),
                    const Text('营业时间', style: DT.titleSmall),
                    const SizedBox(height: DT.sm),
                    ..._weekdayKeys.asMap().entries.map((entry) {
                      final i = entry.key;
                      final wd = entry.value;
                      final idx = hours.indexWhere((h) => h['weekday'] == wd);
                      final h = idx >= 0 ? hours[idx] : null;
                      final closed = h?['closed'] as bool? ?? false;
                      final startCtl = TextEditingController(
                          text: h?['start']?.toString() ?? '10:00');
                      final endCtl = TextEditingController(
                          text: h?['end']?.toString() ?? '21:00');
                      return Padding(
                        padding: const EdgeInsets.only(bottom: DT.sm),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 36,
                              child: Text(_weekdayLabels[i],
                                  style: DT.bodySmall.copyWith(
                                      fontWeight: FontWeight.w500,
                                      color: DT.textPrimary)),
                            ),
                            SizedBox(
                              width: 51,
                              height: 31,
                              child: CupertinoSwitch(
                                value: !closed,
                                activeTrackColor: DT.primary,
                                onChanged: (v) {
                                  HapticFeedback.selectionClick();
                                  setSheetState(() {
                                    if (idx >= 0) {
                                      hours[idx] = {
                                        ...hours[idx],
                                        'closed': !v
                                      };
                                    } else {
                                      hours.add({
                                        'weekday': wd,
                                        'closed': !v,
                                        'start': '10:00',
                                        'end': '21:00',
                                      });
                                    }
                                  });
                                },
                              ),
                            ),
                            if (!closed) ...[
                              const SizedBox(width: DT.sm),
                              Expanded(
                                child: SizedBox(
                                  height: 36,
                                  child: TextField(
                                    controller: startCtl,
                                    style: DT.bodySmall,
                                    decoration: InputDecoration(
                                      hintText: '10:00',
                                      hintStyle: DT.bodySmall
                                          .copyWith(color: DT.iconGrey),
                                      contentPadding:
                                          const EdgeInsets.symmetric(
                                              horizontal: DT.sm),
                                      border: OutlineInputBorder(
                                        borderRadius:
                                            BorderRadius.circular(DT.sm),
                                        borderSide: const BorderSide(
                                            color: DT.borderGrey),
                                      ),
                                      isDense: true,
                                    ),
                                    onChanged: (v) {
                                      if (idx >= 0) hours[idx]['start'] = v;
                                    },
                                  ),
                                ),
                              ),
                              Padding(
                                padding:
                                    EdgeInsets.symmetric(horizontal: DT.xs),
                                child: Text(' - ',
                                    style: DT.bodySmall
                                        .copyWith(color: DT.textLightGrey)),
                              ),
                              Expanded(
                                child: SizedBox(
                                  height: 36,
                                  child: TextField(
                                    controller: endCtl,
                                    style: DT.bodySmall,
                                    decoration: InputDecoration(
                                      hintText: '21:00',
                                      hintStyle: DT.bodySmall
                                          .copyWith(color: DT.iconGrey),
                                      contentPadding:
                                          const EdgeInsets.symmetric(
                                              horizontal: DT.sm),
                                      border: OutlineInputBorder(
                                        borderRadius:
                                            BorderRadius.circular(DT.sm),
                                        borderSide: const BorderSide(
                                            color: DT.borderGrey),
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
                              Padding(
                                padding: EdgeInsets.only(left: DT.sm),
                                child: Text('休息',
                                    style: DT.bodySmall
                                        .copyWith(color: DT.textLightGrey)),
                              ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
              const SizedBox(height: DT.md),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () async {
                    HapticFeedback.mediumImpact();
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
                    backgroundColor: DT.cream,
                    foregroundColor: DT.onCream,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(DT.radius14)),
                    elevation: 0,
                  ),
                  child: const Text('保存',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _formField(String label, TextEditingController ctl,
      {TextInputType? keyboard}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: DT.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: DT.bodyMedium.copyWith(
                  fontWeight: FontWeight.w500, color: DT.textDarkGrey)),
          const SizedBox(height: DT.xs),
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: DT.borderGrey),
              borderRadius: BorderRadius.circular(DT.radius14),
            ),
            child: TextField(
              controller: ctl,
              keyboardType: keyboard,
              style: const TextStyle(fontSize: 15, color: DT.textPrimary),
              decoration: InputDecoration(
                hintText: '请输入$label',
                hintStyle: const TextStyle(fontSize: 14, color: DT.iconGrey),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: DT.md, vertical: DT.md),
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
        padding: const EdgeInsets.all(DT.space40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                  color: DT.primarySoft, shape: BoxShape.circle),
              alignment: Alignment.center,
              child: const Text('\u{1F3EA}', style: TextStyle(fontSize: 32)),
            ),
            const SizedBox(height: DT.lg),
            Text('暂无店铺',
                style: DT.titleMedium.copyWith(color: DT.textDarkGrey)),
            const SizedBox(height: DT.xs),
            Text('添加店铺信息，让客户知道您的店铺位置',
                style: DT.bodyMedium.copyWith(color: DT.textMuted)),
          ],
        ),
      ),
    );
  }
}
