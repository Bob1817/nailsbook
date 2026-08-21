import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/media/image_pick.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/theme/editorial_tokens.dart';
import '../../../core/widgets/client_detail_back_button.dart';
import '../auth/client_auth_service.dart';
import '../../../core/widgets/nb_toast.dart';

class ClientEditProfileScreen extends StatefulWidget {
  final String? currentNickname;
  final String? currentAvatarUrl;

  const ClientEditProfileScreen(
      {super.key, this.currentNickname, this.currentAvatarUrl});

  @override
  State<ClientEditProfileScreen> createState() =>
      _ClientEditProfileScreenState();
}

class _ClientEditProfileScreenState extends State<ClientEditProfileScreen> {
  late TextEditingController _nicknameCtl;
  String? _avatarUrl;
  late String _initialNickname;
  String? _initialAvatarUrl;
  bool _saving = false;
  bool _uploadingAvatar = false;

  @override
  void initState() {
    super.initState();
    _initialNickname = widget.currentNickname ?? '';
    _initialAvatarUrl = widget.currentAvatarUrl;
    _nicknameCtl = TextEditingController(text: _initialNickname);
    _nicknameCtl.addListener(_onProfileChanged);
    _avatarUrl = widget.currentAvatarUrl;
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final api = context.read<ApiClient>();
      final data = await ClientAuthService(api).getProfile();
      final client = (data['client'] as Map<String, dynamic>?) ?? data;
      if (mounted) {
        setState(() {
          _initialNickname =
              client['nickname']?.toString() ?? _nicknameCtl.text;
          _initialAvatarUrl = client['avatarUrl']?.toString() ?? _avatarUrl;
          _nicknameCtl.text = _initialNickname;
          _avatarUrl = _initialAvatarUrl;
        });
      }
    } catch (_) {/* 用构造入参兜底 */}
  }

  @override
  void dispose() {
    _nicknameCtl.removeListener(_onProfileChanged);
    _nicknameCtl.dispose();
    super.dispose();
  }

  bool get _hasChanges =>
      _nicknameCtl.text.trim() != _initialNickname.trim() ||
      _avatarUrl != _initialAvatarUrl;

  void _onProfileChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _pickAvatar() async {
    final file = await ImagePick.avatar();
    if (file == null) return;
    if (!mounted) return;
    setState(() => _uploadingAvatar = true);
    try {
      final api = context.read<ApiClient>();
      final resp =
          await api.uploadMultipart('/uploads/image', file.path, 'file');
      final body = await resp.stream.bytesToString();
      final json = jsonDecode(body) as Map<String, dynamic>;
      final url = json['url'] as String?;
      if (url != null && mounted) setState(() => _avatarUrl = url);
    } catch (_) {
      if (mounted) _showError('头像上传失败');
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _save() async {
    final nickname = _nicknameCtl.text.trim();
    if (nickname.isEmpty) {
      _showError('昵称不能为空');
      return;
    }
    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>();
      await ClientAuthService(api)
          .updateProfile(nickname: nickname, avatarUrl: _avatarUrl);
      if (mounted) {
        NbToast.show(context, '资料已更新');
        Navigator.pop(context, true);
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
    final hasChanges = _hasChanges;

    return Scaffold(
      backgroundColor: ET.bg,
      body: Stack(
        children: [
          ListView(
            padding: EdgeInsets.fromLTRB(
                20, topPad + 8, 20, (hasChanges ? 100 : 24) + bottomPad),
            children: [
              _buildHeader(),
              const SizedBox(height: 24),
              _buildAvatarSection(),
              const SizedBox(height: 16),
              _buildNicknameCard(),
            ],
          ),
          // Fixed save button
          if (hasChanges)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _buildBottomSave(bottomPad),
            ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        ClientDetailBackButton(onTap: () => Navigator.pop(context)),
        const SizedBox(width: 12),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('编辑资料', style: DT.titleMedium),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAvatarSection() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: ET.surface,
        borderRadius: BorderRadius.circular(28),
        boxShadow: ET.shadowCard,
        border: Border.all(color: ET.hairline),
      ),
      child: Column(
        children: [
          GestureDetector(
            onTap: _uploadingAvatar ? null : _pickAvatar,
            child: Stack(
              children: [
                Container(
                  width: 96,
                  height: 96,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: ET.accentSoft,
                  ),
                  child: ClipOval(
                    child: _avatarUrl != null
                        ? Image.network(_avatarUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                                  color: ET.bgElevated,
                                  child: const Icon(
                                      Icons.person_outline_rounded,
                                      size: 40,
                                      color: ET.inkMuted),
                                ))
                        : const Icon(Icons.person_outline_rounded,
                            size: 40, color: ET.accentOnDark),
                  ),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: ET.accent,
                      shape: BoxShape.circle,
                      border: Border.all(color: ET.bgElevated, width: 2),
                    ),
                    child: _uploadingAvatar
                        ? const Padding(
                            padding: EdgeInsets.all(7),
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: ET.onCream),
                          )
                        : const Icon(Icons.camera_alt_outlined,
                            color: ET.onCream, size: 16),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Text('点击头像更换',
              style: TextStyle(fontSize: 13, color: ET.inkMuted)),
        ],
      ),
    );
  }

  Widget _buildNicknameCard() {
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
          const Text('昵称',
              style: TextStyle(
                  fontSize: 17, fontWeight: FontWeight.w600, color: ET.ink)),
          const SizedBox(height: 4),
          const Text('设置你在平台上的显示名称',
              style: TextStyle(fontSize: 13, color: ET.inkMuted)),
          const SizedBox(height: 14),
          Container(
            constraints: const BoxConstraints(minHeight: 56),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(16)),
            child: TextField(
              controller: _nicknameCtl,
              maxLength: 20,
              cursorColor: ET.accent,
              style: const TextStyle(fontSize: 15, color: ET.ink),
              decoration: InputDecoration(
                filled: true,
                fillColor: ET.bgElevated,
                hintText: '请输入昵称',
                hintStyle: const TextStyle(color: ET.inkMuted),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: ET.hairlineStrong),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: ET.hairlineStrong),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: ET.accent, width: 1.2),
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                counterStyle: const TextStyle(fontSize: 11, color: ET.inkMuted),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomSave(double bottomPad) {
    return ClipRRect(
      child: Container(
        padding: EdgeInsets.fromLTRB(20, 12, 20, bottomPad + 12),
        decoration: const BoxDecoration(
          color: ET.bgElevated,
          border: Border(top: BorderSide(color: ET.hairline, width: 1)),
        ),
        child: SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _saving ? null : _save,
            style: ElevatedButton.styleFrom(
              backgroundColor: ET.cream,
              foregroundColor: ET.onCream,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(999)),
              elevation: 0,
            ),
            child: _saving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: ET.onCream))
                : const Text('保存',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ),
        ),
      ),
    );
  }
}
