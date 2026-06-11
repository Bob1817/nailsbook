import 'package:nailbook_mobile/core/widgets/glass_container.dart';

import '../auth/technician_auth_models.dart';
import '../auth/technician_auth_service.dart';

// ════════════════════════════════════════════════════════════════════
// 上门服务设置页面
//
// • 毛玻璃导航栏（统一暗色玻璃）+ 统一圆形返回/新增按钮
// • 标题居中，DT.titleMedium
// • 开关即时保存（无底部保存按钮），同步 profile.homeService
// • 三个模块（服务范围 / 距离附加费 / 时段附加费）预览+编辑模式
// ════════════════════════════════════════════════════════════════════

class TechnicianHomeServiceSettingsScreen extends StatefulWidget {
  const TechnicianHomeServiceSettingsScreen({super.key});

  @override
  State<TechnicianHomeServiceSettingsScreen> createState() =>
      _TechnicianHomeServiceSettingsScreenState();
}

class _TechnicianHomeServiceSettingsScreenState
    extends State<TechnicianHomeServiceSettingsScreen> {
  bool _loading = true;
  bool _saving = false;
  bool _enabled = false;

  // ── 配置数据 ──
  double _serviceRadius = 10;
  List<Map<String, dynamic>> _distanceRanges = [
    {'minDistance': 0, 'maxDistance': 3, 'baseFee': 0},
    {'minDistance': 3, 'maxDistance': 5, 'baseFee': 20},
    {'minDistance': 5, 'maxDistance': 10, 'baseFee': 40},
    {'minDistance': 10, 'maxDistance': -1, 'baseFee': 60},
  ];
  double _nightFee = 30;
  double _holidayFee = 20;

  // ── 编辑状态 ──
  String? _editingModule; // 'radius' / 'distance' / 'time' / null

  @override
  void initState() {
    super.initState();
    _load();
  }

  // ──── 数据加载（从 profile.homeService + homeServiceSettings 读取） ────

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      final profile = await TechnicianAuthService(api).getProfile();
      if (!mounted) return;
      setState(() {
        _loading = false;
        // 同步 profile.homeService 开关状态
        _enabled = profile.homeService ?? false;
        // 读取详细设置
        final raw = (profile as dynamic);
        final settings = raw.homeServiceSettings as Map<String, dynamic>?;
        if (settings != null) {
          _serviceRadius =
              (settings['serviceRadius'] as num?)?.toDouble() ?? 10;
          final feeConfig = settings['feeConfig'] as Map<String, dynamic>?;
          if (feeConfig != null) {
            final ranges = feeConfig['distanceRanges'] as List<dynamic>?;
            if (ranges != null) {
              _distanceRanges = ranges.cast<Map<String, dynamic>>();
            }
            final nightSlot =
                (feeConfig['timeSlotFees'] as Map<String, dynamic>?)?['nighttime'];
            if (nightSlot != null) {
              _nightFee = (nightSlot['fee'] as num?)?.toDouble() ?? 30;
            }
            _holidayFee =
                (feeConfig['holidayFee'] as num?)?.toDouble() ?? 20;
          }
        }
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ──── 保存 ────

  Future<void> _save({bool showSuccess = true}) async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      await TechnicianAuthService(api).updateServiceType({
        'homeService': _enabled,
        'homeServiceSettings': {
          'enabled': _enabled,
          'serviceRadius': _serviceRadius,
          'feeConfig': {
            'distanceRanges': _distanceRanges,
            'timeSlotFees': {
              'daytime': {'start': '08:00', 'end': '18:00', 'fee': 0},
              'nighttime': {
                'start': '18:00',
                'end': '08:00',
                'fee': _nightFee,
              },
            },
            'holidayFee': _holidayFee,
          },
        },
      });
      if (mounted && showSuccess) NbToast.success(context, '设置已保存');
    } catch (_) {
      if (mounted) NbToast.error(context, '保存失败，请重试');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  /// 即时切换上门服务开关
  Future<void> _toggleEnabled() async {
    HapticFeedback.selectionClick();
    setState(() => _enabled = !_enabled);
    if (!_enabled) _editingModule = null;
    _save(showSuccess: false);
    if (mounted) {
      NbToast.show(context, _enabled ? '上门服务已开启' : '上门服务已关闭');
    }
  }

  // ────────────────────────────────────────────────────────────────
  // BUILD
  // ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: DT.bg,
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: DT.primary))
          : Stack(
              children: [
                ListView(
                  padding: EdgeInsets.fromLTRB(
                      DT.xl, topPad + 80, DT.xl, bottomPad + DT.xxxl),
                  children: [
                    _toggleCard(),
                    if (_enabled) ...[
                      const SizedBox(height: DT.md),
                      _radiusCard(),
                      const SizedBox(height: DT.md),
                      _distanceFeeCard(),
                      const SizedBox(height: DT.md),
                      _timeFeeCard(),
                    ],
                  ],
                ),
                Positioned(
                    left: 0, right: 0, top: 0, child: _header(topPad)),
                // 编辑模式下的保存按钮
                if (_editingModule != null)
                  Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: _saveSurface(bottomPad)),
              ],
            ),
    );
  }

  // ──── 毛玻璃导航栏 ────

  Widget _header(double topPad) {
    return GlassContainer(
      tint: TechnicianGlassStyle.tint,
      blur: TechnicianGlassStyle.blur,
      opacity: TechnicianGlassStyle.opacity,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.fromLTRB(DT.sm, topPad + DT.xs, DT.sm, DT.md),
      child: Row(
        children: [
          _circleIconButton(
            icon: CupertinoIcons.back,
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
          ),
          const Expanded(
            child: Text('上门服务设置',
                textAlign: TextAlign.center, style: DT.titleMedium),
          ),
          // 占位，保持标题居中
          const SizedBox(width: 44),
        ],
      ),
    );
  }

  Widget _circleIconButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: DT.surface.withValues(alpha: 0.45),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 18, color: DT.textPrimary),
      ),
    );
  }

  // ──── 开关卡片 ────

  Widget _toggleCard() {
    return _sectionCard(
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: _enabled ? DT.primarySoft : DT.surfaceAlt,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(
              CupertinoIcons.house_fill,
              size: 22,
              color: _enabled ? DT.primary : DT.textMuted,
            ),
          ),
          const SizedBox(width: DT.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('启用上门服务',
                    style: DT.titleSmall.copyWith(
                        color: _enabled ? DT.textPrimary : DT.textMuted)),
                const SizedBox(height: 2),
                Text('开启后客户可预约上门美甲服务',
                    style: DT.bodySmall.copyWith(
                        color: _enabled ? DT.textSecondary : DT.textMuted)),
              ],
            ),
          ),
          Transform.scale(
            scale: 0.72,
            child: CupertinoSwitch(
              value: _enabled,
              activeTrackColor: DT.primary,
              inactiveTrackColor: DT.bgWarm,
              thumbColor: DT.cream,
              onChanged: (_) => _toggleEnabled(),
            ),
          ),
        ],
      ),
    );
  }

  // ──── 服务范围 ────

  Widget _radiusCard() {
    final editing = _editingModule == 'radius';
    return _sectionCard(
      title: '服务范围',
      trailing: editing ? null : _editButton('radius'),
      child: editing
          ? Row(
              children: [
                Expanded(
                  child: SliderTheme(
                    data: SliderThemeData(
                      activeTrackColor: DT.primary,
                      inactiveTrackColor: DT.primarySoft,
                      thumbColor: DT.primary,
                      overlayColor: DT.primary.withValues(alpha: 0.1),
                    ),
                    child: Slider(
                      value: _serviceRadius,
                      min: 1,
                      max: 50,
                      divisions: 49,
                      label: '${_serviceRadius.toInt()} 公里',
                      onChanged: (v) =>
                          setState(() => _serviceRadius = v),
                    ),
                  ),
                ),
                SizedBox(
                  width: 60,
                  child: Text('${_serviceRadius.toInt()} km',
                      style: DT.monospace.copyWith(color: DT.textPrimary),
                      textAlign: TextAlign.center),
                ),
              ],
            )
          : Row(
              children: [
                const Icon(CupertinoIcons.map_pin,
                    size: 18, color: DT.textTertiary),
                const SizedBox(width: DT.sm),
                Text('${_serviceRadius.toInt()} 公里',
                    style: DT.bodyMedium.copyWith(color: DT.textPrimary)),
              ],
            ),
    );
  }

  // ──── 距离附加费 ────

  Widget _distanceFeeCard() {
    final editing = _editingModule == 'distance';
    return _sectionCard(
      title: '距离附加费',
      trailing: editing
          ? null
          : _editButton('distance'),
      child: editing
          ? _distanceEditor()
          : _distancePreview(),
    );
  }

  Widget _distancePreview() {
    return Column(
      children: _distanceRanges.map((r) {
        final minD = (r['minDistance'] as num).toInt();
        final maxD = (r['maxDistance'] as num).toInt();
        final fee = (r['baseFee'] as num).toInt();
        final range = maxD == -1 ? '${minD}km 以上' : '$minD - $maxD km';
        return Padding(
          padding: const EdgeInsets.only(bottom: DT.sm),
          child: Row(
            children: [
              Expanded(
                child: Text(range,
                    style: DT.bodySmall.copyWith(color: DT.textSecondary)),
              ),
              Text(fee == 0 ? '免费' : '¥$fee',
                  style: DT.monospace.copyWith(
                      color: fee == 0 ? DT.success : DT.primary)),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _distanceEditor() {
    return Column(
      children: [
        ..._distanceRanges.asMap().entries.map((e) {
          final i = e.key;
          final r = e.value;
          return Padding(
            padding: const EdgeInsets.only(bottom: DT.sm),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: _smallInput(
                    '最小(km)',
                    r['minDistance'].toString(),
                    (v) =>
                        _distanceRanges[i]['minDistance'] =
                            double.tryParse(v) ?? 0,
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6),
                  child: Text(' - ',
                      style: TextStyle(color: DT.textMuted)),
                ),
                Expanded(
                  flex: 3,
                  child: _smallInput(
                    '最大(km)',
                    r['maxDistance'] == -1
                        ? '不限'
                        : r['maxDistance'].toString(),
                    (v) =>
                        _distanceRanges[i]['maxDistance'] =
                            double.tryParse(v) ?? -1,
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  flex: 3,
                  child: _smallInput(
                    '费用(¥)',
                    r['baseFee'].toString(),
                    (v) =>
                        _distanceRanges[i]['baseFee'] =
                            double.tryParse(v) ?? 0,
                  ),
                ),
                GestureDetector(
                  onTap: () =>
                      setState(() => _distanceRanges.removeAt(i)),
                  child: const Padding(
                    padding: EdgeInsets.only(left: 4),
                    child: Icon(CupertinoIcons.trash,
                        size: 18, color: DT.error),
                  ),
                ),
              ],
            ),
          );
        }),
        const SizedBox(height: DT.sm),
        GestureDetector(
          onTap: () => setState(() {
            _distanceRanges.add({
              'minDistance': 0,
              'maxDistance': -1,
              'baseFee': 0,
            });
          }),
          child: Container(
            width: double.infinity,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              border: Border.all(
                  color: DT.primary.withValues(alpha: 0.3),
                  width: 1,
                  strokeAlign: BorderSide.strokeAlignInside),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text('+ 添加区间',
                style: DT.bodySmall.copyWith(
                    color: DT.primary, fontWeight: FontWeight.w600)),
          ),
        ),
      ],
    );
  }

  // ──── 时段/节假日附加费 ────

  Widget _timeFeeCard() {
    final editing = _editingModule == 'time';
    return _sectionCard(
      title: '时段/节假日附加费',
      trailing: editing ? null : _editButton('time'),
      child: editing
          ? Column(
              children: [
                _feeInput('夜间附加费 (18:00-08:00)', _nightFee,
                    (v) => setState(() => _nightFee = v)),
                const SizedBox(height: DT.md),
                _feeInput('节假日附加费', _holidayFee,
                    (v) => setState(() => _holidayFee = v)),
              ],
            )
          : Column(
              children: [
                _feePreviewRow('夜间附加费 (18:00-08:00)', _nightFee),
                const SizedBox(height: DT.sm),
                _feePreviewRow('节假日附加费', _holidayFee),
              ],
            ),
    );
  }

  Widget _feePreviewRow(String label, double fee) {
    return Row(
      children: [
        Expanded(
          child: Text(label,
              style:
                  DT.bodySmall.copyWith(color: DT.textSecondary)),
        ),
        Text('¥${fee.toInt()}',
            style: DT.monospace.copyWith(color: DT.primary)),
      ],
    );
  }

  Widget _feeInput(
      String label, double value, ValueChanged<double> onChanged) {
    return Row(
      children: [
        Expanded(
          child: Text(label,
              style: DT.bodySmall.copyWith(color: DT.textSecondary)),
        ),
        SizedBox(
          width: 90,
          child: Container(
            height: 40,
            padding: const EdgeInsets.symmetric(horizontal: DT.md),
            decoration: BoxDecoration(
              color: DT.bg.withValues(alpha: 0.72),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Text('¥',
                    style: DT.bodyMedium.copyWith(
                        color: DT.textTertiary)),
                Expanded(
                  child: TextField(
                    controller: TextEditingController(
                        text: value.toStringAsFixed(0)),
                    keyboardType: TextInputType.number,
                    style: DT.monospace.copyWith(
                        color: DT.textPrimary),
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.only(left: 4),
                      isDense: true,
                    ),
                    onChanged: (v) =>
                        onChanged(double.tryParse(v) ?? value),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ──── 编辑按钮 ────

  Widget _editButton(String module) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.lightImpact();
        setState(() => _editingModule = module);
      },
      child: Container(
        constraints: const BoxConstraints(minHeight: 36),
        padding: const EdgeInsets.symmetric(horizontal: DT.md),
        decoration: BoxDecoration(
          color: DT.primarySoft,
          borderRadius: BorderRadius.circular(DT.rFull),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(CupertinoIcons.pencil,
                size: 13, color: DT.primary),
            const SizedBox(width: 4),
            Text('编辑',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: DT.primary,
                  height: 1.4,
                )),
          ],
        ),
      ),
    );
  }

  // ──── 保存按钮（编辑模式底部） ────

  Widget _saveSurface(double bottomPad) {
    return GlassContainer(
      tint: Colors.black,
      blur: DT.glassBlurHeavy,
      opacity: 0.48,
      borderRadius: 0,
      showBorder: false,
      padding:
          EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl, bottomPad + DT.md),
      child: Row(
        children: [
          // 取消编辑
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () {
                HapticFeedback.lightImpact();
                setState(() => _editingModule = null);
              },
              child: Container(
                height: 50,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: DT.bgWarm,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text('取消',
                    style: DT.bodyMedium.copyWith(
                        color: DT.textSecondary,
                        fontWeight: FontWeight.w600)),
              ),
            ),
          ),
          const SizedBox(width: DT.md),
          // 保存
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _saving
                  ? null
                  : () async {
                      HapticFeedback.mediumImpact();
                      await _save();
                      if (mounted) {
                        setState(() => _editingModule = null);
                      }
                    },
              child: Container(
                height: 50,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: _saving
                      ? DT.cream.withValues(alpha: 0.5)
                      : DT.cream,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: DT.shadowButton,
                ),
                child: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: DT.onCream),
                      )
                    : Text('保存设置',
                        style: DT.bodyMedium.copyWith(
                            color: DT.onCream,
                            fontWeight: FontWeight.w700)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ──── 通用 section 卡片 ────

  Widget _sectionCard({
    String? title,
    Widget? trailing,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(DT.lg),
      decoration: BoxDecoration(
        color: DT.surface.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(DT.rCard),
        boxShadow: DT.shadowTile,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null)
            Padding(
              padding: const EdgeInsets.only(bottom: DT.md),
              child: Row(
                children: [
                  Expanded(
                    child: Text(title, style: DT.titleSmall),
                  ),
                  if (trailing != null) trailing,
                ],
              ),
            ),
          child,
        ],
      ),
    );
  }

  Widget _smallInput(
      String hint, String initial, ValueChanged<String> onChanged) {
    return SizedBox(
      height: 36,
      child: TextField(
        controller: TextEditingController(text: initial),
        keyboardType: TextInputType.number,
        style: DT.bodySmall.copyWith(color: DT.textPrimary),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(fontSize: 12, color: DT.textMuted),
          contentPadding: const EdgeInsets.symmetric(horizontal: 10),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide(color: DT.border),
          ),
          isDense: true,
        ),
        onChanged: onChanged,
      ),
    );
  }
}
