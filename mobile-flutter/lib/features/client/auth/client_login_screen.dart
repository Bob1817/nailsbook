import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_error.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/config.dart';
import '../../../core/notifications/push_notification_service.dart';
import '../../../core/socket/chat_socket.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/theme/editorial_tokens.dart';
import 'client_auth_service.dart';
import 'client_forgot_password_screen.dart';

/// 客户端登录/注册：手机号 → checkPhone → 登录(密码) / 注册(邀请码+密码)。
/// 对齐 webapp client-frontend/src/pages/Login.tsx。
class ClientLoginScreen extends StatefulWidget {
  final String? initialInviteCode;

  const ClientLoginScreen({super.key, this.initialInviteCode});

  @override
  State<ClientLoginScreen> createState() => _ClientLoginScreenState();
}

enum _Step { phone, login, register }

class _ClientLoginScreenState extends State<ClientLoginScreen> {
  final _phoneCtl = TextEditingController();
  final _passwordCtl = TextEditingController();
  final _confirmCtl = TextEditingController();
  final _inviteCtl = TextEditingController();

  _Step _step = _Step.phone;
  bool _agreed = false;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final code = widget.initialInviteCode?.trim();
    if (code != null && code.isNotEmpty) _inviteCtl.text = code;
  }

  @override
  void dispose() {
    _phoneCtl.dispose();
    _passwordCtl.dispose();
    _confirmCtl.dispose();
    _inviteCtl.dispose();
    super.dispose();
  }

  ClientAuthService get _service {
    final api = context.read<ApiClient>();
    api.setRole('client');
    return ClientAuthService(api);
  }

  String? _validatePassword(String pwd) {
    if (pwd.length < 8) return '密码至少 8 位';
    if (!RegExp(r'[a-zA-Z]').hasMatch(pwd) || !RegExp(r'[0-9]').hasMatch(pwd)) {
      return '密码需同时包含字母和数字';
    }
    return null;
  }

  Future<void> _handlePhoneNext() async {
    setState(() => _error = null);
    if (!RegExp(r'^1\d{10}$').hasMatch(_phoneCtl.text.trim())) {
      setState(() => _error = '请输入正确的手机号');
      return;
    }
    setState(() => _loading = true);
    try {
      final exists = await _service.checkPhone(_phoneCtl.text.trim());
      setState(() => _step = exists ? _Step.login : _Step.register);
    } catch (e) {
      setState(() => _error = _msg(e, '请求失败'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleLogin() async {
    setState(() => _error = null);
    if (!_agreed) {
      setState(() => _error = '请阅读并同意用户协议和隐私政策');
      return;
    }
    if (_passwordCtl.text.isEmpty) {
      setState(() => _error = '请输入密码');
      return;
    }
    setState(() => _loading = true);
    try {
      final res = await _service.login(
        phone: _phoneCtl.text.trim(),
        password: _passwordCtl.text,
      );
      await _onAuthSuccess(res.accessToken, refreshToken: res.refreshToken);
    } catch (e) {
      setState(() {
        _error = _msg(e, '登录失败');
        _loading = false;
      });
    }
  }

  Future<void> _handleRegister() async {
    setState(() => _error = null);
    if (!_agreed) {
      setState(() => _error = '请阅读并同意用户协议和隐私政策');
      return;
    }
    if (_inviteCtl.text.trim().isEmpty) {
      setState(() => _error = '请输入美甲师邀请码');
      return;
    }
    final pwdErr = _validatePassword(_passwordCtl.text);
    if (pwdErr != null) {
      setState(() => _error = pwdErr);
      return;
    }
    if (_passwordCtl.text != _confirmCtl.text) {
      setState(() => _error = '两次密码不一致');
      return;
    }
    setState(() => _loading = true);
    try {
      final res = await _service.registerByInvite(
        phone: _phoneCtl.text.trim(),
        password: _passwordCtl.text,
        inviteCode: _inviteCtl.text.trim(),
      );
      await _onAuthSuccess(res.accessToken, refreshToken: res.refreshToken);
    } catch (e) {
      setState(() {
        _error = _msg(e, '注册失败');
        _loading = false;
      });
    }
  }

  Future<void> _onAuthSuccess(String accessToken, {String? refreshToken}) async {
    final authSession = context.read<AuthSession>();
    final pushService = context.read<PushNotificationService>();
    final chatSocket = context.read<ChatSocket>();
    final router = GoRouter.of(context);

    await authSession.loginAsClient(accessToken, refreshToken: refreshToken);
    try {
      pushService
        ..init(role: 'client')
        ..registerTokenOnServer(apiBaseUrl: kApiBaseUrl, accessToken: accessToken);
    } catch (_) {}
    try {
      chatSocket
        ..configure(baseUrl: kApiBaseUrl, token: accessToken)
        ..connect();
    } catch (_) {}
    if (mounted) router.go('/client/home');
  }

  String _msg(Object e, String fallback) {
    if (e is ApiError && e.message.isNotEmpty) return e.message;
    return fallback;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ET.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 48, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _brand(),
              const SizedBox(height: 40),
              Text(_title(), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: ET.ink)),
              const SizedBox(height: 6),
              Text(_subtitle(), style: const TextStyle(fontSize: 13, color: ET.inkSecondary)),
              if (_error != null) ...[
                const SizedBox(height: 16),
                _errorBanner(_error!),
              ],
              const SizedBox(height: 24),
              if (_step == _Step.phone) ..._phoneStep(),
              if (_step == _Step.login) ..._loginStep(),
              if (_step == _Step.register) ..._registerStep(),
            ],
          ),
        ),
      ),
    );
  }

  String _title() => switch (_step) {
        _Step.phone => '欢迎使用',
        _Step.login => '欢迎回来',
        _Step.register => '完成注册',
      };

  String _subtitle() => switch (_step) {
        _Step.phone => '输入手机号开始',
        _Step.login => '请输入密码登录',
        _Step.register => '使用美甲师邀请码完成注册',
      };

  Widget _brand() {
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          alignment: Alignment.center,
          decoration: const BoxDecoration(
            gradient: LinearGradient(colors: [ET.accent, ET.accentDeep]),
            borderRadius: BorderRadius.all(Radius.circular(18)),
          ),
          child: const Text('N', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: ET.onCream)),
        ),
        const SizedBox(height: 12),
        const Text('NailBook', style: TextStyle(fontFamily: ET.serif, fontFamilyFallback: ET.serifFallback, fontSize: 24, fontWeight: FontWeight.w600, letterSpacing: 0.5, color: ET.ink)),
        const SizedBox(height: 4),
        const Text('美甲预约，让美丽更简单', style: TextStyle(fontSize: 13, color: ET.inkSecondary)),
      ],
    );
  }

  List<Widget> _phoneStep() => [
        _phoneField(),
        const SizedBox(height: 16),
        _primaryButton(_loading ? '检查中...' : '下一步', _loading ? null : _handlePhoneNext),
      ];

  List<Widget> _loginStep() => [
        _phoneBadge(),
        const SizedBox(height: 12),
        _passwordField(_passwordCtl, '请输入密码'),
        const SizedBox(height: 12),
        _agreement(),
        const SizedBox(height: 16),
        _primaryButton(_loading ? '登录中...' : '登录', _loading ? null : _handleLogin),
        const SizedBox(height: 8),
        Center(
          child: TextButton(
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const ClientForgotPasswordScreen())),
            child: const Text('忘记密码？', style: TextStyle(color: ET.accentOnDark)),
          ),
        ),
      ];

  List<Widget> _registerStep() => [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(color: ET.accentSoft, borderRadius: BorderRadius.circular(12)),
          child: const Text('该手机号未注册，请使用美甲师邀请码完成注册',
              style: TextStyle(fontSize: 13, color: ET.accentOnDark)),
        ),
        const SizedBox(height: 12),
        _phoneBadge(),
        const SizedBox(height: 12),
        _textField(_inviteCtl, '美甲师邀请码'),
        const SizedBox(height: 12),
        _passwordField(_passwordCtl, '设置密码（至少 8 位，含字母和数字）'),
        const SizedBox(height: 12),
        _passwordField(_confirmCtl, '确认密码'),
        const SizedBox(height: 12),
        _agreement(),
        const SizedBox(height: 16),
        _primaryButton(_loading ? '注册中...' : '注册并登录', _loading ? null : _handleRegister),
      ];

  Widget _phoneField() => _textField(
        _phoneCtl,
        '请输入手机号',
        keyboardType: TextInputType.phone,
        formatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(11)],
      );

  Widget _phoneBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(color: ET.surface, borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          Expanded(child: Text('手机号：${_phoneCtl.text}', style: const TextStyle(fontSize: 13, color: ET.inkSecondary))),
          GestureDetector(
            onTap: () => setState(() {
              _step = _Step.phone;
              _error = null;
              _passwordCtl.clear();
              _confirmCtl.clear();
            }),
            child: const Text('换个号', style: TextStyle(fontSize: 13, color: ET.accentOnDark)),
          ),
        ],
      ),
    );
  }

  Widget _textField(TextEditingController ctl, String hint,
      {TextInputType? keyboardType, List<TextInputFormatter>? formatters}) {
    return TextField(
      controller: ctl,
      keyboardType: keyboardType,
      inputFormatters: formatters,
      cursorColor: ET.accent,
      style: const TextStyle(color: ET.ink, fontSize: 15),
      decoration: _inputDecoration(hint),
    );
  }

  Widget _passwordField(TextEditingController ctl, String hint) {
    return TextField(
      controller: ctl,
      obscureText: true,
      cursorColor: ET.accent,
      style: const TextStyle(color: ET.ink, fontSize: 15),
      decoration: _inputDecoration(hint),
    );
  }

  InputDecoration _inputDecoration(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: ET.inkMuted),
        filled: true,
        fillColor: ET.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: ET.hairline)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: ET.hairline)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: ET.accent, width: 1.5)),
      );

  Widget _primaryButton(String label, VoidCallback? onPressed) {
    return SizedBox(
      height: 50,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: ET.cream.withValues(alpha: onPressed == null ? 0.4 : 1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            foregroundColor: ET.onCream,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        ),
      ),
    );
  }

  Widget _agreement() {
    return GestureDetector(
      onTap: () => setState(() => _agreed = !_agreed),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 1),
            width: 18,
            height: 18,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: _agreed ? ET.accent : Colors.transparent,
              shape: BoxShape.circle,
              border: Border.all(color: _agreed ? ET.accent : ET.hairlineStrong, width: 1.5),
            ),
            child: _agreed ? const Icon(Icons.check, size: 12, color: ET.onCream) : null,
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Text.rich(
              TextSpan(
                style: TextStyle(fontSize: 12, color: ET.inkMuted),
                children: [
                  TextSpan(text: '我已阅读并同意'),
                  TextSpan(text: '《用户协议》', style: TextStyle(color: ET.accentOnDark)),
                  TextSpan(text: '和'),
                  TextSpan(text: '《隐私政策》', style: TextStyle(color: ET.accentOnDark)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _errorBanner(String msg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: DT.errorBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: DT.errorBorder),
      ),
      child: Text(msg, style: const TextStyle(fontSize: 13, color: DT.errorText)),
    );
  }
}
