import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import 'client_auth_service.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

class ClientForgotPasswordScreen extends StatefulWidget {
  const ClientForgotPasswordScreen({super.key});

  @override
  State<ClientForgotPasswordScreen> createState() =>
      _ClientForgotPasswordScreenState();
}

class _ClientForgotPasswordScreenState
    extends State<ClientForgotPasswordScreen> {
  final _phoneCtl = TextEditingController();
  final _codeCtl = TextEditingController();
  final _newPwdCtl = TextEditingController();
  final _confirmCtl = TextEditingController();

  int _countdown = 0;
  Timer? _timer;
  bool _sending = false;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _timer?.cancel();
    _phoneCtl.dispose();
    _codeCtl.dispose();
    _newPwdCtl.dispose();
    _confirmCtl.dispose();
    super.dispose();
  }

  void _startCountdown() {
    setState(() => _countdown = 60);
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_countdown <= 1) {
        t.cancel();
        if (mounted) setState(() => _countdown = 0);
      } else {
        if (mounted) setState(() => _countdown--);
      }
    });
  }

  Future<void> _sendCode() async {
    final phone = _phoneCtl.text.trim();
    if (!RegExp(r'^1\d{10}$').hasMatch(phone)) {
      setState(() => _error = '请输入正确的手机号');
      return;
    }

    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>();
      api.setRole('client');
      await ClientAuthService(api).sendResetCode(phone);
      _startCountdown();
    } catch (_) {
      if (mounted) setState(() => _error = '发送失败，请稍后重试');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _submit() async {
    final phone = _phoneCtl.text.trim();
    final code = _codeCtl.text.trim();
    final newPwd = _newPwdCtl.text.trim();
    final confirm = _confirmCtl.text.trim();

    if (!RegExp(r'^1\d{10}$').hasMatch(phone)) {
      setState(() => _error = '请输入正确的手机号');
      return;
    }
    if (code.isEmpty) {
      setState(() => _error = '请输入验证码');
      return;
    }
    if (newPwd.length < 8 ||
        !RegExp(r'[a-zA-Z]').hasMatch(newPwd) ||
        !RegExp(r'[0-9]').hasMatch(newPwd)) {
      setState(() => _error = '新密码至少8位，需含字母和数字');
      return;
    }
    if (newPwd != confirm) {
      setState(() => _error = '两次输入的新密码不一致');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>();
      api.setRole('client');
      await ClientAuthService(api).resetPassword(phone, code, newPwd);
      if (mounted) {
        NbToast.show(context, '密码重置成功，请重新登录');
        context.go('/client/login');
      }
    } catch (e) {
      if (mounted) setState(() => _error = '重置失败，请重试');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF7FA),
      appBar: GlassAppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              size: 20, color: DT.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
        children: [
          const Text('找回密码',
              style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: DT.textPrimary)),
          const SizedBox(height: 8),
          Text('通过注册手机号验证后重置登录密码',
              style: TextStyle(fontSize: 14, color: DT.textMuted)),
          const SizedBox(height: 32),
          // Phone
          _buildTextField('手机号', _phoneCtl, '请输入手机号',
              keyboardType: TextInputType.phone),
          const SizedBox(height: 16),
          // Code row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _buildTextField('验证码', _codeCtl, '请输入验证码',
                    keyboardType: TextInputType.number),
              ),
              const SizedBox(width: 12),
              GestureDetector(
                onTap: (_countdown > 0 || _sending) ? null : _sendCode,
                child: Container(
                  height: 52,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: _countdown > 0
                        ? const Color(0xFFF4F5F7)
                        : DT.primarySoft,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                        color: _countdown > 0
                            ? Colors.transparent
                            : const Color(0xFFFFD9E6)),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    _countdown > 0
                        ? '${_countdown}s'
                        : (_sending ? '发送中...' : '获取验证码'),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: _countdown > 0 ? DT.textMuted : DT.primary,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // New password
          _buildTextField('新密码', _newPwdCtl, '至少8位，含字母和数字', obscure: true),
          const SizedBox(height: 16),
          // Confirm password
          _buildTextField('确认新密码', _confirmCtl, '再次输入新密码', obscure: true),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(_error!,
                style: const TextStyle(fontSize: 13, color: DT.error)),
          ],
          const SizedBox(height: 32),
          // Submit
          GestureDetector(
            onTap: _submitting ? null : _submit,
            child: Container(
              width: double.infinity,
              height: 52,
              decoration: BoxDecoration(
                gradient: DT.primaryGradient,
                borderRadius: BorderRadius.circular(16),
                boxShadow: DT.shadowPrimary,
              ),
              alignment: Alignment.center,
              child: Text(_submitting ? '提交中...' : '确认重置',
                  style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController ctl,
    String hint, {
    bool obscure = false,
    TextInputType? keyboardType,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: DT.textPrimary)),
        const SizedBox(height: 6),
        TextField(
          controller: ctl,
          obscureText: obscure,
          keyboardType: keyboardType,
          style: const TextStyle(fontSize: 15, color: DT.textPrimary),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(fontSize: 14, color: DT.textMuted),
            filled: true,
            fillColor: Colors.white,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: DT.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: DT.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: DT.primary, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
