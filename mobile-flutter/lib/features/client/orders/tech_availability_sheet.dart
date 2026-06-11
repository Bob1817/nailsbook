import 'dart:ui' show ImageFilter;
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/editorial_tokens.dart';
import '../auth/client_auth_models.dart';
import '../auth/client_auth_service.dart';
import '../../shared/booking/booking_availability.dart';
import 'client_order_service.dart';
import 'client_create_order_screen.dart';

/// 弹出「美甲师可约时间」预览（只读）+「去预约」入口。
/// 传入完整 [technician]（我的页绑定卡）或仅 [techId]（对话页，从已绑定列表取）。
Future<void> showTechAvailabilitySheet(
  BuildContext context, {
  Technician? technician,
  int? techId,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) =>
        _TechAvailabilitySheet(technician: technician, techId: techId),
  );
}

class _TechAvailabilitySheet extends StatefulWidget {
  final Technician? technician;
  final int? techId;
  const _TechAvailabilitySheet({this.technician, this.techId});

  @override
  State<_TechAvailabilitySheet> createState() => _TechAvailabilitySheetState();
}

class _TechAvailabilitySheetState extends State<_TechAvailabilitySheet> {
  Technician? _tech;
  List<Map<String, dynamic>> _blocked = const [];
  bool _loading = true;
  String? _selectedDate;

  @override
  void initState() {
    super.initState();
    _tech = widget.technician;
    _init();
  }

  Future<void> _init() async {
    final api = context.read<ApiClient>();
    try {
      // 仅有 techId 时，从客户已绑定美甲师列表取完整资料（含工作时间方案）。
      if (_tech == null && widget.techId != null) {
        final data = await ClientAuthService(api).getProfile();
        final techs = (data['technicians'] as List<dynamic>?)
                ?.map((e) => Technician.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [];
        _tech = techs.cast<Technician?>().firstWhere(
            (t) => t?.id == widget.techId,
            orElse: () => null);
      }
      if (_tech != null) {
        _blocked = await ClientOrderService(api).getBlockedSlots(_tech!.id);
      }
    } catch (_) {/* 静默：无网络时只展示日程，不展示占用 */}
    if (!mounted) return;
    setState(() {
      _selectedDate = _firstAvailableDate();
      _loading = false;
    });
  }

  String _key(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  List<DateTime> get _days {
    final now = DateTime.now();
    final base = DateTime(now.year, now.month, now.day);
    return List.generate(14, (i) => base.add(Duration(days: i)));
  }

  bool _dayOpen(DateTime d) =>
      isDateAvailable(_tech?.serviceSchedule, _key(d));

  String? _firstAvailableDate() {
    for (final d in _days) {
      if (_dayOpen(d)) return _key(d);
    }
    return null;
  }

  List<SlotStatus> _slotsFor(String dateStr) {
    return getSlotStatuses(
      dateStr: dateStr,
      range: scheduleRange(_tech?.serviceSchedule),
      blockedSlots: _blocked,
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).padding.bottom;
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.8),
          decoration: BoxDecoration(
            color: ET.bgElevated.withValues(alpha: 0.98),
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(24)),
            border: const Border(top: BorderSide(color: ET.hairline)),
          ),
          padding: EdgeInsets.fromLTRB(20, 10, 20, bottomPad + 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                    width: 38,
                    height: 4,
                    decoration: BoxDecoration(
                        color: ET.hairlineStrong,
                        borderRadius: BorderRadius.circular(2))),
              ),
              const SizedBox(height: 14),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 48),
                  child: Center(
                      child: CircularProgressIndicator(color: ET.accent)),
                )
              else if (_tech == null)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 48),
                  child: Center(
                      child: Text('暂时无法获取该美甲师的可约时间',
                          style: TextStyle(color: ET.inkMuted))),
                )
              else
                ..._content(),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _content() {
    final tech = _tech!;
    final selected = _selectedDate;
    final slots = selected == null ? const <SlotStatus>[] : _slotsFor(selected);
    final freeCount = slots.where((s) => !s.occupied).length;
    return [
      // 头部：头像 + 名称
      Row(
        children: [
          _avatar(tech),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tech.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: ET.ink)),
                const SizedBox(height: 2),
                const Text('可约时间', style: TextStyle(fontSize: 12, color: ET.inkMuted)),
              ],
            ),
          ),
        ],
      ),
      const SizedBox(height: 16),
      // 日期条
      SizedBox(
        height: 64,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: _days.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, i) => _dateCell(_days[i]),
        ),
      ),
      const SizedBox(height: 16),
      // 时段
      if (selected == null)
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 28),
          child: Center(
              child: Text('近两周暂无可约日期',
                  style: TextStyle(color: ET.inkMuted, fontSize: 13))),
        )
      else if (slots.isEmpty)
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 28),
          child: Center(
              child: Text('当日不可约',
                  style: TextStyle(color: ET.inkMuted, fontSize: 13))),
        )
      else ...[
        Row(
          children: [
            const Text('可约时段',
                style: TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w600, color: ET.ink)),
            const SizedBox(width: 8),
            Text('剩 $freeCount 个',
                style: const TextStyle(fontSize: 12, color: ET.inkMuted)),
          ],
        ),
        const SizedBox(height: 10),
        Flexible(
          child: SingleChildScrollView(
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: slots.map(_slotChip).toList(),
            ),
          ),
        ),
        const SizedBox(height: 16),
      ],
      // 去预约
      SizedBox(
        width: double.infinity,
        height: 50,
        child: ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) =>
                        ClientCreateOrderScreen(preselectedTechId: tech.id)));
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: ET.cream,
            foregroundColor: ET.onCream,
            elevation: 0,
            shape: const StadiumBorder(),
            textStyle:
                const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          child: const Text('去预约'),
        ),
      ),
    ];
  }

  Widget _avatar(Technician tech) {
    final url = tech.avatarUrl;
    if (url != null && url.isNotEmpty) {
      return ClipOval(
          child: CachedNetworkImage(
              imageUrl: url, width: 44, height: 44, fit: BoxFit.cover));
    }
    return Container(
      width: 44,
      height: 44,
      alignment: Alignment.center,
      decoration: const BoxDecoration(color: ET.accentSoft, shape: BoxShape.circle),
      child: Text(tech.name.isNotEmpty ? tech.name.substring(0, 1) : '美',
          style: const TextStyle(color: ET.accentOnDark, fontWeight: FontWeight.w600)),
    );
  }

  Widget _dateCell(DateTime d) {
    const wk = ['一', '二', '三', '四', '五', '六', '日'];
    final key = _key(d);
    final open = _dayOpen(d);
    final selected = key == _selectedDate;
    final now = DateTime.now();
    final isToday = d.year == now.year && d.month == now.month && d.day == now.day;
    return GestureDetector(
      onTap: open ? () => setState(() => _selectedDate = key) : null,
      child: Container(
        width: 52,
        decoration: BoxDecoration(
          color: selected ? ET.cream : ET.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: selected ? ET.cream : ET.hairline),
        ),
        child: Opacity(
          opacity: open ? 1 : 0.4,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(isToday ? '今天' : '周${wk[d.weekday - 1]}',
                  style: TextStyle(
                      fontSize: 11,
                      color: selected ? ET.onCream : ET.inkMuted)),
              const SizedBox(height: 3),
              Text('${d.day}',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: selected
                          ? ET.onCream
                          : (open ? ET.ink : ET.inkMuted))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _slotChip(SlotStatus s) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: s.occupied ? ET.surface : ET.accentSoft,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: s.occupied ? ET.hairline : ET.accent.withValues(alpha: 0.4)),
      ),
      child: Text(s.time,
          style: TextStyle(
            fontSize: 13,
            decoration: s.occupied ? TextDecoration.lineThrough : null,
            color: s.occupied ? ET.inkMuted : ET.accentOnDark,
          )),
    );
  }
}
