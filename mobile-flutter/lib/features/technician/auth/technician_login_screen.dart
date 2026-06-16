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
import 'technician_auth_service.dart';

/// 美甲师登录/注册：手机号 → checkPhone → 登录 / 注册 / 设置密码。
/// 对齐 webapp technician-frontend/src/pages/Login.tsx。
class TechnicianLoginScreen extends StatefulWidget {
  const TechnicianLoginScreen({super.key});

  @override
  State<TechnicianLoginScreen> createState() => _TechnicianLoginScreenState();
}

enum _Step { phone, login, register, setPassword }

class _TechnicianLoginScreenState extends State<TechnicianLoginScreen> {
  final _phoneCtl = TextEditingController();
  final _passwordCtl = TextEditingController();
  final _confirmCtl = TextEditingController();
  final _inviteKeyCtl = TextEditingController();
  final _nameCtl = TextEditingController();

  _Step _step = _Step.phone;
  bool _agreed = false;
  bool _loading = false;
  bool _setPwdAuthenticated = false; // true=mustChangePassword 已登录改密
  String? _error;

  @override
  void dispose() {
    _phoneCtl.dispose();
    _passwordCtl.dispose();
    _confirmCtl.dispose();
    _inviteKeyCtl.dispose();
    _nameCtl.dispose();
    super.dispose();
  }

  TechnicianAuthService get _service {
    final api = context.read<ApiClient>();
    api.setRole('technician');
    return TechnicianAuthService(api);
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
      setState(() => _error = '请输入有效手机号码');
      return;
    }
    setState(() => _loading = true);
    try {
      final status = await _service.checkPhone(_phoneCtl.text.trim());
      setState(() {
        if (!status.exists) {
          _step = _Step.register;
        } else if (!status.activated) {
          _setPwdAuthenticated = false;
          _step = _Step.setPassword;
        } else {
          _step = _Step.login;
        }
      });
    } catch (e) {
      setState(() => _error = _msg(e, '检查失败，请重试'));
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
    final authSession = context.read<AuthSession>();
    try {
      final res = await _service.login(phone: _phoneCtl.text.trim(), password: _passwordCtl.text);
      if (res.mustChangePassword) {
        // 设置 token 以便走已登录态改密
        await authSession.loginAsTechnician(res.accessToken, refreshToken: res.refreshToken);
        setState(() {
          _setPwdAuthenticated = true;
          _passwordCtl.clear();
          _step = _Step.setPassword;
          _loading = false;
        });
        return;
      }
      await _onAuthSuccess(res.accessToken, refreshToken: res.refreshToken);
    } catch (e) {
      setState(() {
        _error = _msg(e, '登录失败，请检查手机号和密码');
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
    if (!RegExp(r'^[A-Z0-9]{16}$').hasMatch(_inviteKeyCtl.text)) {
      setState(() => _error = '邀请密钥格式为 16 位大写字母+数字');
      return;
    }
    if (_nameCtl.text.trim().isEmpty) {
      setState(() => _error = '请输入姓名');
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
      final res = await _service.register(
        inviteKey: _inviteKeyCtl.text,
        name: _nameCtl.text.trim(),
        phone: _phoneCtl.text.trim(),
        password: _passwordCtl.text,
      );
      await _onAuthSuccess(res.accessToken, refreshToken: res.refreshToken);
    } catch (e) {
      setState(() {
        _error = _msg(e, '注册失败，请检查邀请密钥');
        _loading = false;
      });
    }
  }

  Future<void> _handleSetPassword() async {
    setState(() => _error = null);
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
      final res = _setPwdAuthenticated
          ? await _service.setPassword(_passwordCtl.text)
          : await _service.setInitialPassword(
              phone: _phoneCtl.text.trim(), newPassword: _passwordCtl.text);
      await _onAuthSuccess(res.accessToken, refreshToken: res.refreshToken);
    } catch (e) {
      setState(() {
        _error = _msg(e, '设置密码失败');
        _loading = false;
      });
    }
  }

  Future<void> _onAuthSuccess(String accessToken, {String? refreshToken}) async {
    final authSession = context.read<AuthSession>();
    final pushService = context.read<PushNotificationService>();
    final chatSocket = context.read<ChatSocket>();
    final router = GoRouter.of(context);

    await authSession.loginAsTechnician(accessToken, refreshToken: refreshToken);
    try {
      pushService
        ..init(role: 'technician')
        ..registerTokenOnServer(apiBaseUrl: kApiBaseUrl, accessToken: accessToken);
    } catch (_) {}
    try {
      chatSocket
        ..configure(baseUrl: kApiBaseUrl, token: accessToken)
        ..connect();
    } catch (_) {}
    if (mounted) router.go('/technician/home');
  }

  String _msg(Object e, String fallback) {
    if (e is ApiError && e.message.isNotEmpty) return e.message;
    return fallback;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF16120E),
      body: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => FocusScope.of(context).unfocus(),
        child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 40, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _brand(),
              const SizedBox(height: 40),
              Text(_title(), style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: DT.textPrimary)),
              const SizedBox(height: 6),
              Text(_subtitle(), style: const TextStyle(fontSize: 13, color: DT.textSecondary)),
              if (_error != null) ...[
                const SizedBox(height: 16),
                _errorBanner(_error!),
              ],
              const SizedBox(height: 24),
              if (_step == _Step.phone) ..._phoneStep(),
              if (_step == _Step.login) ..._loginStep(),
              if (_step == _Step.register) ..._registerStep(),
              if (_step == _Step.setPassword) ..._setPasswordStep(),
            ],
          ),
        ),
      ),
      ),
    );
  }

  String _title() => switch (_step) {
        _Step.phone => '欢迎使用',
        _Step.login => '欢迎回来',
        _Step.register => '完成注册',
        _Step.setPassword => '设置密码',
      };

  String _subtitle() => switch (_step) {
        _Step.phone => '输入手机号开始',
        _Step.login => '该手机号已注册，请输入密码登录',
        _Step.register => '使用邀请密钥完成账号创建',
        _Step.setPassword => _setPwdAuthenticated ? '为了账号安全，请设置新密码' : '该账号尚未设置密码，请先设置',
      };

  Widget _brand() {
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFFFF6889), Color(0xFFF55684)]),
            borderRadius: BorderRadius.circular(14),
          ),
          child: const Text('N', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
        ),
        const SizedBox(width: 12),
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('NailArt 美甲师工具', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: DT.textPrimary)),
            SizedBox(height: 2),
            Text('更专业的服务，更高效的管理', style: TextStyle(fontSize: 12, color: DT.textSecondary)),
          ],
        ),
      ],
    );
  }

  List<Widget> _phoneStep() => [
        _textField(_phoneCtl, '请输入手机号',
            keyboardType: TextInputType.phone,
            formatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(11)]),
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
      ];

  List<Widget> _registerStep() => [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(color: const Color(0xFFFFF7E6), borderRadius: BorderRadius.circular(12)),
          child: const Text('该手机号未注册，请使用邀请密钥完成注册',
              style: TextStyle(fontSize: 13, color: Color(0xFFFA8C16))),
        ),
        const SizedBox(height: 12),
        _phoneBadge(),
        const SizedBox(height: 12),
        _textField(_inviteKeyCtl, '邀请密钥（16 位大写字母+数字）',
            formatters: [
              FilteringTextInputFormatter.allow(RegExp('[a-zA-Z0-9]')),
              LengthLimitingTextInputFormatter(16),
              _UpperCaseFormatter(),
            ]),
        const SizedBox(height: 12),
        _textField(_nameCtl, '姓名'),
        const SizedBox(height: 12),
        _passwordField(_passwordCtl, '设置密码（至少 8 位，含字母和数字）'),
        const SizedBox(height: 12),
        _passwordField(_confirmCtl, '确认密码'),
        const SizedBox(height: 12),
        _agreement(),
        const SizedBox(height: 16),
        _primaryButton(_loading ? '注册中...' : '注册并登录', _loading ? null : _handleRegister),
      ];

  List<Widget> _setPasswordStep() => [
        if (!_setPwdAuthenticated) _phoneBadge(),
        if (!_setPwdAuthenticated) const SizedBox(height: 12),
        _passwordField(_passwordCtl, '设置密码（至少 8 位，含字母和数字）'),
        const SizedBox(height: 12),
        _passwordField(_confirmCtl, '确认密码'),
        const SizedBox(height: 16),
        _primaryButton(_loading ? '提交中...' : '设置密码并登录', _loading ? null : _handleSetPassword),
      ];

  Widget _phoneBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(color: const Color(0xFF2A241E), borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          Expanded(child: Text('手机号：${_phoneCtl.text}', style: const TextStyle(fontSize: 13, color: DT.textSecondary))),
          GestureDetector(
            onTap: () => setState(() {
              _step = _Step.phone;
              _error = null;
              _passwordCtl.clear();
              _confirmCtl.clear();
            }),
            child: const Text('换个号', style: TextStyle(fontSize: 13, color: DT.primary)),
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
      style: const TextStyle(fontSize: 15, color: DT.textPrimary),
      cursorColor: DT.primary,
      decoration: _inputDecoration(hint),
    );
  }

  Widget _passwordField(TextEditingController ctl, String hint) {
    return TextField(
      controller: ctl,
      obscureText: true,
      style: const TextStyle(fontSize: 15, color: DT.textPrimary),
      cursorColor: DT.primary,
      decoration: _inputDecoration(hint),
    );
  }

  InputDecoration _inputDecoration(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: DT.textMuted, fontSize: 15),
        filled: true,
        fillColor: DT.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: DT.border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: DT.border)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: DT.primary, width: 1.5)),
      );

  Widget _primaryButton(String label, VoidCallback? onPressed) {
    final dim = onPressed == null;
    return SizedBox(
      height: 50,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [
            const Color(0xFFFF636E).withValues(alpha: dim ? 0.5 : 1),
            const Color(0xFFD58197).withValues(alpha: dim ? 0.5 : 1),
          ]),
          borderRadius: BorderRadius.circular(12),
        ),
        child: ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            foregroundColor: Colors.white,
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
              color: _agreed ? DT.primary : Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: _agreed ? DT.primary : const Color(0xFFC6CEDA), width: 1.5),
            ),
            child: _agreed ? const Icon(Icons.check, size: 12, color: Colors.white) : null,
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Text.rich(
              TextSpan(
                style: TextStyle(fontSize: 12, color: Color(0xFF8F96A5)),
                children: [
                  TextSpan(text: '我已阅读并同意'),
                  TextSpan(text: '《用户协议》', style: TextStyle(color: DT.primary)),
                  TextSpan(text: '和'),
                  TextSpan(text: '《隐私政策》', style: TextStyle(color: DT.primary)),
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

class _UpperCaseFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    return newValue.copyWith(text: newValue.text.toUpperCase());
  }
}
