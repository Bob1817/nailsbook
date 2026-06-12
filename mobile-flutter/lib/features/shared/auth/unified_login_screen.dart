import 'package:nailbook_mobile/core/widgets/glass_container.dart';

import '../../../core/api/api_error.dart';
import '../../../core/auth/auth_session.dart';
import '../../client/auth/client_auth_service.dart';
import '../../client/auth/client_forgot_password_screen.dart';
import '../../technician/auth/technician_auth_service.dart';
import 'unified_register_screen.dart';

/// 统一登录：手机号 + 密码同屏；根据手机号自动判定客户/美甲师并登录。
class UnifiedLoginScreen extends StatefulWidget {
  const UnifiedLoginScreen({super.key});

  @override
  State<UnifiedLoginScreen> createState() => _UnifiedLoginScreenState();
}

class _UnifiedLoginScreenState extends State<UnifiedLoginScreen> {
  final _phoneCtl = TextEditingController();
  final _pwdCtl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _phoneCtl.dispose();
    _pwdCtl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    FocusScope.of(context).unfocus();
    setState(() => _error = null);
    final phone = _phoneCtl.text.trim();
    if (!RegExp(r'^1\d{10}$').hasMatch(phone)) {
      return setState(() => _error = '请输入有效手机号码');
    }
    if (_pwdCtl.text.isEmpty) {
      return setState(() => _error = '请输入密码');
    }
    setState(() => _loading = true);
    final api = context.read<ApiClient>();
    final auth = context.read<AuthSession>();
    try {
      // 1) 判定身份：先查客户，再查美甲师
      api.setRole('client');
      final isClient = await ClientAuthService(api).checkPhone(phone);
      if (isClient) {
        final res =
            await ClientAuthService(api).login(phone: phone, password: _pwdCtl.text);
        await auth.loginAsClient(res.accessToken, refreshToken: res.refreshToken);
        return; // 路由自动跳转客户端首页
      }
      api.setRole('technician');
      final tech = await TechnicianAuthService(api).checkPhone(phone);
      if (tech.exists) {
        if (!tech.activated) {
          return setState(() {
            _error = '该美甲师账号尚未激活，请通过「注册」设置密码';
            _loading = false;
          });
        }
        final res = await TechnicianAuthService(api)
            .login(phone: phone, password: _pwdCtl.text);
        await auth.loginAsTechnician(res.accessToken,
            refreshToken: res.refreshToken);
        return;
      }
      setState(() {
        _error = '该手机号未注册，请先注册';
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e is ApiError && e.message.isNotEmpty
            ? e.message
            : '登录失败，请检查手机号和密码';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ET.bg,
      body: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => FocusScope.of(context).unfocus(),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 56, 24, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _brand(),
                const SizedBox(height: 44),
                const Text('欢迎回来',
                    style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: ET.ink)),
                const SizedBox(height: 6),
                const Text('输入手机号和密码登录',
                    style: TextStyle(fontSize: 13, color: ET.inkSecondary)),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  _errorBanner(_error!),
                ],
                const SizedBox(height: 24),
                _field(_phoneCtl, '请输入手机号',
                    keyboardType: TextInputType.phone,
                    formatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(11),
                    ]),
                const SizedBox(height: 12),
                _field(_pwdCtl, '请输入密码', obscure: true),
                const SizedBox(height: 20),
                _primaryButton(_loading ? '登录中…' : '登录',
                    _loading ? null : _login),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    GestureDetector(
                      onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const UnifiedRegisterScreen())),
                      child: const Text('注册账号',
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: ET.accent)),
                    ),
                    GestureDetector(
                      onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) =>
                                  const ClientForgotPasswordScreen())),
                      child: const Text('忘记密码？',
                          style: TextStyle(
                              fontSize: 13, color: ET.inkSecondary)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _brand() {
    return Row(
      children: [
        Container(
          width: 52,
          height: 52,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: ET.cream,
            borderRadius: BorderRadius.circular(15),
          ),
          child: const Text('N',
              style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: ET.onCream)),
        ),
        const SizedBox(width: 12),
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('NailBook',
                style: TextStyle(
                    fontFamily: ET.serif,
                    fontFamilyFallback: ET.serifFallback,
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                    color: ET.ink)),
            SizedBox(height: 2),
            Text('美甲预约，让美丽更简单',
                style: TextStyle(fontSize: 12, color: ET.inkSecondary)),
          ],
        ),
      ],
    );
  }

  Widget _field(TextEditingController ctl, String hint,
      {bool obscure = false,
      TextInputType? keyboardType,
      List<TextInputFormatter>? formatters}) {
    return TextField(
      controller: ctl,
      obscureText: obscure,
      keyboardType: keyboardType,
      inputFormatters: formatters,
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
            borderSide: const BorderSide(color: ET.hairline)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: ET.hairline)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: ET.accent, width: 1.5)),
      ),
    );
  }

  Widget _primaryButton(String label, VoidCallback? onPressed) {
    return SizedBox(
      height: 50,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: ET.cream,
          foregroundColor: ET.onCream,
          disabledBackgroundColor: ET.cream.withValues(alpha: 0.4),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 0,
        ),
        child: Text(label,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
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
