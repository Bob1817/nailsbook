import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/technician_auth_service.dart';
import '../auth/technician_auth_models.dart';
import '../../../core/widgets/nb_toast.dart';

const _dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const _dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

class TechnicianServiceTimeScreen extends StatefulWidget {
  const TechnicianServiceTimeScreen({super.key});

  @override
  State<TechnicianServiceTimeScreen> createState() => _TechnicianServiceTimeScreenState();
}

class _TechnicianServiceTimeScreenState extends State<TechnicianServiceTimeScreen> {
  bool _loading = true;
  bool _saving = false;
  Map<String, Map<String, dynamic>> _schedule = {};

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
      if (mounted) {
        setState(() { _loading = false; _initSchedule(p); });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _initSchedule(TechnicianProfile p) {
    final raw = (p as dynamic).serviceSchedule as Map<String, dynamic>?;
    final days = raw?['days'] as Map<String, dynamic>?;
    _schedule = {};
    for (final key in _dayKeys) {
      final d = days?[key] as Map<String, dynamic>?;
      _schedule[key] = {
        'enabled': d?['enabled'] as bool? ?? true,
        'startTime': d?['startTime']?.toString() ?? '10:00',
        'endTime': d?['endTime']?.toString() ?? '21:00',
      };
    }
  }

  Future<void> _save() async {
    HapticFeedback.mediumImpact();
    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      await TechnicianAuthService(api).updateProfile({
        'serviceSchedule': {'days': _schedule},
      });
      if (mounted) {
        NbToast.show(context, '服务时间已保存');
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
                  child: ListView(
                    padding: EdgeInsets.fromLTRB(DT.xl, 0, DT.xl, DT.xxl + bottomPad),
                    children: [
                      _buildInfoBanner(),
                      const SizedBox(height: DT.lg),
                      ..._dayKeys.asMap().entries.map((e) =>
                        _buildDayCard(e.value, _dayLabels[e.key])),
                    ],
                  ),
                ),
                _buildSaveButton(bottomPad),
              ],
            ),
    );
  }

  // ── Header ──

  Widget _buildHeader(double topPad) {
    return Padding(
      padding: EdgeInsets.fromLTRB(DT.sm, topPad + DT.xs, DT.xl, DT.sm),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: DT.surface.withValues(alpha: 0.8),
                shape: BoxShape.circle,
              ),
              child: const Icon(CupertinoIcons.back, size: 18, color: DT.textDarkGrey),
            ),
          ),
          const SizedBox(width: DT.md),
          Text('服务时间设置', style: DT.titleLarge.copyWith(fontSize: 18)),
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
        borderRadius: BorderRadius.circular(DT.rMd),
        border: Border.all(color: DT.infoBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(CupertinoIcons.info_circle, size: 20, color: DT.info),
          const SizedBox(width: DT.sm),
          Expanded(
            child: Text('设置每天的服务可用时间，客户仅能在你开启的时间段内预约',
              style: DT.bodyMedium.copyWith(color: DT.actionBlue.withValues(alpha: 0.8), height: 1.5)),
          ),
        ],
      ),
    );
  }

  // ── Day Card ──

  Widget _buildDayCard(String key, String label) {
    final day = _schedule[key]!;
    final enabled = day['enabled'] as bool;

    return Container(
      margin: const EdgeInsets.only(bottom: DT.sm),
      padding: const EdgeInsets.symmetric(horizontal: DT.lg, vertical: DT.md),
      decoration: BoxDecoration(
        color: DT.surface,
        borderRadius: BorderRadius.circular(DT.rXl),
        border: Border.all(color: DT.bg),
        boxShadow: DT.shadowSm,
      ),
      child: Row(
        children: [
          SizedBox(
            width: 40,
            child: Text(_dayLabels[_dayKeys.indexOf(key)],
              style: DT.titleSmall),
          ),
          // Toggle
          SizedBox(
            width: 51,
            height: 44,
            child: CupertinoSwitch(
              value: enabled,
              activeColor: DT.primary,
              onChanged: (v) {
                HapticFeedback.selectionClick();
                setState(() => _schedule[key]!['enabled'] = v);
              },
            ),
          ),
          if (enabled) ...[
            const Spacer(),
            _TimeInput(
              value: day['startTime'] as String,
              onChanged: (v) => setState(() => _schedule[key]!['startTime'] = v),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Text(' - ', style: DT.bodyMedium.copyWith(color: DT.textLightGrey)),
            ),
            _TimeInput(
              value: day['endTime'] as String,
              onChanged: (v) => setState(() => _schedule[key]!['endTime'] = v),
            ),
          ] else ...[
            const SizedBox(width: DT.md),
            Text('休息', style: DT.bodyMedium.copyWith(color: DT.textLightGrey)),
          ],
        ],
      ),
    );
  }

  // ── Save Button ──

  Widget _buildSaveButton(double bottomPad) {
    return Container(
      padding: EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl, DT.md + bottomPad),
      decoration: BoxDecoration(
        color: DT.surface,
        border: const Border(top: BorderSide(color: DT.bg)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 20, offset: const Offset(0, -4))],
      ),
      child: SizedBox(
        width: double.infinity, height: 50,
        child: ElevatedButton(
          onPressed: _saving ? null : _save,
          style: ElevatedButton.styleFrom(
            backgroundColor: DT.cream,
            foregroundColor: DT.onCream,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DT.lg)),
            elevation: 0,
          ),
          child: _saving
              ? const SizedBox(width: DT.xl, height: DT.xl,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text('保存', style: DT.bodyLarge.copyWith(fontWeight: FontWeight.w600)),
        ),
      ),
    );
  }
}

class _TimeInput extends StatefulWidget {
  final String value;
  final ValueChanged<String> onChanged;

  const _TimeInput({required this.value, required this.onChanged});

  @override
  State<_TimeInput> createState() => _TimeInputState();
}

class _TimeInputState extends State<_TimeInput> {
  late TextEditingController _ctl;

  @override
  void initState() {
    super.initState();
    _ctl = TextEditingController(text: widget.value);
  }

  @override
  void didUpdateWidget(_TimeInput old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value && _ctl.text != widget.value) {
      _ctl.text = widget.value;
    }
  }

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
    final parts = widget.value.split(':');
    final h = int.tryParse(parts[0]) ?? 10;
    final m = int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0;
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: h, minute: m),
    );
    if (picked != null) {
      final str = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      setState(() => _ctl.text = str);
      widget.onChanged(str);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _pick,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: DT.md, vertical: 6),
        decoration: BoxDecoration(
          color: DT.fillGreyLight,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: DT.borderGrey),
        ),
        child: Text(widget.value, style: DT.bodyMedium.copyWith(fontWeight: FontWeight.w500)),
      ),
    );
  }
}
