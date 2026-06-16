import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import 'client_address_models.dart';
import 'client_address_service.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

class ClientAddressesScreen extends StatefulWidget {
  const ClientAddressesScreen({super.key});

  @override
  State<ClientAddressesScreen> createState() => _ClientAddressesScreenState();
}

class _ClientAddressesScreenState extends State<ClientAddressesScreen> {
  List<ClientAddress> _addresses = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    try {
      final service = ClientAddressService(context.read<ApiClient>());
      final addresses = await service.list();
      if (mounted)
        setState(() {
          _addresses = addresses;
          _loading = false;
        });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _deleteAddress(ClientAddress addr) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除地址'),
        content: Text('确定删除「${addr.contactName ?? '该地址'}」吗？'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: DT.error),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await ClientAddressService(context.read<ApiClient>()).delete(addr.id);
      if (mounted) NbToast.success(context, '已删除');
      _loadAddresses();
    } catch (_) {
      if (mounted) NbToast.error(context, '删除失败，请重试');
    }
  }

  Future<void> _setDefault(int id) async {
    try {
      await ClientAddressService(context.read<ApiClient>()).setDefault(id);
      _loadAddresses();
    } catch (_) {
      if (mounted) NbToast.error(context, '设置失败，请重试');
    }
  }

  Future<void> _openForm({ClientAddress? existing}) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          _AddressFormSheet(existing: existing, isFirst: _addresses.isEmpty),
    );
    if (saved == true) _loadAddresses();
  }

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).padding.bottom;
    return Scaffold(
      appBar: GlassAppBar(title: const Text('我的地址'), dark: true),
      backgroundColor: ET.bg,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: ET.accent))
          : Column(
              children: [
                Expanded(
                  child: _addresses.isEmpty
                      ? _emptyState()
                      : RefreshIndicator(
                          color: ET.accent,
                          onRefresh: _loadAddresses,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
                            itemCount: _addresses.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 12),
                            itemBuilder: (_, i) => _addressCard(_addresses[i]),
                          ),
                        ),
                ),
                _bottomCta(bottomPad),
              ],
            ),
    );
  }

  Widget _emptyState() {
    return ListView(
      children: [
        const SizedBox(height: 120),
        Center(
          child: Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
                color: ET.accentSoft, borderRadius: BorderRadius.circular(24)),
            child: const Icon(Icons.location_on_outlined,
                size: 34, color: ET.accent),
          ),
        ),
        const SizedBox(height: 16),
        const Center(
            child: Text('还没有上门地址',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: ET.ink))),
        const SizedBox(height: 6),
        const Center(
            child: Text('添加常用地址，预约上门服务更方便',
                style: TextStyle(fontSize: 13, color: ET.inkMuted))),
      ],
    );
  }

  Widget _addressCard(ClientAddress addr) {
    return GestureDetector(
      onTap: () => _openForm(existing: addr),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: ET.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: ET.hairline),
          boxShadow: ET.shadowTile,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                      color: ET.accentSoft,
                      borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.location_on_rounded,
                      size: 20, color: ET.accent),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(addr.contactName ?? '未命名',
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: ET.ink)),
                          ),
                          if (addr.contactPhone != null &&
                              addr.contactPhone!.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            Text(addr.contactPhone!,
                                style: const TextStyle(
                                    fontSize: 13, color: ET.inkSecondary)),
                          ],
                          if (addr.isDefault) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                  color: ET.accentSoft,
                                  borderRadius: BorderRadius.circular(999)),
                              child: const Text('默认',
                                  style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: ET.accent)),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(addr.fullAddress,
                          style: const TextStyle(
                              fontSize: 13,
                              height: 1.5,
                              color: ET.inkSecondary)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded,
                    size: 20, color: ET.inkMuted),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(height: 1, color: ET.hairlineFaint),
            const SizedBox(height: 4),
            Row(
              children: [
                _cardAction(
                  icon: addr.isDefault
                      ? Icons.check_circle_rounded
                      : Icons.radio_button_unchecked_rounded,
                  label: addr.isDefault ? '默认地址' : '设为默认',
                  color: addr.isDefault ? ET.accent : ET.inkSecondary,
                  onTap: addr.isDefault ? null : () => _setDefault(addr.id),
                ),
                const Spacer(),
                _cardAction(
                    icon: Icons.edit_outlined,
                    label: '编辑',
                    color: ET.inkSecondary,
                    onTap: () => _openForm(existing: addr)),
                const SizedBox(width: 4),
                _cardAction(
                    icon: Icons.delete_outline_rounded,
                    label: '删除',
                    color: DT.error,
                    onTap: () => _deleteAddress(addr)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _cardAction(
      {required IconData icon,
      required String label,
      required Color color,
      VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 4),
          Text(label,
              style: TextStyle(
                  fontSize: 13, color: color, fontWeight: FontWeight.w500)),
        ]),
      ),
    );
  }

  Widget _bottomCta(double bottomPad) {
    return Container(
      padding: EdgeInsets.fromLTRB(16, 10, 16, bottomPad + 12),
      decoration: BoxDecoration(
        color: ET.surface,
        border: Border(top: BorderSide(color: ET.hairlineFaint, width: 0.5)),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 50,
        child: ElevatedButton.icon(
          onPressed: () => _openForm(),
          icon: const Icon(Icons.add_rounded, size: 20),
          label: const Text('新增地址',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          style: ElevatedButton.styleFrom(
            backgroundColor: ET.cream,
            foregroundColor: ET.onCream,
            elevation: 0,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999)),
          ),
        ),
      ),
    );
  }
}

// ───────── 新增/编辑地址表单（毛玻璃底部弹层 + 省市区联动）─────────

class _AddressFormSheet extends StatefulWidget {
  final ClientAddress? existing;
  final bool isFirst;
  const _AddressFormSheet({this.existing, required this.isFirst});

  @override
  State<_AddressFormSheet> createState() => _AddressFormSheetState();
}

class _AddressFormSheetState extends State<_AddressFormSheet> {
  late final _nameCtl =
      TextEditingController(text: widget.existing?.contactName ?? '');
  late final _phoneCtl =
      TextEditingController(text: widget.existing?.contactPhone ?? '');
  late final _detailCtl =
      TextEditingController(text: widget.existing?.detailAddress ?? '');
  late final _doorCtl =
      TextEditingController(text: widget.existing?.doorInfo ?? '');
  late RegionValue _region = RegionValue(
    province: widget.existing?.province ?? '',
    city: widget.existing?.city ?? '',
    district: widget.existing?.district ?? '',
  );
  late bool _isDefault = widget.existing?.isDefault ?? widget.isFirst;
  bool _saving = false;

  bool get _isEdit => widget.existing != null;

  @override
  void dispose() {
    _nameCtl.dispose();
    _phoneCtl.dispose();
    _detailCtl.dispose();
    _doorCtl.dispose();
    super.dispose();
  }

  Future<void> _pickRegion() async {
    FocusScope.of(context).unfocus();
    final v = await showRegionPicker(context, initial: _region);
    if (v != null && mounted) setState(() => _region = v);
  }

  Future<void> _save() async {
    if (_nameCtl.text.trim().isEmpty) {
      NbToast.error(context, '请填写联系人姓名');
      return;
    }
    if (_phoneCtl.text.trim().isEmpty) {
      NbToast.error(context, '请填写联系电话');
      return;
    }
    if (!_region.isComplete) {
      NbToast.error(context, '请选择所在地区');
      return;
    }
    if (_detailCtl.text.trim().isEmpty) {
      NbToast.error(context, '请填写详细地址');
      return;
    }

    setState(() => _saving = true);
    try {
      final service = ClientAddressService(context.read<ApiClient>());
      final data = {
        'contactName': _nameCtl.text.trim(),
        'contactPhone': _phoneCtl.text.trim(),
        'province': _region.province,
        'city': _region.city,
        'district': _region.district,
        'detailAddress': _detailCtl.text.trim(),
        'doorInfo': _doorCtl.text.trim(),
        'isDefault': _isDefault,
      };
      if (_isEdit) {
        await service.update(widget.existing!.id, data);
      } else {
        await service.create(data);
      }
      if (mounted) {
        Navigator.pop(context, true);
        NbToast.success(context, '地址已保存');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _saving = false);
        NbToast.error(context, '保存失败，请重试');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final viewInsets = MediaQuery.of(context).viewInsets.bottom;
    final bottomPad = MediaQuery.of(context).padding.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: Container(
            decoration: BoxDecoration(
              color: ET.bgElevated.withValues(alpha: 0.96),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(28)),
              border: const Border(
                  top: BorderSide(color: ET.hairline, width: 0.5)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // top bar
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 10, 8, 4),
                  child: Row(
                    children: [
                      const SizedBox(width: 40),
                      Expanded(
                        child: Center(
                          child: Text(_isEdit ? '编辑地址' : '新增地址',
                              style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: ET.ink)),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded,
                            size: 22, color: ET.inkSecondary),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 6, 20, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Expanded(
                              child: _field('联系人', _nameCtl, hint: '收件人姓名')),
                          const SizedBox(width: 12),
                          Expanded(
                              child: _field('手机号', _phoneCtl,
                                  hint: '联系电话', keyboard: TextInputType.phone)),
                        ]),
                        const SizedBox(height: 14),
                        _label('所在地区'),
                        const SizedBox(height: 8),
                        _regionField(),
                        const SizedBox(height: 14),
                        _field('详细地址', _detailCtl,
                            hint: '街道、小区、楼栋、门牌号等', maxLines: 2),
                        const SizedBox(height: 14),
                        _field('门禁信息（选填）', _doorCtl, hint: '如门禁密码、单元号等'),
                        const SizedBox(height: 16),
                        _defaultToggle(),
                      ],
                    ),
                  ),
                ),
                // save
                Padding(
                  padding: EdgeInsets.fromLTRB(20, 4, 20, bottomPad + 16),
                  child: SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _saving ? null : _save,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ET.cream,
                        foregroundColor: ET.onCream,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(999)),
                      ),
                      child: _saving
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: ET.onCream))
                          : Text(_isEdit ? '保存修改' : '保存地址',
                              style: const TextStyle(
                                  fontSize: 16, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(String t) => Text(t,
      style: const TextStyle(
          fontSize: 13, fontWeight: FontWeight.w500, color: ET.ink));

  Widget _field(String label, TextEditingController ctl,
      {String? hint, TextInputType? keyboard, int maxLines = 1}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _label(label),
        const SizedBox(height: 8),
        TextField(
          controller: ctl,
          keyboardType: keyboard,
          maxLines: maxLines,
          cursorColor: ET.accent,
          style: const TextStyle(fontSize: 14, color: ET.ink),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: ET.inkMuted, fontSize: 14),
            filled: true,
            fillColor: ET.surface,
            isDense: true,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide.none),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide.none),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: ET.accent, width: 1.4)),
          ),
        ),
      ],
    );
  }

  Widget _regionField() {
    final has = _region.isComplete;
    return GestureDetector(
      onTap: _pickRegion,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
            color: ET.surface, borderRadius: BorderRadius.circular(14)),
        child: Row(
          children: [
            const Icon(Icons.map_outlined, size: 18, color: ET.accent),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                has ? _region.display : '请选择省 / 市 / 区',
                style: TextStyle(
                    fontSize: 14, color: has ? ET.ink : ET.inkMuted),
              ),
            ),
            const Icon(Icons.chevron_right_rounded,
                size: 20, color: ET.inkMuted),
          ],
        ),
      ),
    );
  }

  Widget _defaultToggle() {
    return GestureDetector(
      onTap: () => setState(() => _isDefault = !_isDefault),
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('设为默认地址',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: ET.ink)),
                SizedBox(height: 3),
                Text('预约上门时优先使用此地址',
                    style: TextStyle(fontSize: 12, color: ET.inkMuted)),
              ],
            ),
          ),
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: 48,
            height: 28,
            decoration: BoxDecoration(
              color: _isDefault ? ET.accent : ET.hairlineStrong,
              borderRadius: BorderRadius.circular(999),
            ),
            child: AnimatedAlign(
              duration: const Duration(milliseconds: 180),
              alignment:
                  _isDefault ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                width: 22,
                height: 22,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: const BoxDecoration(
                    color: Colors.white, shape: BoxShape.circle),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
