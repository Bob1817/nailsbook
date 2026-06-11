import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/nb_toast.dart';
import '../auth/technician_auth_models.dart';
import '../auth/technician_auth_service.dart';

const _dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const _dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const _calendarWeekLabels = ['日', '一', '二', '三', '四', '五', '六'];

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
  String _startTime = '10:00';
  String _endTime = '21:00';
  final Set<String> _enabledDays = {..._dayKeys};
  final List<String> _restDays = [];
  String _schemeId = 'default';
  String _schemeLabel = '默认服务时间';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      final profile = await TechnicianAuthService(api).getProfile();
      if (!mounted) return;
      setState(() {
        _initSchedule(profile);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _initSchedule(TechnicianProfile profile) {
    final raw = profile.serviceSchedule;
    _enabledDays
      ..clear()
      ..addAll(_dayKeys);
    _restDays.clear();
    _startTime = '10:00';
    _endTime = '21:00';
    _schemeId = 'default';
    _schemeLabel = '默认服务时间';

    final rest = raw?['restDays'];
    if (rest is List) {
      _restDays
        ..addAll(rest.map((e) => e.toString()))
        ..sort();
    }

    final schemes = raw?['schemes'];
    if (schemes is List && schemes.isNotEmpty) {
      final activeId = raw?['activeSchemeId']?.toString();
      final scheme = schemes.whereType<Map<String, dynamic>>().firstWhere(
            (item) => item['id']?.toString() == activeId,
            orElse: () => schemes.whereType<Map<String, dynamic>>().first,
          );
      _schemeId = scheme['id']?.toString() ?? _schemeId;
      _schemeLabel = scheme['label']?.toString() ?? _schemeLabel;
      _startTime = scheme['startTime']?.toString() ?? _startTime;
      _endTime = scheme['endTime']?.toString() ?? _endTime;
      final days = scheme['days'];
      if (days is List) {
        _enabledDays
          ..clear()
          ..addAll(days.map((e) => e.toString()).where(_dayKeys.contains));
      }
      return;
    }

    final days = raw?['days'];
    if (days is Map) {
      _enabledDays.clear();
      for (final key in _dayKeys) {
        final day = days[key];
        if (day is Map && day['enabled'] == true) {
          _enabledDays.add(key);
          _startTime = day['startTime']?.toString() ?? _startTime;
          _endTime = day['endTime']?.toString() ?? _endTime;
        }
      }
    }
  }

  Map<String, dynamic> _buildSchedulePayload() {
    return {
      'schemes': [
        {
          'id': _schemeId,
          'label': _schemeLabel,
          'startTime': _startTime,
          'endTime': _endTime,
          'days': _dayKeys.where(_enabledDays.contains).toList(),
        }
      ],
      'activeSchemeId': _schemeId,
      'restDays': [..._restDays]..sort(),
    };
  }

  Future<void> _save() async {
    if (_enabledDays.isEmpty) {
      NbToast.error(context, '请至少开启一天服务时间');
      return;
    }
    HapticFeedback.mediumImpact();
    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>()..setRole('technician');
      await TechnicianAuthService(api)
          .updateProfile({'serviceSchedule': _buildSchedulePayload()});
      if (mounted) NbToast.success(context, '服务时间已保存');
    } catch (_) {
      if (mounted) NbToast.error(context, '保存失败，请重试');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

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
                      DT.xl, topPad + 76, DT.xl, bottomPad + 116),
                  children: [
                    _summaryCard(),
                    const SizedBox(height: DT.lg),
                    _timeCard(),
                    const SizedBox(height: DT.lg),
                    _weekCard(),
                    const SizedBox(height: DT.lg),
                    _restDayCard(),
                  ],
                ),
                Positioned(left: 0, right: 0, top: 0, child: _header(topPad)),
                Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: _saveSurface(bottomPad)),
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

  Widget _summaryCard() {
    final days = _dayKeys.where(_enabledDays.contains).length;
    return Container(
      padding: const EdgeInsets.all(DT.lg),
      decoration: BoxDecoration(
        color: DT.surface.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(DT.rCard),
        boxShadow: DT.shadowTile,
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: DT.primarySoft,
              borderRadius: BorderRadius.circular(16),
            ),
            child:
                const Icon(CupertinoIcons.alarm, size: 24, color: DT.primary),
          ),
          const SizedBox(width: DT.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('客户仅能在你开放的时间内预约',
                    style: DT.titleSmall.copyWith(color: DT.textPrimary)),
                const SizedBox(height: 4),
                Text(
                  '$days 天开放 · $_startTime - $_endTime · ${_restDays.length} 个指定休息日',
                  style: DT.bodySmall.copyWith(color: DT.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _timeCard() {
    return _section(
      title: '服务时间',
      trailing:
          Text('默认方案', style: DT.captionLarge.copyWith(color: DT.textTertiary)),
      child: Row(
        children: [
          Expanded(
            child: _timeTile(
              label: '开始',
              value: _startTime,
              onTap: () => _pickTime(
                value: _startTime,
                onChanged: (value) => setState(() => _startTime = value),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: DT.sm),
            child:
                Text('至', style: DT.bodySmall.copyWith(color: DT.textTertiary)),
          ),
          Expanded(
            child: _timeTile(
              label: '结束',
              value: _endTime,
              onTap: () => _pickTime(
                value: _endTime,
                onChanged: (value) => setState(() => _endTime = value),
              ),
            ),
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
        padding: const EdgeInsets.symmetric(horizontal: DT.md, vertical: DT.sm),
        decoration: BoxDecoration(
          color: DT.bg.withValues(alpha: 0.72),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(label, style: DT.captionLarge.copyWith(color: DT.textMuted)),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: DT.textPrimary,
                height: 1.1,
                fontFeatures: [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _weekCard() {
    return _section(
      title: '重复',
      trailing: Text('${_enabledDays.length}/7',
          style: DT.captionLarge.copyWith(color: DT.textTertiary)),
      child: Column(
        children: [
          for (var i = 0; i < _dayKeys.length; i++) ...[
            _dayRow(_dayKeys[i], _dayLabels[i]),
            if (i < _dayKeys.length - 1)
              Divider(height: 1, color: Colors.white.withValues(alpha: 0.06)),
          ],
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
                style: DT.titleSmall
                    .copyWith(color: enabled ? DT.textPrimary : DT.textMuted)),
          ),
          Text(
            enabled ? '$_startTime - $_endTime' : '休息',
            style: DT.bodySmall
                .copyWith(color: enabled ? DT.textSecondary : DT.textMuted),
          ),
          const SizedBox(width: DT.md),
          CupertinoSwitch(
            value: enabled,
            activeTrackColor: DT.primary,
            inactiveTrackColor: DT.bgWarm,
            thumbColor: DT.cream,
            onChanged: (value) {
              HapticFeedback.selectionClick();
              setState(() {
                if (value) {
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

  Widget _restDayCard() {
    return _section(
      title: '指定休息日',
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
          ? Text('暂无指定休息日',
              style: DT.bodySmall.copyWith(color: DT.textTertiary))
          : Wrap(
              spacing: DT.sm,
              runSpacing: DT.sm,
              children: _restDays.map(_restDayChip).toList(),
            ),
    );
  }

  Widget _restDayChip(String date) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _restDays.remove(date));
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
            Text(date,
                style: DT.captionLarge.copyWith(color: DT.textSecondary)),
            const SizedBox(width: 6),
            const Icon(CupertinoIcons.xmark, size: 12, color: DT.textTertiary),
          ],
        ),
      ),
    );
  }

  Widget _section({
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

  Widget _saveSurface(double bottomPad) {
    final disabled = _saving || _enabledDays.isEmpty;
    return GlassContainer(
      tint: Colors.black,
      blur: DT.glassBlurHeavy,
      opacity: 0.48,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl, bottomPad + DT.md),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: disabled ? null : _save,
        child: Container(
          height: 52,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: disabled ? DT.cream.withValues(alpha: 0.42) : DT.cream,
            borderRadius: BorderRadius.circular(18),
            boxShadow: disabled ? null : DT.shadowButton,
          ),
          child: _saving
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: DT.onCream),
                )
              : Text('保存',
                  style: DT.bodyLarge.copyWith(
                    color: disabled
                        ? DT.onCream.withValues(alpha: 0.42)
                        : DT.onCream,
                    fontWeight: FontWeight.w700,
                  )),
        ),
      ),
    );
  }

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
            child: CupertinoDatePicker(
              mode: CupertinoDatePickerMode.time,
              initialDateTime: DateTime(2026, 1, 1, hour, minute),
              use24hFormat: true,
              minuteInterval: 30,
              onDateTimeChanged: (date) {
                temp = TimeOfDay(hour: date.hour, minute: date.minute);
              },
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

  void _openRestDaySheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RestDaySheet(
        initialDates: _restDays,
        onConfirm: (dates) {
          setState(() {
            _restDays
              ..clear()
              ..addAll(dates..sort());
          });
        },
      ),
    );
  }
}

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
      padding: EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl, bottomPad + DT.md),
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
                      textAlign: TextAlign.center, style: DT.titleMedium)),
              _sheetButton('完成', onConfirm),
            ],
          ),
          child,
        ],
      ),
    );
  }

  Widget _sheetButton(String label, VoidCallback onTap, {bool muted = false}) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 44, minWidth: 56),
        alignment: Alignment.center,
        child: Text(label,
            style: DT.bodyMedium.copyWith(
                color: muted ? DT.textSecondary : DT.primary,
                fontWeight: FontWeight.w600)),
      ),
    );
  }
}

class _RestDaySheet extends StatefulWidget {
  final List<String> initialDates;
  final ValueChanged<List<String>> onConfirm;

  const _RestDaySheet({
    required this.initialDates,
    required this.onConfirm,
  });

  @override
  State<_RestDaySheet> createState() => _RestDaySheetState();
}

class _RestDaySheetState extends State<_RestDaySheet> {
  late final Set<String> _selected = {...widget.initialDates};
  DateTime _viewMonth = DateTime(DateTime.now().year, DateTime.now().month);

  String _dateKey(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

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
        borderRadius: BorderRadius.vertical(top: Radius.circular(DT.rCard)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl, DT.sm),
            child: Row(
              children: [
                _monthButton(CupertinoIcons.chevron_left, () {
                  setState(() => _viewMonth =
                      DateTime(_viewMonth.year, _viewMonth.month - 1));
                }),
                Expanded(
                  child: Text('${_viewMonth.year}年${_viewMonth.month}月',
                      textAlign: TextAlign.center, style: DT.titleMedium),
                ),
                _monthButton(CupertinoIcons.chevron_right, () {
                  setState(() => _viewMonth =
                      DateTime(_viewMonth.year, _viewMonth.month + 1));
                }),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: DT.xl),
            child: Row(
              children: _calendarWeekLabels
                  .map((label) => Expanded(
                        child: SizedBox(
                          height: 32,
                          child: Center(
                              child: Text(label,
                                  style: DT.captionLarge
                                      .copyWith(color: DT.textMuted))),
                        ),
                      ))
                  .toList(),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(DT.xl, 0, DT.xl, DT.lg),
            child: _calendarGrid(),
          ),
          Padding(
            padding:
                EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl, bottomPad + DT.md),
            child: Row(
              children: [
                Expanded(
                  child: _sheetAction('取消', () => Navigator.pop(context),
                      muted: true),
                ),
                const SizedBox(width: DT.md),
                Expanded(
                  child: _sheetAction('设置为休息日', () {
                    widget.onConfirm(_selected.toList());
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
    final first = DateTime(_viewMonth.year, _viewMonth.month, 1);
    final daysInMonth = DateTime(_viewMonth.year, _viewMonth.month + 1, 0).day;
    final leading = first.weekday % 7;
    final cells = <Widget>[
      for (var i = 0; i < leading; i++) const SizedBox(height: 44),
      for (var day = 1; day <= daysInMonth; day++)
        _dateCell(DateTime(_viewMonth.year, _viewMonth.month, day)),
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

  Widget _sheetAction(String label, VoidCallback onTap, {bool muted = false}) {
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
