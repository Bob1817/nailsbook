import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/technician_auth_service.dart';
import '../auth/technician_auth_models.dart';

class TechnicianShopEditScreen extends StatefulWidget {
  final int? shopIndex;
  const TechnicianShopEditScreen({super.key, this.shopIndex});

  @override
  State<TechnicianShopEditScreen> createState() => _TechnicianShopEditScreenState();
}

class _TechnicianShopEditScreenState extends State<TechnicianShopEditScreen> {
  final _nameCtl = TextEditingController();
  final _provinceCtl = TextEditingController();
  final _cityCtl = TextEditingController();
  final _districtCtl = TextEditingController();
  final _addressCtl = TextEditingController();
  final _doorCtl = TextEditingController();
  final _phoneCtl = TextEditingController();

  bool _enabled = true;
  bool _loading = true;
  bool _saving = false;
  List<Map<String, dynamic>> _allShops = [];

  // Business hours: 7 days, each with enabled + start + end
  final List<bool> _dayEnabled = List.filled(7, true);
  final List<String> _dayStart = List.filled(7, '10:00');
  final List<String> _dayEnd = List.filled(7, '21:00');

  static const _dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  // Mon=1, Tue=2, ..., Sun=0 (matching webapp ordering)
  static const _dayOrder = [1, 2, 3, 4, 5, 6, 0];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nameCtl.dispose();
    _provinceCtl.dispose();
    _cityCtl.dispose();
    _districtCtl.dispose();
    _addressCtl.dispose();
    _doorCtl.dispose();
    _phoneCtl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      final p = await TechnicianAuthService(api).getProfile();
      if (mounted) {
        setState(() {
          _loading = false;
          _allShops = (p.shopAddresses ?? []).cast<Map<String, dynamic>>();
          _prefillIfEditing();
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _prefillIfEditing() {
    final idx = widget.shopIndex;
    if (idx != null && idx >= 0 && idx < _allShops.length) {
      final shop = _allShops[idx];
      _enabled = shop['enabled'] as bool? ?? true;
      _nameCtl.text = shop['name']?.toString() ?? '';
      _provinceCtl.text = shop['province']?.toString() ?? '';
      _cityCtl.text = shop['city']?.toString() ?? '';
      _districtCtl.text = shop['district']?.toString() ?? '';
      _addressCtl.text = shop['address']?.toString() ?? '';
      _doorCtl.text = shop['doorInfo']?.toString() ?? '';
      _phoneCtl.text = shop['phone']?.toString() ?? '';

      final hours = shop['businessHours'] as List<dynamic>?;
      if (hours != null) {
        for (int i = 0; i < hours.length && i < 7; i++) {
          final h = hours[i] as Map<String, dynamic>;
          _dayEnabled[i] = h['closed'] != true;
          _dayStart[i] = h['startTime']?.toString() ?? '10:00';
          _dayEnd[i] = h['endTime']?.toString() ?? '21:00';
        }
      }
    }
  }

  Future<void> _save() async {
    final name = _nameCtl.text.trim();
    final address = _addressCtl.text.trim();
    if (name.isEmpty) { _showMsg('请输入店铺名称'); return; }
    if (address.isEmpty) { _showMsg('请输入详细地址'); return; }

    final businessHours = List.generate(7, (i) => {
      'weekday': _dayOrder[i],
      'closed': !_dayEnabled[i],
      'startTime': _dayStart[i],
      'endTime': _dayEnd[i],
    });

    final shop = {
      'enabled': _enabled,
      'name': name,
      'province': _provinceCtl.text.trim(),
      'city': _cityCtl.text.trim(),
      'district': _districtCtl.text.trim(),
      'address': address,
      'doorInfo': _doorCtl.text.trim(),
      'phone': _phoneCtl.text.trim(),
      'businessHours': businessHours,
    };

    // Rebuild full shops array
    final idx = widget.shopIndex;
    if (idx != null && idx >= 0 && idx < _allShops.length) {
      _allShops[idx] = shop;
    } else {
      _allShops.add(shop);
    }

    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      await TechnicianAuthService(api).updateServiceType({
        'shopAddresses': _allShops,
      });
      if (mounted) {
        _showMsg('保存成功');
        Navigator.pop(context);
      }
    } catch (_) {
      _showMsg('保存失败');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showMsg(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.shopIndex != null ? '编辑店铺' : '新增店铺';

    return Scaffold(
      backgroundColor: DT.bgWarm,
      appBar: AppBar(
        backgroundColor: Colors.white.withOpacity(0.95),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: DT.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(title,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : Column(
              children: [
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      // Status toggle
                      _buildStatusToggle(),
                      const SizedBox(height: 16),
                      // Shop name
                      _buildCard([
                        _buildTextField('店铺名称', _nameCtl, required: true),
                      ]),
                      const SizedBox(height: 16),
                      // Address
                      _buildCard([
                        Padding(
                          padding: const EdgeInsets.fromLTRB(18, 14, 18, 0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('省 / 市 / 区',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: DT.textPrimary)),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(child: _smallField('省', _provinceCtl)),
                                  const SizedBox(width: 8),
                                  Expanded(child: _smallField('市', _cityCtl)),
                                  const SizedBox(width: 8),
                                  Expanded(child: _smallField('区', _districtCtl)),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        _buildTextField('详细地址', _addressCtl, required: true, hint: '如街道、门牌号等'),
                        _buildTextField('门牌信息', _doorCtl, hint: '如：楼层、房间号等', isLast: true),
                      ]),
                      const SizedBox(height: 16),
                      // Phone
                      _buildCard([
                        _buildTextField('店铺电话', _phoneCtl, hint: '请输入店铺联系电话', isLast: true),
                      ]),
                      const SizedBox(height: 16),
                      // Business hours
                      _buildSectionTitle('营业时间', '按周设置，未勾选表示当天休息'),
                      const SizedBox(height: 12),
                      _buildBusinessHoursCard(),
                    ],
                  ),
                ),
                // Save
                Container(
                  padding: EdgeInsets.fromLTRB(20, 12, 20, 12 + MediaQuery.of(context).padding.bottom),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.95),
                    border: const Border(top: BorderSide(color: Color(0xFFF2F0F3))),
                  ),
                  child: GestureDetector(
                    onTap: _saving ? null : _save,
                    child: Container(
                      height: 50,
                      decoration: BoxDecoration(
                        gradient: DT.primaryGradient,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: DT.shadowPrimary,
                      ),
                      alignment: Alignment.center,
                      child: Text(_saving ? '保存中...' : '保存',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildStatusToggle() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: DT.shadowSm,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('店铺状态',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: DT.textPrimary)),
                const SizedBox(height: 2),
                Text(_enabled ? '客户可预约到店服务' : '客户暂时无法预约此店铺',
                  style: TextStyle(fontSize: 12, color: DT.textMuted)),
              ],
            ),
          ),
          GestureDetector(
            onTap: () => setState(() => _enabled = !_enabled),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: _enabled ? const Color(0xFFEEF9F1) : const Color(0xFFF4F5F7),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(_enabled ? '已启用' : '已关闭',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: _enabled ? const Color(0xFF31B46C) : DT.textMuted,
                )),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBusinessHoursCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: DT.shadowSm,
      ),
      child: Column(
        children: List.generate(7, (i) {
          final isLast = i == 6;
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                child: Row(
                  children: [
                    SizedBox(
                      width: 40,
                      child: Text(_dayLabels[i],
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: _dayEnabled[i] ? FontWeight.w600 : FontWeight.w400,
                          color: _dayEnabled[i] ? DT.textPrimary : DT.textMuted,
                        )),
                    ),
                    const SizedBox(width: 8),
                    if (!_dayEnabled[i])
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF4F5F7),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text('休息',
                          style: TextStyle(fontSize: 11, color: DT.textMuted)),
                      ),
                    if (_dayEnabled[i]) ...[
                      Expanded(
                        child: _timeDropdown(_dayStart[i], (v) => setState(() => _dayStart[i] = v)),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text('至', style: TextStyle(fontSize: 13, color: DT.textMuted)),
                      ),
                      Expanded(
                        child: _timeDropdown(_dayEnd[i], (v) => setState(() => _dayEnd[i] = v)),
                      ),
                    ],
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () => setState(() => _dayEnabled[i] = !_dayEnabled[i]),
                      child: Container(
                        width: 44, height: 24,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          color: _dayEnabled[i] ? const Color(0xFF22C55E) : const Color(0xFFE2E8F0),
                        ),
                        child: AnimatedAlign(
                          duration: const Duration(milliseconds: 200),
                          alignment: _dayEnabled[i] ? Alignment.centerRight : Alignment.centerLeft,
                          child: Container(
                            width: 20, height: 20,
                            margin: const EdgeInsets.symmetric(horizontal: 2),
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (!isLast)
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 18),
                  child: Divider(height: 1, color: Color(0xFFF2F0F3)),
                ),
            ],
          );
        }),
      ),
    );
  }

  Widget _timeDropdown(String value, ValueChanged<String> onChanged) {
    final times = List.generate(48, (i) {
      final h = (i ~/ 2).toString().padLeft(2, '0');
      final m = (i % 2 == 0) ? '00' : '30';
      return '$h:$m';
    });

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF9F8),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFF2E6EC)),
      ),
      child: DropdownButton<String>(
        value: value,
        isDense: true,
        isExpanded: true,
        underline: const SizedBox(),
        style: const TextStyle(fontSize: 13, color: DT.textPrimary),
        items: times.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
        onChanged: (v) { if (v != null) onChanged(v); },
      ),
    );
  }

  Widget _buildCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: DT.shadowSm,
      ),
      child: Column(children: children),
    );
  }

  Widget _buildSectionTitle(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
        const SizedBox(height: 2),
        Text(subtitle,
          style: TextStyle(fontSize: 12, color: DT.textMuted)),
      ],
    );
  }

  Widget _buildTextField(String label, TextEditingController ctl, {
    bool required = false, String? hint, bool isLast = false,
  }) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(label,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: DT.textPrimary)),
                  if (required)
                    const Text(' *', style: TextStyle(fontSize: 13, color: DT.error)),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: ctl,
                style: const TextStyle(fontSize: 15, color: DT.textPrimary),
                decoration: InputDecoration(
                  hintText: hint,
                  hintStyle: TextStyle(fontSize: 14, color: DT.textMuted),
                  filled: true,
                  fillColor: const Color(0xFFFFF9F8),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: Color(0xFFF2E6EC)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: Color(0xFFF2E6EC)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: DT.primary, width: 1.5),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (!isLast)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 18),
            child: Divider(height: 1, color: Color(0xFFF2F0F3)),
          ),
      ],
    );
  }

  Widget _smallField(String hint, TextEditingController ctl) {
    return TextField(
      controller: ctl,
      style: const TextStyle(fontSize: 14, color: DT.textPrimary),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(fontSize: 13, color: DT.textMuted),
        isDense: true,
        filled: true,
        fillColor: const Color(0xFFFFF9F8),
        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFF2E6EC)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFF2E6EC)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: DT.primary, width: 1.5),
        ),
      ),
    );
  }
}
