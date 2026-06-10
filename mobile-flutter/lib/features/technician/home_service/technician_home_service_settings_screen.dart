import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/technician_auth_service.dart';
import '../../../core/widgets/nb_toast.dart';

class TechnicianHomeServiceSettingsScreen extends StatefulWidget {
  const TechnicianHomeServiceSettingsScreen({super.key});

  @override
  State<TechnicianHomeServiceSettingsScreen> createState() => _TechnicianHomeServiceSettingsScreenState();
}

class _TechnicianHomeServiceSettingsScreenState extends State<TechnicianHomeServiceSettingsScreen> {
  bool _loading = true;
  bool _saving = false;
  bool _enabled = false;
  double _serviceRadius = 10;
  List<Map<String, dynamic>> _distanceRanges = [
    {'minDistance': 0, 'maxDistance': 3, 'baseFee': 0},
    {'minDistance': 3, 'maxDistance': 5, 'baseFee': 20},
    {'minDistance': 5, 'maxDistance': 10, 'baseFee': 40},
    {'minDistance': 10, 'maxDistance': -1, 'baseFee': 60},
  ];
  double _nightFee = 30;
  double _holidayFee = 20;

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
        setState(() {
          _loading = false;
          final settings = (p as dynamic).homeServiceSettings as Map<String, dynamic>?;
          if (settings != null) {
            _enabled = settings['enabled'] as bool? ?? false;
            _serviceRadius = (settings['serviceRadius'] as num?)?.toDouble() ?? 10;
            final feeConfig = settings['feeConfig'] as Map<String, dynamic>?;
            if (feeConfig != null) {
              final ranges = feeConfig['distanceRanges'] as List<dynamic>?;
              if (ranges != null) _distanceRanges = ranges.cast<Map<String, dynamic>>();
              final nightSlot = (feeConfig['timeSlotFees'] as Map<String, dynamic>?)?['nighttime'];
              if (nightSlot != null) _nightFee = (nightSlot['fee'] as num?)?.toDouble() ?? 30;
              _holidayFee = (feeConfig['holidayFee'] as num?)?.toDouble() ?? 20;
            }
          }
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      await TechnicianAuthService(api).updateServiceType({
        'homeService': _enabled,
        'homeServiceSettings': {
          'enabled': _enabled,
          'serviceRadius': _serviceRadius,
          'feeConfig': {
            'distanceRanges': _distanceRanges,
            'timeSlotFees': {
              'daytime': {'start': '08:00', 'end': '18:00', 'fee': 0},
              'nighttime': {'start': '18:00', 'end': '08:00', 'fee': _nightFee},
            },
            'holidayFee': _holidayFee,
          },
        },
      });
      if (mounted) {
        NbToast.show(context, '设置已保存');
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
                      _buildToggleCard(),
                      if (_enabled) ...[
                        const SizedBox(height: 16),
                        _buildRadiusCard(),
                        const SizedBox(height: 16),
                        _buildDistanceFeeCard(),
                        const SizedBox(height: 16),
                        _buildTimeFeeCard(),
                      ],
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
                color: DT.surface.withValues(alpha: 0.8),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF374151)),
            ),
          ),
          const SizedBox(width: 12),
          const Text('上门服务设置',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: DT.textPrimary)),
        ],
      ),
    );
  }

  // ── Toggle Card ──

  Widget _buildToggleCard() {
    return _glassCard(
      child: GestureDetector(
        onTap: () => setState(() => _enabled = !_enabled),
        behavior: HitTestBehavior.opaque,
        child: Row(
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: _enabled ? const Color(0xFFEFF6FF) : const Color(0xFF2A241E),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.home_outlined,
                size: 22,
                color: _enabled ? const Color(0xFF3B82F6) : const Color(0xFF9CA3AF)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('启用上门服务',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DT.textPrimary)),
                  const SizedBox(height: 2),
                  Text('开启后客户可预约上门美甲服务',
                    style: TextStyle(fontSize: 13, color: DT.textMuted)),
                ],
              ),
            ),
            Container(
              width: 50, height: 28,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                color: _enabled ? DT.primary : const Color(0xFFD1D5DB),
              ),
              child: AnimatedAlign(
                duration: const Duration(milliseconds: 200),
                alignment: _enabled ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  width: 24, height: 24,
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  decoration: const BoxDecoration(shape: BoxShape.circle, color: DT.surface),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Radius Card ──

  Widget _buildRadiusCard() {
    return _glassCard(
      title: '服务范围',
      child: Row(
        children: [
          Expanded(
            child: SliderTheme(
              data: SliderThemeData(
                activeTrackColor: DT.primary,
                inactiveTrackColor: const Color(0xFFFDE7EF),
                thumbColor: DT.primary,
                overlayColor: DT.primary.withValues(alpha: 0.1),
              ),
              child: Slider(
                value: _serviceRadius,
                min: 1, max: 50, divisions: 49,
                label: '${_serviceRadius.toInt()} 公里',
                onChanged: (v) => setState(() => _serviceRadius = v),
              ),
            ),
          ),
          SizedBox(
            width: 60,
            child: Text('${_serviceRadius.toInt()} km',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: DT.textPrimary),
              textAlign: TextAlign.center),
          ),
        ],
      ),
    );
  }

  // ── Distance Fee Card ──

  Widget _buildDistanceFeeCard() {
    return _glassCard(
      title: '距离附加费',
      trailing: GestureDetector(
        onTap: () => setState(() {
          _distanceRanges.add({'minDistance': 0, 'maxDistance': -1, 'baseFee': 0});
        }),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFF3A2F23),
            borderRadius: BorderRadius.circular(999),
          ),
          child: const Text('+ 添加', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: DT.primary)),
        ),
      ),
      child: Column(
        children: _distanceRanges.asMap().entries.map((e) {
          final i = e.key;
          final r = e.value;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: _smallInput(
                    '最小(km)',
                    r['minDistance'].toString(),
                    (v) => _distanceRanges[i]['minDistance'] = double.tryParse(v) ?? 0,
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6),
                  child: Text(' - ', style: TextStyle(color: Color(0xFF9CA3AF))),
                ),
                Expanded(
                  flex: 3,
                  child: _smallInput(
                    '最大(km)',
                    r['maxDistance'] == -1 ? '不限' : r['maxDistance'].toString(),
                    (v) => _distanceRanges[i]['maxDistance'] = double.tryParse(v) ?? -1,
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  flex: 3,
                  child: _smallInput(
                    '费用(¥)',
                    r['baseFee'].toString(),
                    (v) => _distanceRanges[i]['baseFee'] = double.tryParse(v) ?? 0,
                  ),
                ),
                GestureDetector(
                  onTap: () => setState(() => _distanceRanges.removeAt(i)),
                  child: const Padding(
                    padding: EdgeInsets.only(left: 4),
                    child: Icon(Icons.delete_outline, size: 18, color: Color(0xFFEF4444)),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  // ── Time Fee Card ──

  Widget _buildTimeFeeCard() {
    return _glassCard(
      title: '时段/节假日附加费',
      child: Column(
        children: [
          _feeRow('夜间附加费 (18:00-08:00)', _nightFee, (v) => setState(() => _nightFee = v)),
          const SizedBox(height: 12),
          _feeRow('节假日附加费', _holidayFee, (v) => setState(() => _holidayFee = v)),
        ],
      ),
    );
  }

  Widget _feeRow(String label, double value, ValueChanged<double> onChanged) {
    return Row(
      children: [
        Expanded(
          child: Text(label,
            style: const TextStyle(fontSize: 14, color: DT.textPrimary)),
        ),
        SizedBox(
          width: 80,
          child: Container(
            height: 40,
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFE5E7EB)),
              borderRadius: BorderRadius.circular(10),
            ),
            child: TextField(
              controller: TextEditingController(text: value.toStringAsFixed(0)),
              keyboardType: TextInputType.number,
              style: const TextStyle(fontSize: 15, color: DT.textPrimary),
              decoration: const InputDecoration(
                prefixText: '¥',
                prefixStyle: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF)),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 10),
                isDense: true,
              ),
              onChanged: (v) => onChanged(double.tryParse(v) ?? value),
            ),
          ),
        ),
      ],
    );
  }

  // ── Save Button ──

  Widget _buildSaveButton(double bottomPad) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, 12 + bottomPad),
      decoration: BoxDecoration(
        color: DT.surface.withValues(alpha: 0.82),
        border: const Border(top: BorderSide(color: DT.divider)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 20, offset: const Offset(0, -4))],
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
              : const Text('保存设置', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        ),
      ),
    );
  }

  // ── Helpers ──

  Widget _glassCard({String? title, Widget? trailing, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: DT.surface.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Row(
                children: [
                  Expanded(
                    child: Text(title,
                      style: DT.titleSmall.copyWith(color: DT.textPrimary)),
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

  Widget _smallInput(String hint, String initial, ValueChanged<String> onChanged) {
    return SizedBox(
      height: 36,
      child: TextField(
        controller: TextEditingController(text: initial),
        keyboardType: TextInputType.number,
        style: const TextStyle(fontSize: 13, color: DT.textPrimary),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(fontSize: 12, color: Color(0xFFB0AAB4)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 10),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
          ),
          isDense: true,
        ),
        onChanged: onChanged,
      ),
    );
  }
}
