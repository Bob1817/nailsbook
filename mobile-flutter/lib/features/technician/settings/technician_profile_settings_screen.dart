import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/media/image_pick.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/technician_auth_service.dart';
import '../auth/technician_auth_models.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

class TechnicianProfileSettingsScreen extends StatefulWidget {
  const TechnicianProfileSettingsScreen({super.key});

  @override
  State<TechnicianProfileSettingsScreen> createState() =>
      _TechnicianProfileSettingsScreenState();
}

class _TechnicianProfileSettingsScreenState
    extends State<TechnicianProfileSettingsScreen> {
  final _nameCtl = TextEditingController();
  final _cityCtl = TextEditingController();
  final _areaCtl = TextEditingController();
  final _weiboCtl = TextEditingController();
  final _xiaohongshuCtl = TextEditingController();
  final _douyinCtl = TextEditingController();
  final _kuaishouCtl = TextEditingController();
  final _wechatCtl = TextEditingController();
  final _phoneCtl = TextEditingController();

  TechnicianProfile? _profile;
  String? _avatarUrl;
  bool _loading = true;
  bool _saving = false;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nameCtl.dispose();
    _cityCtl.dispose();
    _areaCtl.dispose();
    _weiboCtl.dispose();
    _xiaohongshuCtl.dispose();
    _douyinCtl.dispose();
    _kuaishouCtl.dispose();
    _wechatCtl.dispose();
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
          _profile = p;
          _avatarUrl = p.avatarUrl;
          _nameCtl.text = p.name;
          _cityCtl.text = p.city ?? '';
          _areaCtl.text = p.serviceArea ?? '';
          _phoneCtl.text = p.phone ?? '';
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickAvatar() async {
    HapticFeedback.lightImpact();
    final file = await ImagePick.avatar();
    if (file == null) return;

    setState(() => _uploading = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      final res =
          await api.uploadMultipart('/uploads/image', file.path, 'file');
      final body = await res.stream.bytesToString();
      final decoded = _parseJson(body);
      if (mounted) setState(() => _avatarUrl = decoded['url']?.toString());
    } catch (_) {
      if (mounted) {
        NbToast.show(context, '头像上传失败');
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Map<String, dynamic> _parseJson(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (_) {}
    return {};
  }

  Future<void> _save() async {
    HapticFeedback.mediumImpact();
    final name = _nameCtl.text.trim();
    if (name.isEmpty) {
      NbToast.show(context, '请输入美甲师名称');
      return;
    }

    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      await TechnicianAuthService(api).updateProfile({
        'name': name,
        'city': _cityCtl.text.trim().isEmpty ? null : _cityCtl.text.trim(),
        'serviceArea':
            _areaCtl.text.trim().isEmpty ? null : _areaCtl.text.trim(),
        'avatarUrl': _avatarUrl,
      });
      if (mounted) {
        NbToast.show(context, '保存成功');
        Navigator.pop(context);
      }
    } catch (_) {
      if (mounted) {
        NbToast.show(context, '保存失败');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DT.bgWarm,
      appBar: GlassAppBar(
        technician: true,
        elevation: 0,
        leading: IconButton(
          icon:
              const Icon(CupertinoIcons.back, size: 20, color: DT.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('个人设置', style: DT.titleMedium),
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : Column(
              children: [
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(DT.xl),
                    children: [
                      // Basic info
                      _buildSectionTitle('基本信息', '用于展示您的服务身份与基础服务范围'),
                      const SizedBox(height: DT.md),
                      _buildAvatarSection(),
                      const SizedBox(height: DT.lg),
                      _buildCard([
                        _buildTextField('美甲师名称', _nameCtl, required: true),
                        _buildTextField('联系方式', _phoneCtl,
                            enabled: false, hint: '如需更换请联系客服'),
                        _buildTextField('所在城市', _cityCtl, hint: '如：北京市'),
                        _buildTextField('服务区域', _areaCtl,
                            hint: '如：朝阳区、海淀区', isLast: true),
                      ]),
                      const SizedBox(height: DT.xxl),
                      // Social media
                      _buildSectionTitle('社交媒体账号', '展示您的社交媒体主页，增加客户信任'),
                      const SizedBox(height: DT.md),
                      _buildCard([
                        _buildSocialField('微博', 'weibo.com', _weiboCtl),
                        _buildSocialField(
                            '小红书', 'xiaohongshu.com', _xiaohongshuCtl),
                        _buildSocialField('抖音', 'douyin.com', _douyinCtl),
                        _buildSocialField('快手', 'kuaishou.com', _kuaishouCtl),
                        _buildSocialField('微信', null, _wechatCtl, isLast: true),
                      ]),
                    ],
                  ),
                ),
                // Save button
                Container(
                  padding: EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl,
                      DT.md + MediaQuery.of(context).padding.bottom),
                  decoration: BoxDecoration(
                    color: DT.surface.withValues(alpha: 0.82),
                    border: const Border(top: BorderSide(color: DT.divider)),
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _saving ? null : _save,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: DT.cream,
                        foregroundColor: DT.onCream,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(DT.lg)),
                        elevation: 0,
                      ),
                      child: Text(_saving ? '保存中...' : '保存设置',
                          style: DT.bodyLarge.copyWith(
                              fontWeight: FontWeight.w600,
                              color: Colors.white)),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildSectionTitle(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: DT.titleMedium),
        const SizedBox(height: 2),
        Text(subtitle, style: DT.captionLarge),
      ],
    );
  }

  Widget _buildAvatarSection() {
    return Center(
      child: Column(
        children: [
          GestureDetector(
            onTap: _uploading ? null : _pickAvatar,
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: DT.primarySoft,
                border: Border.all(color: DT.avatarBorder),
              ),
              child: _uploading
                  ? const CircularProgressIndicator(
                      color: DT.primary, strokeWidth: 2)
                  : ClipOval(
                      child: _avatarUrl != null && _avatarUrl!.isNotEmpty
                          ? Image.network(_avatarUrl!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Center(
                                  child: Text(
                                      _nameCtl.text.isNotEmpty
                                          ? _nameCtl.text.substring(0, 1)
                                          : '美',
                                      style: DT.displaySmall
                                          .copyWith(color: DT.primary))))
                          : Center(
                              child: Text(
                                  _nameCtl.text.isNotEmpty
                                      ? _nameCtl.text.substring(0, 1)
                                      : '美',
                                  style: DT.displaySmall
                                      .copyWith(color: DT.primary))),
                    ),
            ),
          ),
          const SizedBox(height: DT.sm),
          Text('更换头像', style: DT.captionLarge),
        ],
      ),
    );
  }

  Widget _buildCard(List<Widget> children) {
    return Container(
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
      child: Column(children: children),
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController ctl, {
    bool enabled = true,
    String? hint,
    bool required = false,
    bool isLast = false,
  }) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(label,
                      style: DT.bodySmall.copyWith(
                          fontWeight: FontWeight.w500, color: DT.textPrimary)),
                  if (required)
                    Text(' *', style: DT.bodySmall.copyWith(color: DT.error)),
                ],
              ),
              const SizedBox(height: DT.sm),
              TextField(
                controller: ctl,
                enabled: enabled,
                style: DT.titleSmall.copyWith(
                  color: enabled ? DT.textPrimary : DT.textMuted,
                ),
                decoration: InputDecoration(
                  hintText: hint,
                  hintStyle: DT.bodyMedium.copyWith(color: DT.textMuted),
                  filled: true,
                  fillColor: enabled ? DT.fillWarm : DT.fillGrey,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: DT.md, vertical: DT.md),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(DT.rMd),
                    borderSide: const BorderSide(color: DT.borderPink),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(DT.rMd),
                    borderSide: const BorderSide(color: DT.borderPink),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(DT.rMd),
                    borderSide: const BorderSide(color: DT.primary, width: 1.5),
                  ),
                  disabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(DT.rMd),
                    borderSide: const BorderSide(color: DT.borderLight),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: DT.md),
        if (!isLast)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: DT.xl),
            child: Divider(height: 1, color: DT.dividerWarm),
          ),
      ],
    );
  }

  Widget _buildSocialField(
      String label, String? prefix, TextEditingController ctl,
      {bool isLast = false}) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: DT.bodySmall.copyWith(
                      fontWeight: FontWeight.w500, color: DT.textPrimary)),
              const SizedBox(height: DT.sm),
              TextField(
                controller: ctl,
                style: DT.titleSmall,
                decoration: InputDecoration(
                  hintText: prefix != null ? '$prefix/...' : '请输入账号',
                  hintStyle: DT.bodyMedium.copyWith(color: DT.textMuted),
                  prefixText: prefix != null ? '$prefix/' : null,
                  prefixStyle: DT.bodyMedium.copyWith(color: DT.textMuted),
                  filled: true,
                  fillColor: DT.fillWarm,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: DT.md, vertical: DT.md),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(DT.rMd),
                    borderSide: const BorderSide(color: DT.borderPink),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(DT.rMd),
                    borderSide: const BorderSide(color: DT.borderPink),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(DT.rMd),
                    borderSide: const BorderSide(color: DT.primary, width: 1.5),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: DT.md),
        if (!isLast)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: DT.xl),
            child: Divider(height: 1, color: DT.dividerWarm),
          ),
      ],
    );
  }
}
