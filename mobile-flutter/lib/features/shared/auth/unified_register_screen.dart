import 'package:nailbook_mobile/core/widgets/glass_container.dart';

import '../../../core/api/api_error.dart';
import '../../../core/auth/auth_session.dart';
import '../../client/auth/client_auth_service.dart';
import '../../technician/auth/technician_auth_service.dart';

/// 统一注册：先选身份（我是美甲师 / 我要做美甲），再按身份显示对应字段：
/// - 美甲师：激活码 + 姓名 + 手机号 + 密码
/// - 客户：美甲师邀请码 + 手机号 + 密码
class UnifiedRegisterScreen extends StatefulWidget {
  const UnifiedRegisterScreen({super.key});

  @override
  State<UnifiedRegisterScreen> createState() => _UnifiedRegisterScreenState();
}

class _UnifiedRegisterScreenState extends State<UnifiedRegisterScreen> {
  bool _isTech = true; // true=美甲师，false=客户
  final _codeCtl = TextEditingController(); // 激活码 / 邀请码
  final _nameCtl = TextEditingController(); // 仅美甲师
  final _phoneCtl = TextEditingController();
  final _pwdCtl = TextEditingController();
  final _confirmCtl = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _codeErr = false;
  bool _nameErr = false;
  bool _phoneErr = false;
  bool _pwdErr = false;
  bool _confirmErr = false;

  @override
  void dispose() {
    _codeCtl.dispose();
    _nameCtl.dispose();
    _phoneCtl.dispose();
    _pwdCtl.dispose();
    _confirmCtl.dispose();
    super.dispose();
  }

  bool _validPwd(String p) =>
      p.length >= 8 &&
      RegExp(r'[a-zA-Z]').hasMatch(p) &&
      RegExp(r'[0-9]').hasMatch(p);

  void _clearErrs() {
    _error = null;
    _codeErr = _nameErr = _phoneErr = _pwdErr = _confirmErr = false;
  }

  Future<void> _register() async {
    FocusScope.of(context).unfocus();
    setState(_clearErrs);
    final code = _codeCtl.text.trim();
    final phone = _phoneCtl.text.trim();
    final pwd = _pwdCtl.text;

    // 从上到下逐项校验，定位有误的输入框
    if (code.isEmpty) {
      return setState(() {
        _codeErr = true;
        _error = _isTech ? '请输入激活码' : '请输入美甲师邀请码';
      });
    }
    if (_isTech && _nameCtl.text.trim().isEmpty) {
      return setState(() {
        _nameErr = true;
        _error = '请输入姓名';
      });
    }
    if (!RegExp(r'^1\d{10}$').hasMatch(phone)) {
      return setState(() {
        _phoneErr = true;
        _error = '请输入有效的手机号码';
      });
    }
    if (!_validPwd(pwd)) {
      return setState(() {
        _pwdErr = true;
        _error = '密码至少 8 位，需包含字母和数字';
      });
    }
    if (pwd != _confirmCtl.text) {
      return setState(() {
        _confirmErr = true;
        _error = '两次输入的密码不一致';
      });
    }

    setState(() => _loading = true);
    final api = context.read<ApiClient>();
    final auth = context.read<AuthSession>();
    try {
      if (_isTech) {
        api.setRole('technician');
        final res = await TechnicianAuthService(api).register(
          inviteKey: code,
          name: _nameCtl.text.trim(),
          phone: phone,
          password: pwd,
        );
        if (!mounted) return;
        await auth.loginAsTechnician(res.accessToken,
            refreshToken: res.refreshToken);
      } else {
        api.setRole('client');
        final res = await ClientAuthService(api)
            .registerByInvite(phone: phone, password: pwd, inviteCode: code);
        if (!mounted) return;
        await auth.loginAsClient(res.accessToken, refreshToken: res.refreshToken);
      }
      // 注册成功后路由自动跳转对应首页
    } catch (e) {
      final msg = e is ApiError && e.message.isNotEmpty
          ? e.message
          : '注册失败，请检查信息后重试';
      setState(() {
        _error = msg;
        if (msg.contains('激活码') ||
            msg.contains('邀请码') ||
            msg.contains('密钥')) {
          _codeErr = true;
        } else if (msg.contains('手机') || msg.contains('注册')) {
          _phoneErr = true;
        }
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ET.bg,
      appBar: GlassAppBar(title: const Text('注册账号'), dark: true),
      body: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => FocusScope.of(context).unfocus(),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('选择注册身份',
                    style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: ET.ink)),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(child: _roleTab('我是美甲师', true)),
                  const SizedBox(width: 12),
                  Expanded(child: _roleTab('我要做美甲', false)),
                ]),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  _errorBanner(_error!),
                ],
                const SizedBox(height: 20),
                _field(_codeCtl, _isTech ? '激活码' : '美甲师邀请码',
                    error: _codeErr,
                    onClear: () => setState(() => _codeErr = false)),
                if (_isTech) ...[
                  const SizedBox(height: 12),
                  _field(_nameCtl, '姓名',
                      error: _nameErr,
                      onClear: () => setState(() => _nameErr = false)),
                ],
                const SizedBox(height: 12),
                _field(_phoneCtl, '手机号',
                    keyboardType: TextInputType.phone,
                    error: _phoneErr,
                    onClear: () => setState(() => _phoneErr = false),
                    formatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(11),
                    ]),
                const SizedBox(height: 12),
                _field(_pwdCtl, '设置密码（至少 8 位，含字母和数字）',
                    obscure: true,
                    error: _pwdErr,
                    onClear: () => setState(() => _pwdErr = false)),
                const SizedBox(height: 12),
                _field(_confirmCtl, '确认密码',
                    obscure: true,
                    error: _confirmErr,
                    onClear: () => setState(() => _confirmErr = false)),
                const SizedBox(height: 22),
                SizedBox(
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _register,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ET.cream,
                      foregroundColor: ET.onCream,
                      disabledBackgroundColor: ET.cream.withValues(alpha: 0.4),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: Text(_loading ? '注册中…' : '注册并登录',
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

  Widget _roleTab(String label, bool tech) {
    final active = _isTech == tech;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() {
          _isTech = tech;
          _clearErrs();
        });
      },
      child: Container(
        height: 52,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? ET.cream : ET.surface,
          borderRadius: BorderRadius.circular(14),
          border:
              Border.all(color: active ? ET.cream : ET.hairline, width: 1.2),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: 15,
                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                color: active ? ET.onCream : ET.inkSecondary)),
      ),
    );
  }

  Widget _field(TextEditingController ctl, String hint,
      {bool obscure = false,
      TextInputType? keyboardType,
      List<TextInputFormatter>? formatters,
      bool error = false,
      VoidCallback? onClear}) {
    final bc = error ? DT.error : ET.hairline;
    return TextField(
      controller: ctl,
      obscureText: obscure,
      keyboardType: keyboardType,
      inputFormatters: formatters,
      onChanged: (_) {
        if (error && onClear != null) onClear();
      },
      cursorColor: ET.accent,
      style: const TextStyle(color: ET.ink, fontSize: 15),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: ET.inkMuted, fontSize: 14),
        filled: true,
        fillColor: ET.surface,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: bc)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: bc, width: error ? 1.5 : 1)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
                color: error ? DT.error : ET.accent, width: 1.5)),
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
      child: Text(msg,
          style: const TextStyle(fontSize: 13, color: DT.errorText)),
    );
  }
}
