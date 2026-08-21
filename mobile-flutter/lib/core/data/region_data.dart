import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;

/// 中国省/市/区数据（来自 assets/data/regions.json），按需一次性加载并缓存。
class RegionData {
  static Map<String, List<String>>? _provinceCity;
  static Map<String, List<String>>? _cityDistricts;

  static bool get isLoaded => _provinceCity != null;

  static Future<void> ensureLoaded() async {
    if (_provinceCity != null) return;
    final raw = await rootBundle.loadString('assets/data/regions.json');
    final json = jsonDecode(raw) as Map<String, dynamic>;
    _provinceCity = (json['provinceCity'] as Map<String, dynamic>)
        .map((k, v) => MapEntry(k, (v as List).cast<String>()));
    _cityDistricts = (json['cityDistricts'] as Map<String, dynamic>)
        .map((k, v) => MapEntry(k, (v as List).cast<String>()));
  }

  static List<String> get provinces => _provinceCity?.keys.toList() ?? const [];
  static List<String> citiesOf(String? province) =>
      (province == null ? null : _provinceCity?[province]) ?? const [];
  static List<String> districtsOf(String? city) =>
      (city == null ? null : _cityDistricts?[city]) ?? const [];
}
