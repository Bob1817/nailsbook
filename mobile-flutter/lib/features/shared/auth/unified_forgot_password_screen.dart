import 'package:nailbook_mobile/core/widgets/glass_container.dart';
import 'package:nailbook_mobile/core/widgets/glow_field.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_error.dart';
import '../../client/auth/client_auth_service.dart';
import '../../technician/auth/technician_auth_service.dart';

/// 统一找回密码：按手机号自动判定客户/美甲师，调用对应端的短信验证码与重置接口。
class UnifiedForgotPasswordScreen extends StatefulWidget {
  const UnifiedForgotPasswordScreen({super.key});

  @override
  State<UnifiedForgotPasswordScreen> createState() =>
      _UnifiedForgotPasswordScreenState();
}

class _UnifiedForgotPasswordScreenState
    extends State<UnifiedForgotPasswordScreen> {
  final _phoneCtl = TextEditingController();
  final _codeCtl = TextEditingController();
  final _newCtl = TextEditingController();
  final _confirmCtl = TextEditingController();

  String? _role; // 'client' / 'technician'
  int _countdown = 0;
  Timer? _timer;
  bool _sending = false;
  bool _submitting = false;
  String? _error;
  bool _phoneErr = false;
  bool _codeErr = false;
  bool _newErr = false;
  bool _confirmErr = false;

  @override
  void dispose() {
    _timer?.cancel();
    _phoneCtl.dispose();
    _codeCtl.dispose();
    _newCtl.dispose();
    _confirmCtl.dispose();
    super.dispose();
  }

  Future<String?> _detectRole(ApiClient api, String phone) async {
    api.setRole('client');
    if (await ClientAuthService(api).checkPhone(phone)) return 'client';
    api.setRole('technician');
    if ((await TechnicianAuthService(api).checkPhone(phone)).exists) {
      return 'technician';
    }
    return null;
  }

  bool _validPwd(String p) =>
      p.length >= 8 &&
      RegExp(r'[a-zA-Z]').hasMatch(p) &&
      RegExp(r'[0-9]').hasMatch(p);

  Future<void> _sendCode() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _error = null;
      _phoneErr = false;
    });
    final phone = _phoneCtl.text.trim();
    if (!RegExp(r'^1\d{10}$').hasMatch(phone)) {
      return setState(() {
        _phoneErr = true;
        _error = '请输入有效的手机号码';
      });
    }
    setState(() => _sending = true);
    final api = context.read<ApiClient>();
    try {
      final role = await _detectRole(api, phone);
      if (role == null) {
        return setState(() {
          _phoneErr = true;
          _error = '该手机号没有注册，请先注册';
          _sending = false;
        });
      }
      api.setRole(role);
      if (role == 'client') {
        await ClientAuthService(api).sendResetCode(phone);
      } else {
        await TechnicianAuthService(api).sendResetCode(phone);
      }
      _role = role;
      if (mounted) {
        NbToast.success(context, '验证码已发送');
        _startCountdown();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error =
            e is ApiError && e.message.isNotEmpty ? e.message : '验证码发送失败');
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _startCountdown() {
    setState(() => _countdown = 60);
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _countdown--);
      if (_countdown <= 0) t.cancel();
    });
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _error = null;
      _phoneErr = _codeErr = _newErr = _confirmErr = false;
    });
    final phone = _phoneCtl.text.trim();
    final code = _codeCtl.text.trim();
    final newPwd = _newCtl.text;
    if (!RegExp(r'^1\d{10}$').hasMatch(phone)) {
      return setState(() {
        _phoneErr = true;
        _error = '请输入有效的手机号码';
      });
    }
    if (code.isEmpty) {
      return setState(() {
        _codeErr = true;
        _error = '请输入验证码';
      });
    }
    if (!_validPwd(newPwd)) {
      return setState(() {
        _newErr = true;
        _error = '新密码至少 8 位，需包含字母和数字';
      });
    }
    if (newPwd != _confirmCtl.text) {
      return setState(() {
        _confirmErr = true;
        _error = '请保证新密码和确认密码一致';
      });
    }

    setState(() => _submitting = true);
    final api = context.read<ApiClient>();
    final router = GoRouter.of(context);
    try {
      final role = _role ?? await _detectRole(api, phone);
      if (role == null) {
        return setState(() {
          _error = '该手机号未注册';
          _submitting = false;
        });
      }
      api.setRole(role);
      if (role == 'client') {
        await ClientAuthService(api).resetPassword(phone, code, newPwd);
      } else {
        await TechnicianAuthService(api).resetPassword(phone, code, newPwd);
      }
      if (!mounted) return;
      NbToast.success(context, '密码重置成功，请重新登录');
      router.go('/login');
    } catch (e) {
      if (mounted) {
        final msg =
            e is ApiError && e.message.isNotEmpty ? e.message : '重置失败，请重试';
        setState(() {
          _error = msg;
          if (msg.contains('验证码')) _codeErr = true;
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ET.bg,
      appBar: GlassAppBar(title: const Text('找回密码'), dark: true),
      body: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => FocusScope.of(context).unfocus(),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('通过注册手机号验证后重置登录密码',
                    style: TextStyle(fontSize: 13, color: ET.inkSecondary)),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  _errorBanner(_error!),
                ],
                const SizedBox(height: 20),
                _field(_phoneCtl, '注册手机号',
                    keyboardType: TextInputType.phone,
                    error: _phoneErr,
                    onClear: () => setState(() => _phoneErr = false),
                    formatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(11),
                    ]),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(
                    child: _field(_codeCtl, '验证码',
                        keyboardType: TextInputType.number,
                        error: _codeErr,
                        onClear: () => setState(() => _codeErr = false),
                        formatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(6),
                        ]),
                  ),
                  const SizedBox(width: 10),
                  SizedBox(
                    width: 116,
                    height: 50,
                    child: OutlinedButton(
                      onPressed: (_countdown > 0 || _sending) ? null : _sendCode,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: ET.accent,
                        side: const BorderSide(color: ET.hairline),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                          _countdown > 0
                              ? '${_countdown}s'
                              : (_sending ? '发送中…' : '获取验证码'),
                          style: const TextStyle(fontSize: 13)),
                    ),
                  ),
                ]),
                const SizedBox(height: 12),
                _field(_newCtl, '新密码（至少 8 位，含字母和数字）',
                    obscure: true,
                    error: _newErr,
                    onClear: () => setState(() => _newErr = false)),
                const SizedBox(height: 12),
                _field(_confirmCtl, '确认新密码',
                    obscure: true,
                    error: _confirmErr,
                    onClear: () => setState(() => _confirmErr = false)),
                const SizedBox(height: 22),
                SizedBox(
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ET.cream,
                      foregroundColor: ET.onCream,
                      disabledBackgroundColor: ET.cream.withValues(alpha: 0.4),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: Text(_submitting ? '提交中…' : '确认重置',
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctl, String hint,
      {bool obscure = false,
      TextInputType? keyboardType,
      List<TextInputFormatter>? formatters,
      bool error = false,
      VoidCallback? onClear}) {
    return GlowField(
      controller: ctl,
      hint: hint,
      obscureText: obscure,
      keyboardType: keyboardType,
      inputFormatters: formatters,
      error: error,
      onChanged: (_) {
        if (error && onClear != null) onClear();
      },
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
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
      child: Text(msg,
          style: const TextStyle(fontSize: 13, color: DT.errorText)),
    );
  }
}
