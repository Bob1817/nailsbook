import 'dart:ui' show ImageFilter;

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_error.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/nb_toast.dart';
import '../auth/technician_auth_models.dart';
import '../auth/technician_auth_service.dart';
import '../customers/technician_customer_service.dart';
import 'technician_order_service.dart';

class TechnicianCreateBookingSheet extends StatefulWidget {
  final List<Map<String, dynamic>>? customers;
  final int? presetCustomerId;
  final ValueChanged<Map<String, dynamic>>? onCreated;

  const TechnicianCreateBookingSheet({
    super.key,
    this.customers,
    this.presetCustomerId,
    this.onCreated,
  });

  @override
  State<TechnicianCreateBookingSheet> createState() =>
      _TechnicianCreateBookingSheetState();
}

const _dayKeyMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/// Subtle inset highlight for glass surfaces (Apple HIG).
const _glassHighlight = LinearGradient(
  begin: Alignment.topCenter,
  end: Alignment.bottomCenter,
  colors: [Color(0x14FFFFFF), Color(0x00FFFFFF)],
);

class _TechnicianCreateBookingSheetState
    extends State<TechnicianCreateBookingSheet> {
  final _serviceCtl = TextEditingController();
  final _durationCtl = TextEditingController(text: '90');
  final _addressCtl = TextEditingController();
  final _priceCtl = TextEditingController();
  final _noteCtl = TextEditingController();

  List<Map<String, dynamic>> _customers = [];
  List<Map<String, dynamic>> _orders = [];
  TechnicianProfile? _profile;
  int? _selectedCustomerId;
  DateTime _viewMonth = DateTime(DateTime.now().year, DateTime.now().month);
  DateTime? _selectedDate;
  String? _startClock;
  String? _error;
  bool _loading = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _selectedCustomerId = widget.presetCustomerId;
    _load();
  }

  @override
  void dispose() {
    _serviceCtl.dispose();
    _durationCtl.dispose();
    _addressCtl.dispose();
    _priceCtl.dispose();
    _noteCtl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      final results = await Future.wait([
        TechnicianAuthService(api).getProfile(),
        widget.customers == null
            ? TechnicianCustomerService(api).list()
            : Future.value(widget.customers!),
        TechnicianOrderService(api).list(),
      ]);
      if (!mounted) return;
      setState(() {
        _profile = results[0] as TechnicianProfile;
        _customers = (results[1] as List).cast<Map<String, dynamic>>();
        _orders = (results[2] as List).cast<Map<String, dynamic>>();
        _loading = false;
      });
      _prefillAddress();
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Map<String, dynamic>? get _selectedCustomer {
    final id = _selectedCustomerId;
    if (id == null) return null;
    for (final customer in _customers) {
      if (customer['id'] == id) return customer;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    const sheetRadius = BorderRadius.vertical(top: Radius.circular(28));
    final bottomPad = MediaQuery.paddingOf(context).bottom;

    return SafeArea(
      top: false,
      bottom: false,
      child: Container(
        width: double.infinity,
        constraints:
            BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.92),
        decoration: BoxDecoration(
          color: DT.surface, // opaque white base
          borderRadius: sheetRadius,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 40,
              offset: const Offset(0, -8),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: sheetRadius,
          child: Column(
            children: [
              // ── Glass top strip: subtle frosted highlight ──
              BackdropFilter(
                filter: ImageFilter.blur(
                  sigmaX: DT.glassBlurStandard,
                  sigmaY: DT.glassBlurStandard,
                ),
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: _glassHighlight,
                  ),
                  child: _header(),
                ),
              ),
              // ── Hairline divider ──
              Container(height: 0.5, color: DT.divider),
              // ── Scrollable content ──
              Expanded(
                child: _loading
                    ? const Center(
                        child: CupertinoActivityIndicator(radius: 14))
                    : SingleChildScrollView(
                        padding: EdgeInsets.fromLTRB(
                          DT.xl, DT.lg, DT.xl, DT.lg,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _customerPicker(),
                            const SizedBox(height: DT.md),
                            _input(_serviceCtl, '服务内容'),
                            const SizedBox(height: DT.md),
                            _calendar(),
                            const SizedBox(height: DT.md),
                            Row(
                              children: [
                                Expanded(
                                    child: _input(_durationCtl, '服务时长(分钟)',
                                        numberOnly: true)),
                                const SizedBox(width: DT.sm),
                                Expanded(
                                    child: _input(_priceCtl, '价格',
                                        decimalOnly: true)),
                              ],
                            ),
                            const SizedBox(height: DT.md),
                            _input(_addressCtl, '服务地址'),
                            const SizedBox(height: DT.md),
                            _input(_noteCtl, '备注（可选）', maxLines: 4),
                          ],
                        ),
                      ),
              ),
              // ── Hairline divider ──
              Container(height: 0.5, color: DT.divider),
              // ── Fixed footer: error + submit button ──
              Container(
                padding: EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl, bottomPad + DT.md),
                decoration: const BoxDecoration(color: DT.surface),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_error != null) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(DT.md),
                        decoration: BoxDecoration(
                          color: DT.errorBg,
                          borderRadius: BorderRadius.circular(DT.rMd),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                                CupertinoIcons.exclamationmark_circle,
                                size: 16,
                                color: DT.errorText),
                            const SizedBox(width: DT.sm),
                            Expanded(
                              child: Text(_error!,
                                  style: DT.bodySmall
                                      .copyWith(color: DT.errorText)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: DT.md),
                    ],
                    _submitButton(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(DT.xl, DT.sm, DT.md, DT.md),
      child: Column(
        children: [
          // ── Grabber pill (iOS sheet indicator) ──
          Container(
            width: 36,
            height: 5,
            margin: const EdgeInsets.only(bottom: DT.md),
            decoration: BoxDecoration(
              color: DT.textQuaternary,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('新建预约', style: DT.titleMedium),
                    const SizedBox(height: DT.xs),
                    Text(
                      '创建后同步到预约、行程和客户记录',
                      style: DT.captionLarge,
                    ),
                  ],
                ),
              ),
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => Navigator.pop(context),
                child: Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: DT.surfaceAlt,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(CupertinoIcons.xmark,
                      size: 16, color: DT.textSecondary),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _customerPicker() {
    return Container(
      height: 50,
      padding: const EdgeInsets.symmetric(horizontal: DT.lg),
      decoration: BoxDecoration(
        color: DT.surfaceAlt,
        borderRadius: BorderRadius.circular(DT.rLg),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value: _selectedCustomerId,
          isExpanded: true,
          hint: Text('选择客户', style: DT.bodySmall),
          dropdownColor: DT.surface,
          borderRadius: BorderRadius.circular(DT.rMd),
          items: _customers.map((customer) {
            final id = customer['id'] as int;
            final name = customer['name']?.toString() ?? '客户';
            return DropdownMenuItem(
                value: id, child: Text(name, overflow: TextOverflow.ellipsis));
          }).toList(),
          onChanged: widget.presetCustomerId == null
              ? (value) {
                  setState(() => _selectedCustomerId = value);
                  _prefillAddress();
                }
              : null,
        ),
      ),
    );
  }

  Widget _input(
    TextEditingController controller,
    String placeholder, {
    bool numberOnly = false,
    bool decimalOnly = false,
    int maxLines = 1,
  }) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      minLines: maxLines,
      keyboardType:
          numberOnly || decimalOnly ? TextInputType.number : TextInputType.text,
      inputFormatters: [
        if (numberOnly) FilteringTextInputFormatter.digitsOnly,
        if (decimalOnly)
          TextInputFormatter.withFunction((oldValue, newValue) {
            final text = newValue.text;
            final valid = text.runes.every((rune) {
              final char = String.fromCharCode(rune);
              return char == '.' || int.tryParse(char) != null;
            });
            return valid ? newValue : oldValue;
          }),
      ],
      decoration: InputDecoration(
        hintText: placeholder,
        filled: true,
        fillColor: DT.surfaceAlt,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DT.rLg),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DT.rLg),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DT.rLg),
          borderSide: const BorderSide(color: DT.primary, width: 1.5),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: DT.lg, vertical: DT.lg),
      ),
    );
  }

  Widget _calendar() {
    final monthStart = DateTime(_viewMonth.year, _viewMonth.month);
    final daysInMonth = DateTime(_viewMonth.year, _viewMonth.month + 1, 0).day;
    final leading = monthStart.weekday % 7;
    final cells = <Widget>[
      for (var i = 0; i < leading; i++) const SizedBox(height: 40),
      for (var day = 1; day <= daysInMonth; day++) _dayCell(day),
    ];

    return Container(
      padding: const EdgeInsets.all(DT.lg),
      decoration: BoxDecoration(
        color: DT.surface,
        borderRadius: BorderRadius.circular(DT.rXl),
        border: Border.all(color: DT.hairline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('选择日期', style: DT.titleSmall),
          const SizedBox(height: DT.md),
          Row(
            children: [
              _monthButton(CupertinoIcons.chevron_left, () {
                setState(() => _viewMonth =
                    DateTime(_viewMonth.year, _viewMonth.month - 1));
              }),
              Expanded(
                child: Center(
                  child: Text('${_viewMonth.year}年${_viewMonth.month}月',
                      style: DT.titleSmall),
                ),
              ),
              _monthButton(CupertinoIcons.chevron_right, () {
                setState(() => _viewMonth =
                    DateTime(_viewMonth.year, _viewMonth.month + 1));
              }),
            ],
          ),
          const SizedBox(height: DT.sm),
          GridView.count(
            crossAxisCount: 7,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 4,
            crossAxisSpacing: 4,
            children: const ['日', '一', '二', '三', '四', '五', '六']
                .map((day) => Center(
                    child: Text(day, style: DT.captionMedium)))
                .toList(),
          ),
          GridView.count(
            crossAxisCount: 7,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 4,
            crossAxisSpacing: 4,
            children: cells,
          ),
          const SizedBox(height: DT.xs),
          Text('灰色日期为休息日或不可预约日期', style: DT.captionMedium),
          if (_selectedDate != null) ...[
            const SizedBox(height: DT.xs),
            Text('选择时间', style: DT.titleSmall),
            const SizedBox(height: DT.sm),
            _timeSlots(),
          ],
        ],
      ),
    );
  }

  Widget _monthButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: DT.surfaceAlt,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 18, color: DT.textSecondary),
      ),
    );
  }

  Widget _dayCell(int day) {
    final date = DateTime(_viewMonth.year, _viewMonth.month, day);
    final disabled = _isDateDisabled(date);
    final selected = _selectedDate != null &&
        date.year == _selectedDate!.year &&
        date.month == _selectedDate!.month &&
        date.day == _selectedDate!.day;
    return GestureDetector(
      onTap: disabled
          ? null
          : () {
              HapticFeedback.selectionClick();
              setState(() {
                _selectedDate = date;
                _startClock = null;
              });
            },
      child: Container(
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: disabled
              ? Colors.transparent
              : selected
                  ? DT.primary
                  : DT.surfaceAlt,
          borderRadius: BorderRadius.circular(DT.md),
        ),
        child: Text(
          '$day',
          style: TextStyle(
            fontSize: 13,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: disabled
                ? DT.textDisabled
                : selected
                    ? Colors.white
                    : DT.textPrimary,
          ),
        ),
      ),
    );
  }

  Widget _timeSlots() {
    final slots = _availableSlots();
    if (slots.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: DT.sm),
        child: Text('该日期休息中', style: DT.bodySmall),
      );
    }
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 2.15,
      mainAxisSpacing: DT.sm,
      crossAxisSpacing: DT.sm,
      children: slots.map((slot) {
        final occupied = _isSlotOccupied(slot);
        final selected = _startClock == slot;
        return GestureDetector(
          onTap: occupied
              ? null
              : () {
                  HapticFeedback.selectionClick();
                  setState(() => _startClock = slot);
                },
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: occupied
                  ? DT.surfaceAlt
                  : selected
                      ? DT.primary
                      : DT.surfaceAlt,
              borderRadius: BorderRadius.circular(DT.md),
              border: selected
                  ? null
                  : Border.all(color: DT.hairline),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  slot,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: occupied
                        ? DT.textMuted
                        : selected
                            ? Colors.white
                            : DT.textPrimary,
                    decoration: occupied ? TextDecoration.lineThrough : null,
                  ),
                ),
                if (occupied)
                  Text('已预约', style: DT.captionSmall),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _submitButton() {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: ElevatedButton(
        onPressed: _submitting ? null : _submit,
        child: Text(_submitting ? '创建中...' : '创建预约'),
      ),
    );
  }

  void _prefillAddress() {
    final customer = _selectedCustomer;
    if (customer == null || _addressCtl.text.trim().isNotEmpty) return;
    final address = customer['address']?.toString() ?? '';
    if (address.isNotEmpty && address != '未填写地址') {
      _addressCtl.text = address;
    }
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    final customer = _selectedCustomer;
    final selectedDate = _selectedDate;
    final duration = int.tryParse(_durationCtl.text.trim());
    final price = double.tryParse(_priceCtl.text.trim());

    if (customer == null ||
        _serviceCtl.text.trim().isEmpty ||
        selectedDate == null ||
        _startClock == null ||
        _addressCtl.text.trim().isEmpty ||
        price == null) {
      setState(() => _error = '请填写客户、服务内容、时间、地址和价格');
      return;
    }
    if (duration == null || duration <= 0) {
      setState(() => _error = '请检查服务时长');
      return;
    }

    final startTime = _buildDateTime(selectedDate, _startClock!);
    final endTime = startTime.add(Duration(minutes: duration));
    if (_hasConflict(startTime, endTime)) {
      setState(() => _error = '该时间段已有预约，请调整开始时间或服务时长');
      return;
    }

    setState(() => _submitting = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      final created = await TechnicianOrderService(api).create({
        'customerId': customer['id'],
        'serviceName': _serviceCtl.text.trim(),
        'address': _addressCtl.text.trim(),
        'startTime': startTime.toIso8601String(),
        'endTime': endTime.toIso8601String(),
        'note': _noteCtl.text.trim(),
        'price': price,
      });
      if (!mounted) return;
      NbToast.success(context, '预约创建成功');
      widget.onCreated?.call(created);
      Navigator.pop(context);
    } on ApiError catch (error) {
      if (!mounted) return;
      setState(() {
        _error =
            error.message.contains('该时间段') ? '该时间段已经被预约，请重新选择' : '创建预约失败，请稍后重试';
        _submitting = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = '创建预约失败，请稍后重试';
        _submitting = false;
      });
    }
  }

  bool _isDateDisabled(DateTime date) {
    final today = DateTime.now();
    final todayOnly = DateTime(today.year, today.month, today.day);
    final dateOnly = DateTime(date.year, date.month, date.day);
    if (dateOnly.isBefore(todayOnly)) return true;

    final schedule = _profile?.serviceSchedule;
    if (!_hasEffectiveSchedule(schedule)) return false;
    final active = _activeScheme(schedule);
    if (active == null) return true;
    final restDays = _restDays(schedule);
    if (restDays.contains(_dateStr(date))) return true;
    final weekday = _dayKeyMap[date.weekday % 7];
    final days = (active['days'] as List?)?.map((e) => e.toString()).toList() ??
        const [];
    return !days.contains(weekday);
  }

  List<String> _availableSlots() {
    final date = _selectedDate;
    if (date == null) return const [];
    final schedule = _profile?.serviceSchedule;
    if (!_hasEffectiveSchedule(schedule)) {
      return _generateSlots('00:00', '24:00');
    }
    final active = _activeScheme(schedule);
    if (active == null) return const [];
    final weekday = _dayKeyMap[date.weekday % 7];
    final days = (active['days'] as List?)?.map((e) => e.toString()).toList() ??
        const [];
    if (!days.contains(weekday) ||
        _restDays(schedule).contains(_dateStr(date))) {
      return const [];
    }
    return _generateSlots(active['startTime']?.toString() ?? '10:00',
        active['endTime']?.toString() ?? '21:00');
  }

  List<String> _generateSlots(String start, String end) {
    final startMinutes = _clockMinutes(start);
    final endMinutes = _clockMinutes(end);
    final slots = <String>[];
    for (var current = startMinutes; current < endMinutes; current += 30) {
      final h = current ~/ 60;
      final m = current % 60;
      slots.add(
          '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}');
    }
    return slots;
  }

  bool _isSlotOccupied(String slot) {
    final date = _selectedDate;
    if (date == null) return false;
    final slotTime = _buildDateTime(date, slot);
    final now = DateTime.now();
    if (_dateStr(date) == _dateStr(now) && !slotTime.isAfter(now)) return true;
    final slotMs = slotTime.millisecondsSinceEpoch;
    return _orders.any((order) {
      final start = DateTime.tryParse(order['startTime']?.toString() ?? '');
      if (start == null) return false;
      final end = DateTime.tryParse(order['endTime']?.toString() ?? '') ??
          start.add(const Duration(hours: 5));
      return slotMs >= start.millisecondsSinceEpoch &&
          slotMs < end.millisecondsSinceEpoch;
    });
  }

  bool _hasConflict(DateTime start, DateTime end) {
    return _orders.any((order) {
      final currentStart =
          DateTime.tryParse(order['startTime']?.toString() ?? '');
      final currentEnd = DateTime.tryParse(order['endTime']?.toString() ?? '');
      if (currentStart == null || currentEnd == null) return false;
      return start.isBefore(currentEnd) && end.isAfter(currentStart);
    });
  }

  DateTime _buildDateTime(DateTime date, String clock) {
    final parts = clock.split(':');
    final hour = int.tryParse(parts[0]) ?? 0;
    final minute = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
    return DateTime(date.year, date.month, date.day, hour, minute);
  }

  int _clockMinutes(String clock) {
    if (clock == '24:00') return 24 * 60;
    final parts = clock.split(':');
    return (int.tryParse(parts[0]) ?? 0) * 60 +
        (parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0);
  }

  bool _hasEffectiveSchedule(Map<String, dynamic>? schedule) {
    if (schedule == null) return false;
    final schemes = schedule['schemes'];
    if (schemes is List) {
      final active = _activeScheme(schedule);
      final days = active?['days'];
      return active != null && days is List && days.isNotEmpty;
    }
    final days = schedule['days'];
    if (days is Map) {
      return days.values
          .any((value) => value is Map && value['enabled'] == true);
    }
    return false;
  }

  Map<String, dynamic>? _activeScheme(Map<String, dynamic>? schedule) {
    if (schedule == null) return null;
    final schemes = schedule['schemes'];
    if (schemes is List && schemes.isNotEmpty) {
      final activeId = schedule['activeSchemeId']?.toString();
      final matched = schemes
          .whereType<Map<String, dynamic>>()
          .where((scheme) => scheme['id']?.toString() == activeId);
      return matched.isNotEmpty
          ? matched.first
          : schemes.whereType<Map<String, dynamic>>().first;
    }
    final days = schedule['days'];
    if (days is Map) {
      final enabled = <String>[];
      String start = '10:00';
      String end = '21:00';
      for (final entry in days.entries) {
        if (entry.value is Map && entry.value['enabled'] == true) {
          enabled.add(entry.key.toString());
          start = entry.value['startTime']?.toString() ?? start;
          end = entry.value['endTime']?.toString() ?? end;
        }
      }
      return {'days': enabled, 'startTime': start, 'endTime': end};
    }
    return null;
  }

  List<String> _restDays(Map<String, dynamic>? schedule) {
    final rest = schedule?['restDays'];
    if (rest is List) return rest.map((e) => e.toString()).toList();
    return const [];
  }

  String _dateStr(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }
}
