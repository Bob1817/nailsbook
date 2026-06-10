import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/theme/editorial_tokens.dart';
import '../auth/client_auth_service.dart';
import '../../../core/widgets/nb_toast.dart';

class ClientEditProfileScreen extends StatefulWidget {
  final String? currentNickname;
  final String? currentAvatarUrl;

  const ClientEditProfileScreen({super.key, this.currentNickname, this.currentAvatarUrl});

  @override
  State<ClientEditProfileScreen> createState() => _ClientEditProfileScreenState();
}

class _ClientEditProfileScreenState extends State<ClientEditProfileScreen> {
  late TextEditingController _nicknameCtl;
  String? _avatarUrl;
  bool _saving = false;
  bool _uploadingAvatar = false;

  @override
  void initState() {
    super.initState();
    _nicknameCtl = TextEditingController(text: widget.currentNickname ?? '');
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
          _nicknameCtl.text = client['nickname']?.toString() ?? _nicknameCtl.text;
          _avatarUrl = client['avatarUrl']?.toString() ?? _avatarUrl;
        });
      }
    } catch (_) {/* 用构造入参兜底 */}
  }

  @override
  void dispose() {
    _nicknameCtl.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, maxWidth: 512, maxHeight: 512);
    if (file == null) return;
    setState(() => _uploadingAvatar = true);
    try {
      final api = context.read<ApiClient>();
      final resp = await api.uploadMultipart('/uploads/image', file.path, 'image');
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
      await ClientAuthService(api).updateProfile(nickname: nickname, avatarUrl: _avatarUrl);
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

    return Container(
      color: ET.bg,
      child: Stack(
        children: [
          ListView(
            padding: EdgeInsets.fromLTRB(20, topPad + 8, 20, 100 + bottomPad),
            children: [
              _buildHeader(),
              const SizedBox(height: 24),
              _buildAvatarSection(),
              const SizedBox(height: 16),
              _buildNicknameCard(),
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

  Widget _buildHeader() {
    return Row(
      children: [
        GestureDetector(
          onTap: () => Navigator.pop(context),
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
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('编辑资料', style: ET.displaySmall),
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
                  width: 96, height: 96,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: ET.accentSoft,
                  ),
                  child: ClipOval(
                    child: _avatarUrl != null
                        ? Image.network(_avatarUrl!, fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              color: ET.bgElevated,
                              child: const Icon(Icons.person_outline_rounded, size: 40, color: ET.inkMuted),
                            ))
                        : const Icon(Icons.person_outline_rounded, size: 40, color: ET.accentOnDark),
                  ),
                ),
                Positioned(
                  bottom: 0, right: 0,
                  child: Container(
                    width: 32, height: 32,
                    decoration: BoxDecoration(
                      color: ET.accent,
                      shape: BoxShape.circle,
                      border: Border.all(color: ET.bgElevated, width: 2),
                    ),
                    child: _uploadingAvatar
                        ? const Padding(
                            padding: EdgeInsets.all(7),
                            child: CircularProgressIndicator(strokeWidth: 2, color: ET.onCream),
                          )
                        : const Icon(Icons.camera_alt_outlined, color: ET.onCream, size: 16),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Text('点击头像更换', style: TextStyle(fontSize: 13, color: ET.inkMuted)),
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
          const Text('昵称', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: ET.ink)),
          const SizedBox(height: 4),
          const Text('设置你在平台上的显示名称', style: TextStyle(fontSize: 13, color: ET.inkMuted)),
          const SizedBox(height: 14),
          Container(
            decoration: BoxDecoration(
              color: ET.bgElevated,
              borderRadius: BorderRadius.circular(16),
            ),
            child: TextField(
              controller: _nicknameCtl,
              maxLength: 20,
              cursorColor: ET.accent,
              style: const TextStyle(fontSize: 15, color: ET.ink),
              decoration: const InputDecoration(
                hintText: '请输入昵称',
                hintStyle: TextStyle(color: ET.inkMuted),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                counterStyle: TextStyle(fontSize: 11, color: ET.inkMuted),
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
                : const Text('保存', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ),
        ),
      ),
    );
  }
}
