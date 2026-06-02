import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/client_auth_service.dart';

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
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('资料已更新'),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ));
        context.pop(true);
      }
    } catch (e) {
      if (mounted) _showError('保存失败，请重试');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: const Color(0xFFEF4444),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFFDFD), Color(0xFFF7F3F6), Color(0xFFF2F6FB)],
          stops: [0.0, 0.48, 1.0],
        ),
      ),
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
          onTap: () => context.pop(),
          child: Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.8),
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 24, offset: const Offset(0, 10))],
              border: Border.all(color: Colors.black.withOpacity(0.05)),
            ),
            child: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF64748B)),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('编辑资料', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: -0.3, color: DT.textPrimary)),
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
        color: Colors.white.withOpacity(0.88),
        borderRadius: BorderRadius.circular(28),
        boxShadow: DT.shadowMd,
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        children: [
          GestureDetector(
            onTap: _uploadingAvatar ? null : _pickAvatar,
            child: Stack(
              children: [
                Container(
                  width: 96, height: 96,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: _avatarUrl == null
                        ? const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [Color(0xFFFFE0EA), Color(0xFFF4F7FB)],
                          )
                        : null,
                    boxShadow: [BoxShadow(color: DT.primary.withOpacity(0.2), blurRadius: 20, offset: const Offset(0, 8))],
                  ),
                  child: ClipOval(
                    child: _avatarUrl != null
                        ? Image.network(_avatarUrl!, fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              color: const Color(0xFFF1F5F9),
                              child: const Icon(Icons.person_outline_rounded, size: 40, color: Color(0xFFCBD5E1)),
                            ))
                        : const Icon(Icons.person_outline_rounded, size: 40, color: DT.primary),
                  ),
                ),
                Positioned(
                  bottom: 0, right: 0,
                  child: Container(
                    width: 32, height: 32,
                    decoration: BoxDecoration(
                      color: DT.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                      boxShadow: [BoxShadow(color: DT.primary.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 2))],
                    ),
                    child: _uploadingAvatar
                        ? const Padding(
                            padding: EdgeInsets.all(7),
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.camera_alt_outlined, color: Colors.white, size: 16),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text('点击头像更换', style: TextStyle(fontSize: 13, color: DT.textMuted)),
        ],
      ),
    );
  }

  Widget _buildNicknameCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.88),
        borderRadius: BorderRadius.circular(28),
        boxShadow: DT.shadowMd,
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('昵称', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
          const SizedBox(height: 4),
          Text('设置你在平台上的显示名称', style: TextStyle(fontSize: 13, color: DT.textMuted)),
          const SizedBox(height: 14),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
            ),
            child: TextField(
              controller: _nicknameCtl,
              maxLength: 20,
              style: const TextStyle(fontSize: 15, color: DT.textPrimary),
              decoration: InputDecoration(
                hintText: '请输入昵称',
                hintStyle: TextStyle(color: DT.textMuted),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                counterStyle: TextStyle(fontSize: 11, color: DT.textMuted),
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
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: const Color(0xFFF1F5F9), width: 1)),
        ),
        child: SizedBox(
          width: double.infinity, height: 52,
          child: ElevatedButton(
            onPressed: _saving ? null : _save,
            style: ElevatedButton.styleFrom(
              backgroundColor: DT.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              elevation: 0,
            ),
            child: _saving
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('保存', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ),
        ),
      ),
    );
  }
}
