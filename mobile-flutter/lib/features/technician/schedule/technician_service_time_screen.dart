import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/technician_auth_service.dart';
import '../auth/technician_auth_models.dart';

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
    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      await TechnicianAuthService(api).updateProfile({
        'serviceSchedule': {'days': _schedule},
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('服务时间已保存'),
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
                  child: ListView(
                    padding: EdgeInsets.fromLTRB(20, 0, 20, 24 + bottomPad),
                    children: [
                      _buildInfoBanner(),
                      const SizedBox(height: 16),
                      ..._dayKeys.asMap().entries.map((e) =>
                        _buildDayCard(e.key, e.value)),
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
          const Text('服务时间设置',
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
            child: Text('设置每天的服务可用时间，客户仅能在你开启的时间段内预约',
              style: TextStyle(fontSize: 14, color: const Color(0xFF2563EB).withOpacity(0.8), height: 1.5)),
          ),
        ],
      ),
    );
  }

  // ── Day Card ──

  Widget _buildDayCard(int index, String key) {
    final day = _schedule[key]!;
    final enabled = day['enabled'] as bool;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: DT.shadowSm,
      ),
      child: Row(
        children: [
          SizedBox(
            width: 40,
            child: Text(_dayLabels[index],
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: DT.textPrimary)),
          ),
          // Toggle
          Container(
            width: 44, height: 24,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: enabled ? DT.primary : const Color(0xFFE2E8F0),
            ),
            child: GestureDetector(
              onTap: () => setState(() => _schedule[key]!['enabled'] = !enabled),
              child: AnimatedAlign(
                duration: const Duration(milliseconds: 200),
                alignment: enabled ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  width: 20, height: 20,
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
                ),
              ),
            ),
          ),
          if (enabled) ...[
            const Spacer(),
            _TimeInput(
              value: day['startTime'] as String,
              onChanged: (v) => setState(() => _schedule[key]!['startTime'] = v),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 6),
              child: Text(' - ', style: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF))),
            ),
            _TimeInput(
              value: day['endTime'] as String,
              onChanged: (v) => setState(() => _schedule[key]!['endTime'] = v),
            ),
          ] else ...[
            const SizedBox(width: 12),
            const Text('休息',
              style: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF))),
          ],
        ],
      ),
    );
  }

  // ── Save Button ──

  Widget _buildSaveButton(double bottomPad) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, 12 + bottomPad),
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(top: BorderSide(color: Color(0xFFF1F5F9))),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, -4))],
      ),
      child: SizedBox(
        width: double.infinity, height: 50,
        child: ElevatedButton(
          onPressed: _saving ? null : _save,
          style: ElevatedButton.styleFrom(
            backgroundColor: DT.primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 0,
          ),
          child: _saving
              ? const SizedBox(width: 20, height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('保存', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
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
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Text(widget.value,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textPrimary)),
      ),
    );
  }
}
