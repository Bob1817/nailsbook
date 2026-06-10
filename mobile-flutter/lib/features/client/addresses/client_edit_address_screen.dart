import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/theme/editorial_tokens.dart';
import 'client_address_service.dart';
import '../../../core/widgets/nb_toast.dart';

class ClientEditAddressScreen extends StatefulWidget {
  final int? addressId;
  const ClientEditAddressScreen({super.key, this.addressId});

  @override
  State<ClientEditAddressScreen> createState() => _ClientEditAddressScreenState();
}

class _ClientEditAddressScreenState extends State<ClientEditAddressScreen> {
  final _nameCtl = TextEditingController();
  final _phoneCtl = TextEditingController();
  final _provinceCtl = TextEditingController();
  final _cityCtl = TextEditingController();
  final _districtCtl = TextEditingController();
  final _detailCtl = TextEditingController();
  final _doorCtl = TextEditingController();

  bool _isDefault = false;
  bool _loading = false;
  bool _saving = false;

  bool get _isEdit => widget.addressId != null;

  @override
  void initState() {
    super.initState();
    if (_isEdit) _loadAddress();
  }

  Future<void> _loadAddress() async {
    setState(() => _loading = true);
    try {
      final api = context.read<ApiClient>();
      final addrs = await ClientAddressService(api).list();
      final addr = addrs.firstWhere((a) => a.id == widget.addressId, orElse: () => addrs.first);
      if (mounted) {
        setState(() {
          _nameCtl.text = addr.contactName ?? '';
          _phoneCtl.text = addr.contactPhone ?? '';
          _provinceCtl.text = addr.province ?? '';
          _cityCtl.text = addr.city ?? '';
          _districtCtl.text = addr.district ?? '';
          _detailCtl.text = addr.detailAddress ?? '';
          _doorCtl.text = addr.doorInfo ?? '';
          _isDefault = addr.isDefault;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _nameCtl.dispose();
    _phoneCtl.dispose();
    _provinceCtl.dispose();
    _cityCtl.dispose();
    _districtCtl.dispose();
    _detailCtl.dispose();
    _doorCtl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_nameCtl.text.trim().isEmpty) {
      _showError('请填写联系人姓名');
      return;
    }
    if (_phoneCtl.text.trim().isEmpty) {
      _showError('请填写联系电话');
      return;
    }
    if (_detailCtl.text.trim().isEmpty) {
      _showError('请填写详细地址');
      return;
    }

    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>();
      final service = ClientAddressService(api);
      final data = {
        'contactName': _nameCtl.text.trim(),
        'contactPhone': _phoneCtl.text.trim(),
        'province': _provinceCtl.text.trim(),
        'city': _cityCtl.text.trim(),
        'district': _districtCtl.text.trim(),
        'detailAddress': _detailCtl.text.trim(),
        'doorInfo': _doorCtl.text.trim(),
        'isDefault': _isDefault,
      };
      if (_isEdit) {
        await service.update(widget.addressId!, data);
      } else {
        await service.create(data);
      }
      if (mounted) {
        NbToast.show(context, '地址已保存');
        context.pop(true);
      }
    } catch (e) {
      if (mounted) _showError('保存失败，请重试');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showError(String msg) {
    NbToast.show(context, msg);
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Container(
      color: ET.bg,
      child: _loading
          ? _buildSkeleton(topPad)
          : Stack(
              children: [
                ListView(
                  padding: EdgeInsets.fromLTRB(20, topPad + 8, 20, 100 + bottomPad),
                  children: [
                    _buildHeader(),
                    const SizedBox(height: 20),
                    _buildContactCard(),
                    const SizedBox(height: 14),
                    _buildAddressCard(),
                    const SizedBox(height: 14),
                    _buildDefaultCard(),
                    const SizedBox(height: 24),
                  ],
                ),
                // Fixed save button
                Positioned(
                  left: 0, right: 0, bottom: 0,
                  child: _buildBottomSave(bottomPad),
                ),
              ],
            ),
    );
  }

  // ── Header ──

  Widget _buildHeader() {
    return Row(
      children: [
        GestureDetector(
          onTap: () => context.pop(),
          child: Container(
            width: 44, height: 44,
            decoration: const BoxDecoration(
              color: ET.surface,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: ET.inkSecondary),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_isEdit ? '编辑地址' : '添加地址',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: -0.3, color: ET.ink)),
            ],
          ),
        ),
      ],
    );
  }

  // ── Contact Card ──

  Widget _buildContactCard() {
    return _glassSection(
      title: '联系人信息',
      subtitle: '填写上门服务时需要联系的收件人信息',
      children: [
        _inputField('联系人姓名', _nameCtl, TextInputType.name, hint: '请输入联系人姓名'),
        const SizedBox(height: 12),
        _inputField('联系电话', _phoneCtl, TextInputType.phone, hint: '请输入联系电话'),
      ],
    );
  }

  // ── Address Card ──

  Widget _buildAddressCard() {
    return _glassSection(
      title: '服务地址',
      subtitle: '补充你的常用上门服务地点与门禁信息',
      children: [
        // Province / City / District in a row
        Row(
          children: [
            Expanded(child: _inputField('省', _provinceCtl, TextInputType.text, hint: '省', compact: true)),
            const SizedBox(width: 10),
            Expanded(child: _inputField('市', _cityCtl, TextInputType.text, hint: '市', compact: true)),
            const SizedBox(width: 10),
            Expanded(child: _inputField('区', _districtCtl, TextInputType.text, hint: '区', compact: true)),
          ],
        ),
        const SizedBox(height: 12),
        _inputField('详细地址', _detailCtl, TextInputType.text, hint: '请输入详细地址，如街道、门牌号等', maxLines: 2),
        const SizedBox(height: 12),
        _inputField('门禁信息（选填）', _doorCtl, TextInputType.text, hint: '如：小区门禁、楼栋号、单元号等'),
      ],
    );
  }

  // ── Default Toggle Card ──

  Widget _buildDefaultCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: ET.surface,
        borderRadius: BorderRadius.circular(28),
        boxShadow: ET.shadowCard,
        border: Border.all(color: ET.hairline),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('设为默认地址',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: ET.ink)),
                const SizedBox(height: 4),
                Text('后续预约时会优先使用这个地址',
                  style: TextStyle(fontSize: 12, color: ET.inkMuted)),
              ],
            ),
          ),
          GestureDetector(
            onTap: () => setState(() => _isDefault = !_isDefault),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 48, height: 28,
              decoration: BoxDecoration(
                color: _isDefault ? ET.accent : ET.hairlineStrong,
                borderRadius: BorderRadius.circular(999),
              ),
              child: AnimatedAlign(
                duration: const Duration(milliseconds: 200),
                alignment: _isDefault ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  width: 22, height: 22,
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4, offset: const Offset(0, 1))],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Bottom Save ──

  Widget _buildBottomSave(double bottomPad) {
    return ClipRRect(
      child: Container(
        padding: EdgeInsets.fromLTRB(20, 12, 20, bottomPad + 12),
        decoration: const BoxDecoration(
          color: ET.bgElevated,
          border: Border(top: BorderSide(color: ET.hairline, width: 1)),
        ),
        child: SizedBox(
          width: double.infinity, height: 52,
          child: ElevatedButton(
            onPressed: _saving ? null : _save,
            style: ElevatedButton.styleFrom(
              backgroundColor: ET.cream,
              foregroundColor: ET.onCream,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              elevation: 0,
            ),
            child: _saving
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: ET.onCream))
                : Text(_isEdit ? '保存修改' : '保存',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ),
        ),
      ),
    );
  }

  // ── Glass Section Helper ──

  Widget _glassSection({required String title, required String subtitle, required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: ET.surface,
        borderRadius: BorderRadius.circular(28),
        boxShadow: ET.shadowCard,
        border: Border.all(color: ET.hairline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: ET.ink)),
          const SizedBox(height: 4),
          Text(subtitle, style: TextStyle(fontSize: 13, color: ET.inkMuted)),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  // ── Input Field ──

  Widget _inputField(String label, TextEditingController ctl, TextInputType type, {String? hint, int maxLines = 1, bool compact = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!compact) ...[
          Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: ET.ink)),
          const SizedBox(height: 8),
        ],
        Container(
          decoration: BoxDecoration(
            color: ET.bgElevated,
            borderRadius: BorderRadius.circular(compact ? 14 : 16),
          ),
          child: TextField(
            controller: ctl,
            keyboardType: type,
            cursorColor: ET.accent,
            maxLines: maxLines,
            style: const TextStyle(fontSize: 14, color: ET.ink),
            decoration: InputDecoration(
              labelText: compact ? label : null,
              labelStyle: TextStyle(fontSize: compact ? 12 : 14, color: ET.inkMuted),
              hintText: hint,
              hintStyle: TextStyle(color: ET.inkMuted, fontSize: compact ? 12 : 14),
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(horizontal: compact ? 12 : 16, vertical: compact ? 12 : 14),
              isDense: compact,
            ),
          ),
        ),
      ],
    );
  }

  // ── Skeleton ──

  Widget _buildSkeleton(double topPad) {
    return ListView(
      padding: EdgeInsets.fromLTRB(20, topPad + 8, 20, 24),
      children: [
        Row(children: [
          Container(width: 44, height: 44, decoration: BoxDecoration(color: ET.surface, shape: BoxShape.circle)),
          const SizedBox(width: 14),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(width: 80, height: 10, decoration: BoxDecoration(color: ET.surface, borderRadius: BorderRadius.circular(4))),
            const SizedBox(height: 6),
            Container(width: 60, height: 20, decoration: BoxDecoration(color: ET.surface, borderRadius: BorderRadius.circular(4))),
          ]),
        ]),
        const SizedBox(height: 20),
        Container(height: 200, decoration: BoxDecoration(color: ET.surface, borderRadius: BorderRadius.circular(28))),
        const SizedBox(height: 14),
        Container(height: 280, decoration: BoxDecoration(color: ET.surface, borderRadius: BorderRadius.circular(28))),
        const SizedBox(height: 14),
        Container(height: 60, decoration: BoxDecoration(color: ET.surface, borderRadius: BorderRadius.circular(28))),
      ],
    );
  }
}
