import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/editorial_tokens.dart';
import '../auth/client_auth_service.dart';

class ClientWelcomeScreen extends StatefulWidget {
  const ClientWelcomeScreen({super.key});

  @override
  State<ClientWelcomeScreen> createState() => _ClientWelcomeScreenState();
}

class _ClientWelcomeScreenState extends State<ClientWelcomeScreen> {
  final _nicknameCtl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nicknameCtl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final nickname = _nicknameCtl.text.trim();
    if (nickname.isEmpty) {
      setState(() => _error = '请输入您的称呼');
      return;
    }
    if (nickname.length < 2) {
      setState(() => _error = '称呼至少需要2个字符');
      return;
    }

    setState(() { _loading = true; _error = null; });
    try {
      final api = context.read<ApiClient>();
      api.setRole('client');
      await ClientAuthService(api).updateProfile(nickname: nickname);
      if (mounted) context.go('/client/home');
    } catch (_) {
      if (mounted) setState(() => _error = '保存失败，请重试');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _skip() async {
    setState(() => _loading = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('client');
      final profile = await ClientAuthService(api).getProfile();
      final phone = profile['phone']?.toString() ?? '';
      final defaultName = phone.length >= 4 ? '用户${phone.substring(phone.length - 4)}' : '用户';
      await ClientAuthService(api).updateProfile(nickname: defaultName);
      if (mounted) context.go('/client/home');
    } catch (_) {
      if (mounted) context.go('/client/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: ET.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              SizedBox(height: topPad + 40),
              // Icon
              Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  gradient: const LinearGradient(colors: [ET.accent, ET.accentDeep]),
                  boxShadow: ET.shadowCard,
                ),
                alignment: Alignment.center,
                child: const Icon(Icons.palette_outlined, size: 36, color: ET.onCream),
              ),
              const SizedBox(height: 24),
              const Text('欢迎使用 NailArt',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: ET.ink)),
              const SizedBox(height: 8),
              Text('让我们更好地了解您',
                style: TextStyle(fontSize: 15, color: ET.inkMuted)),
              const SizedBox(height: 48),
              // Nickname input
              Align(
                alignment: Alignment.centerLeft,
                child: Text('您希望如何被称呼？',
                  style: TextStyle(fontSize: 14, color: ET.inkSecondary)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _nicknameCtl,
                cursorColor: ET.accent,
                style: const TextStyle(fontSize: 16, color: ET.ink),
                decoration: InputDecoration(
                  hintText: '请输入您的昵称',
                  hintStyle: TextStyle(fontSize: 15, color: ET.inkMuted),
                  filled: true,
                  fillColor: ET.surface,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: ET.hairline),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: ET.hairline),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: ET.accent, width: 1.5),
                  ),
                  errorText: _error,
                ),
              ),
              const SizedBox(height: 32),
              // Submit button
              GestureDetector(
                onTap: _loading ? null : _submit,
                child: Container(
                  width: double.infinity,
                  height: 52,
                  decoration: BoxDecoration(
                    color: ET.cream,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: ET.shadowCard,
                  ),
                  alignment: Alignment.center,
                  child: Text(_loading ? '保存中...' : '开始使用',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: ET.onCream)),
                ),
              ),
              const SizedBox(height: 16),
              // Skip button
              GestureDetector(
                onTap: _loading ? null : _skip,
                child: Text('暂时跳过',
                  style: TextStyle(fontSize: 14, color: ET.inkMuted)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
