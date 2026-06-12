import 'package:nailbook_mobile/core/widgets/glass_container.dart';

import '../../../core/api/api_error.dart';
import '../../../core/auth/auth_session.dart';
import 'technician_auth_service.dart';

/// 技师首次设置登录密码：
/// - 临时密码模式（[accessToken] 非空）：已鉴权态 setPassword，强制不可返回；
/// - 激活模式（[phone] 非空）：账号已存在但未设密码（如超管新建账号），
///   用 setInitialPassword 设密并登录，可返回。
class TechnicianFirstLoginPasswordScreen extends StatefulWidget {
  final String? accessToken;
  final String? refreshToken;
  final String? phone;

  const TechnicianFirstLoginPasswordScreen({
    super.key,
    this.accessToken,
    this.refreshToken,
    this.phone,
  });

  @override
  State<TechnicianFirstLoginPasswordScreen> createState() =>
      _TechnicianFirstLoginPasswordScreenState();
}

class _TechnicianFirstLoginPasswordScreenState
    extends State<TechnicianFirstLoginPasswordScreen> {
  final _newCtl = TextEditingController();
  final _confirmCtl = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final api = context.read<ApiClient>();
    api.setRole('technician');
    // 临时密码模式：临时设置 token 使 setPassword 处于已鉴权态。
    // 激活模式：setInitialPassword 无需 token。
    if (widget.accessToken != null) api.setToken(widget.accessToken);
  }

  @override
  void dispose() {
    _newCtl.dispose();
    _confirmCtl.dispose();
    super.dispose();
  }

  bool _validPwd(String p) =>
      p.length >= 8 &&
      RegExp(r'[a-zA-Z]').hasMatch(p) &&
      RegExp(r'[0-9]').hasMatch(p);

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    setState(() => _error = null);
    final pwd = _newCtl.text;
    if (!_validPwd(pwd)) {
      return setState(() => _error = '新密码至少 8 位，需包含字母和数字');
    }
    if (pwd != _confirmCtl.text) {
      return setState(() => _error = '两次输入的新密码不一致');
    }
    setState(() => _submitting = true);
    final api = context.read<ApiClient>();
    final auth = context.read<AuthSession>();
    try {
      final service = TechnicianAuthService(api);
      if (widget.phone != null) {
        // 激活模式：设置初始密码并登录
        final res = await service.setInitialPassword(
            phone: widget.phone!, newPassword: pwd);
        if (!mounted) return;
        await auth.loginAsTechnician(res.accessToken,
            refreshToken: res.refreshToken);
      } else {
        // 临时密码模式：setPassword 后用原 token 登录
        await service.setPassword(pwd);
        if (!mounted) return;
        await auth.loginAsTechnician(widget.accessToken!,
            refreshToken: widget.refreshToken);
      }
    } catch (e) {
      setState(() {
        _error = e is ApiError && e.message.isNotEmpty
            ? e.message
            : '设置失败，请重试';
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isActivation = widget.phone != null;
    return PopScope(
      // 激活模式可返回；临时密码模式强制不可返回。
      canPop: isActivation,
      child: Scaffold(
        backgroundColor: ET.bg,
        appBar: GlassAppBar(
          title: Text(isActivation ? '设置登录密码' : '设置新密码'),
          dark: true,
          automaticallyImplyLeading: isActivation,
        ),
        body: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => FocusScope.of(context).unfocus(),
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(isActivation ? '设置登录密码' : '当前为临时密码',
                      style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: ET.ink)),
                  const SizedBox(height: 6),
                  Text(
                      isActivation
                          ? '账号已创建，请设置登录密码后进入'
                          : '为了账号安全，请先设置新的登录密码',
                      style: const TextStyle(
                          fontSize: 13, color: ET.inkSecondary)),
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: DT.errorBg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: DT.errorBorder),
                      ),
                      child: Text(_error!,
                          style: const TextStyle(
                              fontSize: 13, color: DT.errorText)),
                    ),
                  ],
                  const SizedBox(height: 24),
                  _field(_newCtl, '新密码（至少 8 位，含字母和数字）'),
                  const SizedBox(height: 12),
                  _field(_confirmCtl, '确认新密码'),
                  const SizedBox(height: 24),
                  SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _submitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ET.cream,
                        foregroundColor: ET.onCream,
                        disabledBackgroundColor:
                            ET.cream.withValues(alpha: 0.4),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: Text(_submitting ? '提交中…' : '设置并进入',
                          style: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctl, String hint) {
    return TextField(
      controller: ctl,
      obscureText: true,
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
}
