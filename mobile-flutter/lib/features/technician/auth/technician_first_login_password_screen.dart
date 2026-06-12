import 'package:nailbook_mobile/core/widgets/glass_container.dart';

import '../../../core/api/api_error.dart';
import '../../../core/auth/auth_session.dart';
import 'technician_auth_service.dart';

/// 临时密码首次登录：强制设置新密码后才能进入。无法返回。
class TechnicianFirstLoginPasswordScreen extends StatefulWidget {
  final String accessToken;
  final String? refreshToken;

  const TechnicianFirstLoginPasswordScreen({
    super.key,
    required this.accessToken,
    this.refreshToken,
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
    // 临时设置 token，使 setPassword 处于已鉴权态（此时尚未建立登录会话）。
    final api = context.read<ApiClient>();
    api.setRole('technician');
    api.setToken(widget.accessToken);
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
      await TechnicianAuthService(api).setPassword(pwd);
      if (!mounted) return;
      // 设置成功，正式建立登录会话 → 路由跳转技师首页
      await auth.loginAsTechnician(widget.accessToken,
          refreshToken: widget.refreshToken);
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
    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: ET.bg,
        appBar: GlassAppBar(
          title: const Text('设置新密码'),
          dark: true,
          automaticallyImplyLeading: false,
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
                  const Text('当前为临时密码',
                      style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: ET.ink)),
                  const SizedBox(height: 6),
                  const Text('为了账号安全，请先设置新的登录密码',
                      style: TextStyle(fontSize: 13, color: ET.inkSecondary)),
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
