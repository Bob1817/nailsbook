import 'package:nailbook_mobile/core/widgets/glass_container.dart';
import 'package:nailbook_mobile/core/widgets/glow_field.dart';

import '../../../core/api/api_error.dart';
import '../../../core/auth/auth_session.dart';
import '../../client/auth/client_auth_service.dart';
import '../../technician/auth/technician_auth_service.dart';
import '../../technician/auth/technician_first_login_password_screen.dart';
import 'unified_forgot_password_screen.dart';
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
  bool _phoneErr = false;
  bool _pwdErr = false;

  @override
  void dispose() {
    _phoneCtl.dispose();
    _pwdCtl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _error = null;
      _phoneErr = false;
      _pwdErr = false;
    });
    final phone = _phoneCtl.text.trim();
    // (1) 手机号有效性
    if (!RegExp(r'^1\d{10}$').hasMatch(phone)) {
      return setState(() {
        _phoneErr = true;
        _error = '请输入有效的手机号码';
      });
    }
    setState(() => _loading = true);
    final api = context.read<ApiClient>();
    final auth = context.read<AuthSession>();

    // (2) 账号判断：手机号是否注册（客户 / 美甲师）
    String? role;
    bool techActivated = true;
    try {
      api.setRole('client');
      if (await ClientAuthService(api).checkPhone(phone)) {
        role = 'client';
      } else {
        api.setRole('technician');
        final tech = await TechnicianAuthService(api).checkPhone(phone);
        if (tech.exists) {
          role = 'technician';
          techActivated = tech.activated;
        }
      }
    } catch (e) {
      return setState(() {
        _error = e is ApiError && e.message.isNotEmpty ? e.message : '网络异常，请重试';
        _loading = false;
      });
    }
    if (role == null) {
      return setState(() {
        _phoneErr = true;
        _error = '该手机号没有注册，请先注册';
        _loading = false;
      });
    }
    if (role == 'technician' && !techActivated) {
      return setState(() {
        _error = '该美甲师账号尚未激活，请通过「注册」设置密码';
        _loading = false;
      });
    }

    // (3) 密码校验：登录失败即视为密码错误
    try {
      if (role == 'client') {
        api.setRole('client');
        final res = await ClientAuthService(api)
            .login(phone: phone, password: _pwdCtl.text);
        await auth.loginAsClient(res.accessToken,
            refreshToken: res.refreshToken);
      } else {
        api.setRole('technician');
        final res = await TechnicianAuthService(api)
            .login(phone: phone, password: _pwdCtl.text);
        if (!mounted) return;
        if (res.mustChangePassword) {
          setState(() => _loading = false);
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => TechnicianFirstLoginPasswordScreen(
                accessToken: res.accessToken,
                refreshToken: res.refreshToken,
              ),
            ),
          );
          return;
        }
        await auth.loginAsTechnician(res.accessToken,
            refreshToken: res.refreshToken);
      }
    } catch (_) {
      setState(() {
        _pwdErr = true;
        _error = '登录密码有误，请重新输入';
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
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _nailBanner(),
              Padding(
                padding: EdgeInsets.fromLTRB(
                    24, 24, 24, 32 + MediaQuery.of(context).padding.bottom),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                const SizedBox(height: 8),
                const Text('欢迎回来',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: ET.ink)),
                const SizedBox(height: 8),
                const Text('输入手机号和密码登录',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: ET.inkSecondary)),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  _errorBanner(_error!),
                ],
                const SizedBox(height: 24),
                _field(_phoneCtl, '请输入手机号',
                    keyboardType: TextInputType.phone,
                    error: _phoneErr,
                    onClear: () => setState(() => _phoneErr = false),
                    formatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(11),
                    ]),
                const SizedBox(height: 12),
                _field(_pwdCtl, '请输入密码',
                    obscure: true,
                    error: _pwdErr,
                    onClear: () => setState(() => _pwdErr = false)),
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
                                  const UnifiedForgotPasswordScreen())),
                      child: const Text('忘记密码？',
                          style: TextStyle(
                              fontSize: 13, color: ET.inkSecondary)),
                    ),
                  ],
                ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 顶部美甲背景图：通栏 + 贴到屏幕最顶（含状态栏区）。品牌在左上角叠加，
  // 上/下渐变保证状态栏、品牌可读并自然衔接页面。
  Widget _nailBanner() {
    final topInset = MediaQuery.of(context).padding.top;
    return SizedBox(
      height: 320 + topInset,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/images/login_nail_bg.jpg',
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _nailBannerFallback(),
          ),
          // 顶部轻暗（状态栏/品牌可读）+ 底部渐隐到页面背景色
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0x8816120E),
                  Colors.transparent,
                  Color(0x5516120E),
                  Color(0xFF16120E),
                ],
                stops: [0.0, 0.28, 0.78, 1.0],
              ),
            ),
          ),
          // 品牌叠加在左上角（参考 EvenTum）
          Positioned(
            top: topInset + 10,
            left: 24,
            child: _brandTop(),
          ),
        ],
      ),
    );
  }

  Widget _brandTop() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 36,
          height: 36,
          alignment: Alignment.center,
          decoration: BoxDecoration(
              color: ET.cream, borderRadius: BorderRadius.circular(11)),
          child: const Text('N',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: ET.onCream)),
        ),
        const SizedBox(width: 10),
        const Text('NailBook',
            style: TextStyle(
                fontFamily: ET.serif,
                fontFamilyFallback: ET.serifFallback,
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: Colors.white)),
      ],
    );
  }

  Widget _nailBannerFallback() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFEBD2B3), Color(0xFFC9A57C), Color(0xFF7C5B3D)],
        ),
      ),
      child: Stack(
        children: [
          Positioned(
              top: -30,
              left: -20,
              child: _dot(120, Colors.white.withValues(alpha: 0.18))),
          Positioned(
              top: 26, right: 28, child: _dot(34, const Color(0x66FFFFFF))),
          const Center(child: Text('💅', style: TextStyle(fontSize: 60))),
        ],
      ),
    );
  }

  Widget _dot(double size, Color color) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      );

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
