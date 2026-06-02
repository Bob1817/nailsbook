import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/technician_auth_service.dart';
import '../auth/technician_auth_models.dart';

class TechnicianProfileSettingsScreen extends StatefulWidget {
  const TechnicianProfileSettingsScreen({super.key});

  @override
  State<TechnicianProfileSettingsScreen> createState() => _TechnicianProfileSettingsScreenState();
}

class _TechnicianProfileSettingsScreenState extends State<TechnicianProfileSettingsScreen> {
  final _nameCtl = TextEditingController();
  final _cityCtl = TextEditingController();
  final _areaCtl = TextEditingController();
  final _weiboCtl = TextEditingController();
  final _xiaohongshuCtl = TextEditingController();
  final _douyinCtl = TextEditingController();
  final _kuaishouCtl = TextEditingController();
  final _wechatCtl = TextEditingController();

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
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (file == null) return;

    setState(() => _uploading = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      final res = await api.uploadMultipart('/uploads/image', file.path, 'file');
      final body = await res.stream.bytesToString();
      final decoded = _parseJson(body);
      if (mounted) setState(() => _avatarUrl = decoded['url']?.toString());
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('头像上传失败'),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ));
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
    final name = _nameCtl.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: const Text('请输入美甲师名称'),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ));
      return;
    }

    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      await TechnicianAuthService(api).updateProfile({
        'name': name,
        'city': _cityCtl.text.trim().isEmpty ? null : _cityCtl.text.trim(),
        'serviceArea': _areaCtl.text.trim().isEmpty ? null : _areaCtl.text.trim(),
        'avatarUrl': _avatarUrl,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('保存成功'),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ));
        Navigator.pop(context);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('保存失败'),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DT.bgWarm,
      appBar: AppBar(
        backgroundColor: Colors.white.withOpacity(0.95),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: DT.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('个人设置',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
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
                      // Basic info
                      _buildSectionTitle('基本信息', '用于展示您的服务身份与基础服务范围'),
                      const SizedBox(height: 12),
                      _buildAvatarSection(),
                      const SizedBox(height: 16),
                      _buildCard([
                        _buildTextField('美甲师名称', _nameCtl, required: true),
                        _buildTextField('联系方式', TextEditingController(text: _profile?.phone ?? ''),
                          enabled: false, hint: '如需更换请联系客服'),
                        _buildTextField('所在城市', _cityCtl, hint: '如：北京市'),
                        _buildTextField('服务区域', _areaCtl, hint: '如：朝阳区、海淀区', isLast: true),
                      ]),
                      const SizedBox(height: 24),
                      // Social media
                      _buildSectionTitle('社交媒体账号', '展示您的社交媒体主页，增加客户信任'),
                      const SizedBox(height: 12),
                      _buildCard([
                        _buildSocialField('微博', 'weibo.com', _weiboCtl),
                        _buildSocialField('小红书', 'xiaohongshu.com', _xiaohongshuCtl),
                        _buildSocialField('抖音', 'douyin.com', _douyinCtl),
                        _buildSocialField('快手', 'kuaishou.com', _kuaishouCtl),
                        _buildSocialField('微信', null, _wechatCtl, isLast: true),
                      ]),
                    ],
                  ),
                ),
                // Save button
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
                      child: Text(_saving ? '保存中...' : '保存设置',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
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
        Text(title,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
        const SizedBox(height: 2),
        Text(subtitle,
          style: TextStyle(fontSize: 12, color: DT.textMuted)),
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
              width: 80, height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: DT.primarySoft,
                border: Border.all(color: const Color(0xFFFFD9E6)),
              ),
              child: _uploading
                  ? const CircularProgressIndicator(color: DT.primary, strokeWidth: 2)
                  : ClipOval(
                      child: _avatarUrl != null && _avatarUrl!.isNotEmpty
                          ? Image.network(_avatarUrl!, fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Center(
                                child: Text(_nameCtl.text.isNotEmpty ? _nameCtl.text.substring(0, 1) : '美',
                                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w600, color: DT.primary))))
                          : Center(
                              child: Text(_nameCtl.text.isNotEmpty ? _nameCtl.text.substring(0, 1) : '美',
                                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w600, color: DT.primary))),
                    ),
            ),
          ),
          const SizedBox(height: 8),
          Text('更换头像',
            style: TextStyle(fontSize: 13, color: DT.textMuted)),
        ],
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

  Widget _buildTextField(String label, TextEditingController ctl, {
    bool enabled = true, String? hint, bool required = false, bool isLast = false,
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
                enabled: enabled,
                style: TextStyle(
                  fontSize: 15,
                  color: enabled ? DT.textPrimary : DT.textMuted,
                ),
                decoration: InputDecoration(
                  hintText: hint,
                  hintStyle: TextStyle(fontSize: 14, color: DT.textMuted),
                  filled: true,
                  fillColor: enabled ? const Color(0xFFFFF9F8) : const Color(0xFFF4F5F7),
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
                  disabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: Color(0xFFE8E8E8)),
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

  Widget _buildSocialField(String label, String? prefix, TextEditingController ctl, {bool isLast = false}) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: DT.textPrimary)),
              const SizedBox(height: 8),
              TextField(
                controller: ctl,
                style: const TextStyle(fontSize: 15, color: DT.textPrimary),
                decoration: InputDecoration(
                  hintText: prefix != null ? '$prefix/...' : '请输入账号',
                  hintStyle: TextStyle(fontSize: 14, color: DT.textMuted),
                  prefixText: prefix != null ? '$prefix/' : null,
                  prefixStyle: TextStyle(fontSize: 14, color: DT.textMuted),
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
}

