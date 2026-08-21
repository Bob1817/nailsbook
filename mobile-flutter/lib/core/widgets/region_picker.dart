import 'dart:ui';
import 'package:flutter/material.dart';
import '../data/region_data.dart';
import '../theme/design_tokens.dart';

class RegionValue {
  final String province;
  final String city;
  final String district;
  const RegionValue({this.province = '', this.city = '', this.district = ''});

  bool get isComplete => province.isNotEmpty && city.isNotEmpty;
  String get display => [province, city, district].where((s) => s.isNotEmpty).join(' ');
}

/// 省市区联动选择：毛玻璃底部弹层，逐级下钻（省 → 市 → 区）。
Future<RegionValue?> showRegionPicker(BuildContext context, {RegionValue? initial}) async {
  await RegionData.ensureLoaded();
  if (!context.mounted) return null;
  return showModalBottomSheet<RegionValue>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _RegionPickerSheet(initial: initial ?? const RegionValue()),
  );
}

class _RegionPickerSheet extends StatefulWidget {
  final RegionValue initial;
  const _RegionPickerSheet({required this.initial});

  @override
  State<_RegionPickerSheet> createState() => _RegionPickerSheetState();
}

class _RegionPickerSheetState extends State<_RegionPickerSheet> {
  late String _province = widget.initial.province;
  late String _city = widget.initial.city;
  late String _district = widget.initial.district;
  late int _step; // 0 省 / 1 市 / 2 区

  @override
  void initState() {
    super.initState();
    _step = _province.isEmpty ? 0 : (_city.isEmpty ? 1 : 2);
  }

  List<String> get _options {
    switch (_step) {
      case 0:
        return RegionData.provinces;
      case 1:
        return RegionData.citiesOf(_province);
      default:
        return RegionData.districtsOf(_city);
    }
  }

  String get _currentValue => _step == 0 ? _province : (_step == 1 ? _city : _district);

  void _select(String value) {
    if (_step == 0) {
      final cities = RegionData.citiesOf(value);
      setState(() {
        _province = value;
        // 直辖市等只有一个市，自动带入
        _city = cities.length == 1 ? cities.first : '';
        _district = '';
        _step = (cities.length == 1) ? 2 : 1;
      });
      // 自动带入后若该市无区县，直接完成
      if (cities.length == 1 && RegionData.districtsOf(_city).isEmpty) {
        Navigator.pop(context, RegionValue(province: _province, city: _city, district: ''));
      }
    } else if (_step == 1) {
      final districts = RegionData.districtsOf(value);
      setState(() {
        _city = value;
        _district = '';
        _step = 2;
      });
      if (districts.isEmpty) {
        Navigator.pop(context, RegionValue(province: _province, city: _city, district: ''));
      }
    } else {
      Navigator.pop(context, RegionValue(province: _province, city: _city, district: value));
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = MediaQuery.of(context).size.height;
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          height: h * 0.62,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.92),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.6), width: 0.5)),
          ),
          child: Column(
            children: [
              // top bar
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 12, 8, 4),
                child: Row(
                  children: [
                    const SizedBox(width: 40),
                    const Expanded(
                      child: Center(
                        child: Text('选择所在地区',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DT.textPrimary)),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 22, color: DT.textSecondary),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              _breadcrumb(),
              const Divider(height: 1, color: DT.divider),
              Expanded(child: _optionList()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _breadcrumb() {
    Widget chip(String label, String value, int step) {
      final active = _step == step;
      final filled = value.isNotEmpty;
      // 仅允许跳到已选层级或当前可达层级
      final tappable = step == 0 ||
          (step == 1 && _province.isNotEmpty) ||
          (step == 2 && _city.isNotEmpty);
      return GestureDetector(
        onTap: tappable ? () => setState(() => _step = step) : null,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                filled ? value : label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                  color: active ? DT.primary : (filled ? DT.textPrimary : DT.textMuted),
                ),
              ),
              const SizedBox(height: 4),
              Container(
                height: 2, width: 28,
                decoration: BoxDecoration(
                  color: active ? DT.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          chip('省份', _province, 0),
          const SizedBox(width: 12),
          chip('城市', _city, 1),
          const SizedBox(width: 12),
          chip('区/县', _district, 2),
        ],
      ),
    );
  }

  Widget _optionList() {
    final options = _options;
    if (options.isEmpty) {
      return const Center(child: Text('暂无可选项', style: TextStyle(color: DT.textMuted, fontSize: 14)));
    }
    final selected = _currentValue;
    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 4),
      itemCount: options.length,
      itemBuilder: (_, i) {
        final o = options[i];
        final isSel = o == selected;
        return Material(
          type: MaterialType.transparency,
          child: ListTile(
            title: Text(o,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: isSel ? FontWeight.w600 : FontWeight.w400,
                  color: isSel ? DT.primary : DT.textPrimary,
                )),
            trailing: isSel ? const Icon(Icons.check_rounded, size: 20, color: DT.primary) : null,
            dense: true,
            onTap: () => _select(o),
          ),
        );
      },
    );
  }
}
