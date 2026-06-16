
import '../../../core/widgets/glass_container.dart';
import '../auth/technician_auth_models.dart';
import '../auth/technician_auth_service.dart';

const _dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const _dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// ────────────────────────────────────────────────────────────────────
// 时间方案数据模型
// ────────────────────────────────────────────────────────────────────

class _Scheme {
  final String id;
  final String label;
  final String startTime;
  final String endTime;
  final List<String> days;

  const _Scheme({
    required this.id,
    required this.label,
    required this.startTime,
    required this.endTime,
    required this.days,
  });

  _Scheme copyWith({
    String? id,
    String? label,
    String? startTime,
    String? endTime,
    List<String>? days,
  }) {
    return _Scheme(
      id: id ?? this.id,
      label: label ?? this.label,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      days: days ?? [...this.days],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'startTime': startTime,
        'endTime': endTime,
        'days': days,
      };
}

// ════════════════════════════════════════════════════════════════════
// 主页面：参照 iPhone 闹钟页面，进入后看到设置内容列表
//
// 两个分区：
//   1. 休息日 —— 弹出日历多选，保存后同步到预约日历
//   2. 时间方案 —— 可自定义命名、设置多个（仅一个生效）
//      新增/编辑借鉴 iPhone 闹钟新增交互
//      支持左滑删除或进入方案编辑页删除
// ════════════════════════════════════════════════════════════════════

class TechnicianServiceTimeScreen extends StatefulWidget {
  const TechnicianServiceTimeScreen({super.key});

  @override
  State<TechnicianServiceTimeScreen> createState() =>
      _TechnicianServiceTimeScreenState();
}

class _TechnicianServiceTimeScreenState
    extends State<TechnicianServiceTimeScreen> {
  bool _loading = true;
  bool _saving = false;
  List<_Scheme> _schemes = [];
  String _activeSchemeId = '';
  List<String> _restDays = [];
  // 解析时若剔除了过期休息日，则置位，加载后持久化清理结果。
  bool _prunedRestDays = false;

  // ──── 生命周期 ────

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      final profile = await TechnicianAuthService(api).getProfile();
      if (!mounted) return;
      setState(() {
        _parseSchedule(profile);
        _loading = false;
      });
      // 过期休息日已在解析时剔除，若确有变化则同步到后端。
      if (_prunedRestDays) {
        _prunedRestDays = false;
        _save();
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _parseSchedule(TechnicianProfile profile) {
    final raw = profile.serviceSchedule;
    _schemes = [];
    _restDays = [];
    _activeSchemeId = '';

    // ---- 解析方案列表 ----
    final schemes = raw?['schemes'];
    if (schemes is List && schemes.isNotEmpty) {
      _activeSchemeId = raw?['activeSchemeId']?.toString() ?? '';
      for (final item in schemes) {
        if (item is Map<String, dynamic>) {
          _schemes.add(_Scheme(
            id: item['id']?.toString() ?? '',
            label: item['label']?.toString() ?? '方案',
            startTime: item['startTime']?.toString() ?? '10:00',
            endTime: item['endTime']?.toString() ?? '21:00',
            days: (item['days'] as List?)
                    ?.map((e) => e.toString())
                    .where(_dayKeys.contains)
                    .toList() ??
                [..._dayKeys],
          ));
        }
      }
      if (_schemes.isNotEmpty &&
          !_schemes.any((s) => s.id == _activeSchemeId)) {
        _activeSchemeId = _schemes.first.id;
      }
    }

    // ---- 旧格式兼容 ----
    if (_schemes.isEmpty) {
      final days = raw?['days'];
      if (days is Map) {
        final enabled = <String>[];
        String start = '10:00', end = '21:00';
        for (final key in _dayKeys) {
          final day = days[key];
          if (day is Map && day['enabled'] == true) {
            enabled.add(key);
            start = day['startTime']?.toString() ?? start;
            end = day['endTime']?.toString() ?? end;
          }
        }
        if (enabled.isNotEmpty) {
          _schemes.add(_Scheme(
            id: 'default',
            label: '默认服务时间',
            startTime: start,
            endTime: end,
            days: enabled,
          ));
          _activeSchemeId = 'default';
        }
      }
    }

    // 最终兜底
    if (_schemes.isEmpty) {
      _schemes.add(const _Scheme(
        id: 'default',
        label: '默认服务时间',
        startTime: '10:00',
        endTime: '21:00',
        days: [..._dayKeys],
      ));
      _activeSchemeId = 'default';
    }

    // ---- 解析休息日 ----
    final rest = raw?['restDays'];
    if (rest is List) {
      final all = rest.map((e) => e.toString()).toList();
      // 过期（早于今天）的休息日自动移除，不再展示。
      _restDays = all.where(_notExpiredRestDay).toList()..sort();
      if (_restDays.length != all.length) _prunedRestDays = true;
    }
  }

  /// 休息日是否未过期（今天或将来）。非法日期视为过期一并清除。
  static bool _notExpiredRestDay(String dateStr) {
    final d = DateTime.tryParse(dateStr);
    if (d == null) return false;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return !DateTime(d.year, d.month, d.day).isBefore(today);
  }

  // ──── 数据持久化 ────

  Map<String, dynamic> _buildPayload() {
    return {
      'schemes': _schemes.map((s) => s.toJson()).toList(),
      'activeSchemeId': _activeSchemeId,
      'restDays': [..._restDays]..sort(),
    };
  }

  Future<void> _save() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      await TechnicianAuthService(api)
          .updateProfile({'serviceSchedule': _buildPayload()});
    } catch (_) {
      if (mounted) NbToast.error(context, '保存失败，请重试');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  // ──── 方案操作 ────

  Future<void> _onAddScheme() async {
    HapticFeedback.lightImpact();
    final newScheme = _Scheme(
      id: 's_${DateTime.now().millisecondsSinceEpoch}',
      label: '方案 ${_schemes.length + 1}',
      startTime: '10:00',
      endTime: '21:00',
      days: [..._dayKeys],
    );
    final result = await Navigator.push<_Scheme>(
      context,
      MaterialPageRoute(builder: (_) => _SchemeEditScreen(scheme: newScheme)),
    );
    if (result != null && mounted) {
      setState(() => _schemes.add(result));
      _save();
    }
  }

  void _onToggleScheme(int index) {
    HapticFeedback.selectionClick();
    setState(() => _activeSchemeId = _schemes[index].id);
    _save();
  }

  Future<void> _onDeleteScheme(int index) async {
    HapticFeedback.mediumImpact();
    final scheme = _schemes[index];
    setState(() {
      _schemes.removeAt(index);
      if (_activeSchemeId == scheme.id && _schemes.isNotEmpty) {
        _activeSchemeId = _schemes.first.id;
      }
    });
    _save();
    if (mounted) NbToast.success(context, '已删除「${scheme.label}」');
  }

  Future<void> _onEditScheme(int index) async {
    final result = await Navigator.push<_Scheme>(
      context,
      MaterialPageRoute(
          builder: (_) => _SchemeEditScreen(scheme: _schemes[index])),
    );
    if (result != null && mounted) {
      setState(() => _schemes[index] = result);
      _save();
    }
  }

  // ──── 休息日操作 ────

  void _openRestDaySheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RestDaySheet(
        initialDates: _restDays.map(_parseDate).whereType<DateTime>().toList(),
        onConfirm: (dates) {
          setState(() {
            _restDays = dates.map(_dateKey).toList()..sort();
          });
          _save();
          NbToast.success(context, '休息日已保存');
        },
      ),
    );
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
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : Stack(
              children: [
                ListView(
                  padding: EdgeInsets.fromLTRB(
                      DT.xl, topPad + 76, DT.xl, bottomPad + DT.xxxl),
                  children: [
                    _restDaySection(),
                    const SizedBox(height: DT.lg),
                    _schemeSection(),
                  ],
                ),
                Positioned(left: 0, right: 0, top: 0, child: _header(topPad)),
              ],
            ),
    );
  }

  // ──── 顶部导航栏 ────

  Widget _header(double topPad) {
    return GlassContainer(
      tint: Colors.black,
      blur: DT.glassBlurHeavy,
      opacity: 0.52,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.fromLTRB(DT.sm, topPad + DT.xs, DT.xl, DT.sm),
      child: Row(
        children: [
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
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
                  size: 18, color: DT.textPrimary),
            ),
          ),
          const SizedBox(width: DT.md),
          const Expanded(child: Text('服务时间设置', style: DT.titleLarge)),
        ],
      ),
    );
  }

  // ──── 第一部分：休息日 ────

  Widget _restDaySection() {
    return _sectionCard(
      title: '休息日',
      trailing: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: _openRestDaySheet,
        child: Container(
          constraints: const BoxConstraints(minHeight: 36),
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: DT.md),
          decoration: BoxDecoration(
            color: DT.primarySoft,
            borderRadius: BorderRadius.circular(DT.rFull),
          ),
          child: Text('设置',
              style: DT.captionLarge
                  .copyWith(color: DT.primary, fontWeight: FontWeight.w600)),
        ),
      ),
      child: _restDays.isEmpty
          ? SizedBox(
              height: 52,
              child: Center(
                child: Text('暂无休息日，点击上方设置',
                    style: DT.bodySmall.copyWith(color: DT.textTertiary)),
              ),
            )
          : Wrap(
              spacing: DT.sm,
              runSpacing: DT.sm,
              children: _restDays.map(_restDayChip).toList(),
            ),
    );
  }

  Widget _restDayChip(String dateStr) {
    final date = _parseDate(dateStr);
    final display = date != null
        ? '${date.month}月${date.day}日'
        : dateStr;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _restDays.remove(dateStr));
        _save();
      },
      child: Container(
        constraints: const BoxConstraints(minHeight: 36),
        padding: const EdgeInsets.symmetric(horizontal: DT.md, vertical: DT.sm),
        decoration: BoxDecoration(
          color: DT.bg.withValues(alpha: 0.72),
          borderRadius: BorderRadius.circular(DT.rFull),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(display,
                style: DT.captionLarge.copyWith(color: DT.textSecondary)),
            const SizedBox(width: 6),
            const Icon(CupertinoIcons.xmark, size: 12, color: DT.textTertiary),
          ],
        ),
      ),
    );
  }

  // ──── 第二部分：时间方案 ────

  Widget _schemeSection() {
    final activeCount =
        _schemes.where((s) => s.id == _activeSchemeId).length;
    return _sectionCard(
      title: '时间设置',
      trailing: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: _onAddScheme,
        child: Container(
          width: 36,
          height: 36,
          alignment: Alignment.center,
          decoration: const BoxDecoration(
            color: DT.primarySoft,
            shape: BoxShape.circle,
          ),
          child: const Icon(CupertinoIcons.plus,
              size: 18, color: DT.primary),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${_schemes.length} 个方案 · $activeCount 个生效中',
              style: DT.captionLarge.copyWith(color: DT.textTertiary)),
          const SizedBox(height: DT.md),
          if (_schemes.isEmpty)
            SizedBox(
              height: 64,
              child: Center(
                child: Text('暂无方案，点击右上角 + 添加',
                    style: DT.bodySmall.copyWith(color: DT.textTertiary)),
              ),
            )
          else
            ...List.generate(_schemes.length, (i) {
              final isLast = i == _schemes.length - 1;
              return Column(
                children: [
                  _schemeTile(i),
                  if (!isLast)
                    Divider(
                        height: 1,
                        color: Colors.white.withValues(alpha: 0.06)),
                ],
              );
            }),
        ],
      ),
    );
  }

  Widget _schemeTile(int index) {
    final scheme = _schemes[index];
    final isActive = scheme.id == _activeSchemeId;
    final dayCount = scheme.days.length;

    return Dismissible(
      key: ValueKey(scheme.id),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) async {
        return await showDialog<bool>(
          context: context,
          builder: (ctx) => CupertinoAlertDialog(
            title: const Text('删除方案'),
            content: Text('确定删除「${scheme.label}」吗？'),
            actions: [
              CupertinoDialogAction(
                  child: const Text('取消'),
                  onPressed: () => Navigator.pop(ctx, false)),
              CupertinoDialogAction(
                  isDestructiveAction: true,
                  child: const Text('删除'),
                  onPressed: () => Navigator.pop(ctx, true)),
            ],
          ),
        );
      },
      onDismissed: (_) => _onDeleteScheme(index),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: DT.xl),
        decoration: BoxDecoration(
          color: DT.error.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(DT.rMd),
        ),
        child: const Text('删除',
            style: TextStyle(
                color: DT.error,
                fontWeight: FontWeight.w600,
                fontSize: 15)),
      ),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => _onEditScheme(index),
        child: Container(
          constraints: const BoxConstraints(minHeight: 72),
          padding: const EdgeInsets.symmetric(vertical: DT.md),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(scheme.label,
                              style: DT.titleSmall.copyWith(
                                color: isActive
                                    ? DT.textPrimary
                                    : DT.textMuted,
                              ),
                              overflow: TextOverflow.ellipsis),
                        ),
                        if (isActive) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: DT.primarySoft,
                              borderRadius:
                                  BorderRadius.circular(DT.rFull),
                            ),
                            child: const Text('生效中',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: DT.primary,
                                  height: 1.4,
                                )),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${scheme.startTime} - ${scheme.endTime} · $dayCount天/周',
                      style: DT.bodySmall.copyWith(
                          color: isActive
                              ? DT.textSecondary
                              : DT.textMuted),
                    ),
                  ],
                ),
              ),
              CupertinoSwitch(
                value: isActive,
                activeTrackColor: DT.primary,
                inactiveTrackColor: DT.bgWarm,
                thumbColor: DT.cream,
                onChanged: (_) => _onToggleScheme(index),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ──── 通用 section 卡片 ────

  Widget _sectionCard({
    required String title,
    required Widget child,
    Widget? trailing,
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
          Row(
            children: [
              Expanded(child: Text(title, style: DT.titleMedium)),
              if (trailing != null) trailing,
            ],
          ),
          const SizedBox(height: DT.md),
          child,
        ],
      ),
    );
  }

  // ──── 日期工具 ────

  static String _dateKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  static DateTime? _parseDate(String s) {
    try {
      return DateTime.parse(s);
    } catch (_) {
      return null;
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// 方案编辑页（借鉴 iPhone 闹钟新增交互）
//
// 包含：方案名称 / 时间范围 / 重复日期
// 时间选择器已修复黄色下划线（显式指定 CupertinoTheme textTheme）
// ════════════════════════════════════════════════════════════════════

class _SchemeEditScreen extends StatefulWidget {
  final _Scheme scheme;
  const _SchemeEditScreen({required this.scheme});

  @override
  State<_SchemeEditScreen> createState() => _SchemeEditScreenState();
}

class _SchemeEditScreenState extends State<_SchemeEditScreen> {
  late String _label;
  late String _startTime;
  late String _endTime;
  late Set<String> _enabledDays;
  final _nameCtl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _label = widget.scheme.label;
    _startTime = widget.scheme.startTime;
    _endTime = widget.scheme.endTime;
    _enabledDays = {...widget.scheme.days};
    _nameCtl.text = _label;
  }

  @override
  void dispose() {
    _nameCtl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: DT.bg,
      body: Stack(
        children: [
          ListView(
            padding: EdgeInsets.fromLTRB(
                DT.xl, topPad + 76, DT.xl, bottomPad + DT.xxxl),
            children: [
              _nameField(),
              const SizedBox(height: DT.lg),
              _timeCard(),
              const SizedBox(height: DT.lg),
              _repeatCard(),
            ],
          ),
          Positioned(
              left: 0, right: 0, top: 0, child: _header(topPad)),
        ],
      ),
    );
  }

  Widget _header(double topPad) {
    return GlassContainer(
      tint: Colors.black,
      blur: DT.glassBlurHeavy,
      opacity: 0.52,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.fromLTRB(DT.sm, topPad + DT.xs, DT.sm, DT.sm),
      child: Row(
        children: [
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
            child: Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              child: Text('取消',
                  style: DT.bodyMedium.copyWith(color: DT.textSecondary)),
            ),
          ),
          const Expanded(
            child: Text('编辑方案',
                textAlign: TextAlign.center, style: DT.titleMedium),
          ),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: _onSave,
            child: Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              child: Text('完成',
                  style: DT.bodyMedium.copyWith(
                      color: DT.primary, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }

  void _onSave() {
    HapticFeedback.mediumImpact();
    final label = _nameCtl.text.trim();
    if (label.isEmpty) {
      NbToast.error(context, '请输入方案名称');
      return;
    }
    Navigator.pop(
        context,
        widget.scheme.copyWith(
          label: label,
          startTime: _startTime,
          endTime: _endTime,
          days: _dayKeys.where(_enabledDays.contains).toList(),
        ));
  }

  // ──── 方案名称 ────

  Widget _nameField() {
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
          const Text('方案名称', style: DT.titleMedium),
          const SizedBox(height: DT.md),
          Container(
            padding: const EdgeInsets.symmetric(
                horizontal: DT.md, vertical: DT.sm),
            decoration: BoxDecoration(
              color: DT.bg.withValues(alpha: 0.72),
              borderRadius: BorderRadius.circular(18),
            ),
            child: TextField(
              controller: _nameCtl,
              style: DT.bodyLarge.copyWith(color: DT.textPrimary),
              decoration: const InputDecoration(
                hintText: '例如：工作日、周末班',
                hintStyle: TextStyle(color: DT.textMuted, fontSize: 16),
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ──── 时间范围 ────

  Widget _timeCard() {
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
          const Text('服务时间', style: DT.titleMedium),
          const SizedBox(height: DT.md),
          Row(
            children: [
              Expanded(
                child: _timeTile(
                  label: '开始',
                  value: _startTime,
                  onTap: () => _pickTime(
                    value: _startTime,
                    onChanged: (v) => setState(() => _startTime = v),
                  ),
                ),
              ),
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: DT.sm),
                child: Text('至',
                    style: DT.bodySmall
                        .copyWith(color: DT.textTertiary)),
              ),
              Expanded(
                child: _timeTile(
                  label: '结束',
                  value: _endTime,
                  onTap: () => _pickTime(
                    value: _endTime,
                    onChanged: (v) => setState(() => _endTime = v),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _timeTile({
    required String label,
    required String value,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 74),
        padding: const EdgeInsets.symmetric(
            horizontal: DT.md, vertical: DT.sm),
        decoration: BoxDecoration(
          color: DT.bg.withValues(alpha: 0.72),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(label,
                style: DT.captionLarge.copyWith(color: DT.textMuted)),
            const SizedBox(height: 4),
            Text(value,
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: DT.textPrimary,
                  height: 1.1,
                  fontFeatures: [FontFeature.tabularFigures()],
                )),
          ],
        ),
      ),
    );
  }

  // ──── 重复日期 ────

  Widget _repeatCard() {
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
          Row(
            children: [
              const Expanded(
                  child: Text('重复', style: DT.titleMedium)),
              Text('${_enabledDays.length}/7',
                  style: DT.captionLarge
                      .copyWith(color: DT.textTertiary)),
            ],
          ),
          const SizedBox(height: DT.md),
          Column(
            children: [
              for (var i = 0; i < _dayKeys.length; i++) ...[
                _dayRow(_dayKeys[i], _dayLabels[i]),
                if (i < _dayKeys.length - 1)
                  Divider(
                      height: 1,
                      color:
                          Colors.white.withValues(alpha: 0.06)),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _dayRow(String key, String label) {
    final enabled = _enabledDays.contains(key);
    return Container(
      constraints: const BoxConstraints(minHeight: 58),
      child: Row(
        children: [
          Expanded(
            child: Text(label,
                style: DT.titleSmall.copyWith(
                    color: enabled ? DT.textPrimary : DT.textMuted)),
          ),
          CupertinoSwitch(
            value: enabled,
            activeTrackColor: DT.primary,
            inactiveTrackColor: DT.bgWarm,
            thumbColor: DT.cream,
            onChanged: (v) {
              HapticFeedback.selectionClick();
              setState(() {
                if (v) {
                  _enabledDays.add(key);
                } else {
                  _enabledDays.remove(key);
                }
              });
            },
          ),
        ],
      ),
    );
  }

  // ──── 时间选择器（已修复黄色下划线） ────

  Future<void> _pickTime({
    required String value,
    required ValueChanged<String> onChanged,
  }) async {
    final parts = value.split(':');
    final hour = int.tryParse(parts.first) ?? 10;
    final minute = int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0;
    final picked = await showCupertinoModalPopup<TimeOfDay>(
      context: context,
      builder: (ctx) {
        var temp = TimeOfDay(hour: hour, minute: minute);
        return _PickerSheet(
          title: '选择时间',
          onCancel: () => Navigator.pop(ctx),
          onConfirm: () => Navigator.pop(ctx, temp),
          child: SizedBox(
            height: 216,
            child: CupertinoTheme(
              data: const CupertinoThemeData(
                textTheme: CupertinoTextThemeData(
                  dateTimePickerTextStyle: TextStyle(
                    color: DT.textPrimary,
                    fontSize: 20,
                  ),
                ),
              ),
              child: CupertinoDatePicker(
                mode: CupertinoDatePickerMode.time,
                initialDateTime: DateTime(2026, 1, 1, hour, minute),
                use24hFormat: true,
                minuteInterval: 30,
                onDateTimeChanged: (date) {
                  temp =
                      TimeOfDay(hour: date.hour, minute: date.minute);
                },
              ),
            ),
          ),
        );
      },
    );
    if (picked == null) return;
    final next =
        '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
    HapticFeedback.selectionClick();
    onChanged(next);
  }
}

// ════════════════════════════════════════════════════════════════════
// 时间选择器底栏（显式指定文字颜色，避免系统黄色下划线）
// ════════════════════════════════════════════════════════════════════

class _PickerSheet extends StatelessWidget {
  final String title;
  final Widget child;
  final VoidCallback onCancel;
  final VoidCallback onConfirm;

  const _PickerSheet({
    required this.title,
    required this.child,
    required this.onCancel,
    required this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).padding.bottom;
    return Container(
      padding:
          EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl, bottomPad + DT.md),
      decoration: const BoxDecoration(
        color: DT.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(DT.rCard)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              _sheetButton('取消', onCancel, muted: true),
              Expanded(
                  child: Text(title,
                      textAlign: TextAlign.center,
                      style: DT.titleMedium)),
              _sheetButton('完成', onConfirm),
            ],
          ),
          child,
        ],
      ),
    );
  }

  Widget _sheetButton(String label, VoidCallback onTap,
      {bool muted = false}) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        constraints:
            const BoxConstraints(minHeight: 44, minWidth: 56),
        alignment: Alignment.center,
        child: Text(label,
            style: DT.bodyMedium.copyWith(
                color: muted ? DT.textSecondary : DT.primary,
                fontWeight: FontWeight.w600)),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════════
// 休息日日历多选弹窗
// ════════════════════════════════════════════════════════════════════

class _RestDaySheet extends StatefulWidget {
  final List<DateTime> initialDates;
  final ValueChanged<List<DateTime>> onConfirm;

  const _RestDaySheet({
    required this.initialDates,
    required this.onConfirm,
  });

  @override
  State<_RestDaySheet> createState() => _RestDaySheetState();
}

class _RestDaySheetState extends State<_RestDaySheet> {
  late final Set<String> _selected =
      widget.initialDates.map(_dateKey).toSet();
  DateTime _viewMonth =
      DateTime(DateTime.now().year, DateTime.now().month);

  static const _weekLabels = ['日', '一', '二', '三', '四', '五', '六'];

  String _dateKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  DateTime _parseKey(String s) => DateTime.parse(s);

  bool _isPast(DateTime date) {
    final today = DateTime.now();
    final current = DateTime(today.year, today.month, today.day);
    return date.isBefore(current);
  }

  void _toggle(DateTime date) {
    if (_isPast(date)) return;
    final key = _dateKey(date);
    HapticFeedback.selectionClick();
    setState(() {
      if (_selected.contains(key)) {
        _selected.remove(key);
      } else {
        _selected.add(key);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).padding.bottom;
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.86,
      ),
      decoration: const BoxDecoration(
        color: DT.surface,
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(DT.rCard)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ---- 标题 + 已选数量 ----
          Padding(
            padding:
                const EdgeInsets.fromLTRB(DT.xl, DT.lg, DT.xl, DT.sm),
            child: Row(
              children: [
                const Text('选择休息日', style: DT.titleMedium),
                const SizedBox(width: DT.sm),
                if (_selected.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: DT.primarySoft,
                      borderRadius:
                          BorderRadius.circular(DT.rFull),
                    ),
                    child: Text('${_selected.length} 天',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: DT.primary,
                          height: 1.4,
                        )),
                  ),
              ],
            ),
          ),

          // ---- 月份导航 ----
          Padding(
            padding:
                const EdgeInsets.fromLTRB(DT.xl, 0, DT.xl, DT.sm),
            child: Row(
              children: [
                _monthButton(CupertinoIcons.chevron_left, () {
                  setState(() => _viewMonth = DateTime(
                      _viewMonth.year, _viewMonth.month - 1));
                }),
                Expanded(
                  child: Text(
                      '${_viewMonth.year}年${_viewMonth.month}月',
                      textAlign: TextAlign.center,
                      style: DT.titleMedium),
                ),
                _monthButton(CupertinoIcons.chevron_right, () {
                  setState(() => _viewMonth = DateTime(
                      _viewMonth.year, _viewMonth.month + 1));
                }),
              ],
            ),
          ),

          // ---- 星期头 ----
          Padding(
            padding:
                const EdgeInsets.symmetric(horizontal: DT.xl),
            child: Row(
              children: _weekLabels
                  .map((label) => Expanded(
                        child: SizedBox(
                          height: 32,
                          child: Center(
                              child: Text(label,
                                  style: DT.captionLarge.copyWith(
                                      color: DT.textMuted))),
                        ),
                      ))
                  .toList(),
            ),
          ),

          // ---- 日历网格 ----
          Padding(
            padding:
                const EdgeInsets.fromLTRB(DT.xl, 0, DT.xl, DT.lg),
            child: _calendarGrid(),
          ),

          // ---- 底部操作 ----
          Padding(
            padding: EdgeInsets.fromLTRB(
                DT.xl, DT.md, DT.xl, bottomPad + DT.md),
            child: Row(
              children: [
                Expanded(
                  child: _actionButton(
                      '取消', () => Navigator.pop(context),
                      muted: true),
                ),
                const SizedBox(width: DT.md),
                Expanded(
                  child: _actionButton('确认', () {
                    HapticFeedback.mediumImpact();
                    final dates = _selected
                        .map((k) => _parseKey(k))
                        .toList()
                      ..sort();
                    widget.onConfirm(dates);
                    Navigator.pop(context);
                  }),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _monthButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: DT.bg.withValues(alpha: 0.72),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 18, color: DT.textSecondary),
      ),
    );
  }

  Widget _calendarGrid() {
    final first =
        DateTime(_viewMonth.year, _viewMonth.month, 1);
    final daysInMonth =
        DateTime(_viewMonth.year, _viewMonth.month + 1, 0).day;
    final leading = first.weekday % 7; // 0=Sun .. 6=Sat
    final cells = <Widget>[
      for (var i = 0; i < leading; i++) const SizedBox(height: 44),
      for (var day = 1; day <= daysInMonth; day++)
        _dateCell(
            DateTime(_viewMonth.year, _viewMonth.month, day)),
    ];

    return GridView.count(
      crossAxisCount: 7,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 4,
      crossAxisSpacing: 4,
      children: cells,
    );
  }

  Widget _dateCell(DateTime date) {
    final key = _dateKey(date);
    final selected = _selected.contains(key);
    final past = _isPast(date);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: past ? null : () => _toggle(date),
      child: Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? DT.cream : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(
          '${date.day}',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: past
                ? DT.textQuaternary
                : selected
                    ? DT.onCream
                    : DT.textPrimary,
          ),
        ),
      ),
    );
  }

  Widget _actionButton(String label, VoidCallback onTap,
      {bool muted = false}) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        height: 48,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: muted ? DT.bgWarm : DT.cream,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(label,
            style: DT.bodyMedium.copyWith(
                color: muted ? DT.textSecondary : DT.onCream,
                fontWeight: FontWeight.w700)),
      ),
    );
  }
}
