import 'package:go_router/go_router.dart';

import '../../../core/api/api_error.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/nb_toast.dart';

/// 客户端 / 美甲师端通用「修改密码」页（UI 与美甲师端「账号与安全」一致）。
///
/// 校验流程（从上到下）：
/// 1. 必填：任一为空 → 提示「X不能为空」并红色发光边框标记为空项；
/// 2. 新密码格式不合法 → 提示「新密码至少 8 位，需包含字母和数字」；
/// 3. 确认密码与新密码不一致 → 提示「请保证新密码和确认密码一致」；
/// 4. 弹窗确认 → 提交（后端校验当前密码，错误则「当前密码错误，请重新输入」）；
/// 5. 成功 → 提示 → 退出登录并跳转到该端登录页（非角色选择页）。
class ChangePasswordScreen extends StatefulWidget {
  final String title;
  final bool technician;
  final Future<String?> Function() loadPhone;
  final Future<void> Function(String oldPwd, String newPwd) submit;
  final String loginRoute;

  const ChangePasswordScreen({
    super.key,
    required this.title,
    required this.technician,
    required this.loadPhone,
    required this.submit,
    required this.loginRoute,
  });

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _oldCtl = TextEditingController();
  final _newCtl = TextEditingController();
  final _confirmCtl = TextEditingController();

  bool _oldErr = false;
  bool _newErr = false;
  bool _confirmErr = false;

  String? _maskedPhone;
  bool _loading = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _oldCtl.dispose();
    _newCtl.dispose();
    _confirmCtl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final phone = await widget.loadPhone();
      if (mounted) setState(() => _maskedPhone = _mask(phone));
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  String _mask(String? phone) {
    if (phone == null || phone.length < 11) return phone ?? '未绑定';
    return '${phone.substring(0, 3)}****${phone.substring(7)}';
  }

  bool _validPwd(String p) =>
      p.length >= 8 && RegExp(r'[a-zA-Z]').hasMatch(p) && RegExp(r'[0-9]').hasMatch(p);

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final oldPwd = _oldCtl.text;
    final newPwd = _newCtl.text;
    final confirm = _confirmCtl.text;

    // 1) 必填（从上到下），红色发光边框标记所有为空项，提示第一个为空项。
    setState(() {
      _oldErr = oldPwd.isEmpty;
      _newErr = newPwd.isEmpty;
      _confirmErr = confirm.isEmpty;
    });
    if (oldPwd.isEmpty) return _toast('当前密码不能为空');
    if (newPwd.isEmpty) return _toast('新密码不能为空');
    if (confirm.isEmpty) return _toast('确认新密码不能为空');

    // 2) 新密码格式
    if (!_validPwd(newPwd)) {
      setState(() => _newErr = true);
      return _toast('新密码至少 8 位，需包含字母和数字');
    }
    // 3) 确认与新密码一致（不校验确认密码格式）
    if (confirm != newPwd) {
      setState(() => _confirmErr = true);
      return _toast('请保证新密码和确认密码一致');
    }

    // 4) 确认弹窗
    final ok = await _confirmDialog();
    if (ok != true || !mounted) return;

    // 5) 提交（后端校验当前密码）
    setState(() => _submitting = true);
    final auth = context.read<AuthSession>();
    final router = GoRouter.of(context);
    try {
      await widget.submit(oldPwd, newPwd);
      if (!mounted) return;
      await _successDialog();
      auth.logout();
      router.go(widget.loginRoute);
    } catch (e) {
      if (!mounted) return;
      final msg = e is ApiError ? e.message : '';
      // 当前密码错误：标记当前密码框并提示
      if (msg.contains('当前密码') || msg.contains('密码不正确') || msg.contains('原密码')) {
        setState(() {
          _oldErr = true;
          _submitting = false;
        });
        _toast('当前密码错误，请重新输入');
      } else {
        setState(() => _submitting = false);
        _toast(msg.isNotEmpty ? msg : '修改失败，请稍后重试');
      }
    }
  }

  Future<bool?> _confirmDialog() {
    return showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: DT.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('确认修改密码',
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: DT.textPrimary)),
        content: const Text('确认将登录密码修改为新密码吗？',
            style: TextStyle(fontSize: 14, color: DT.textSecondary, height: 1.5)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dctx, false),
            child: const Text('取消', style: TextStyle(color: DT.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dctx, true),
            child: const Text('确认修改',
                style: TextStyle(color: DT.primary, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Future<void> _successDialog() {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dctx) => AlertDialog(
        backgroundColor: DT.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('密码修改成功',
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: DT.textPrimary)),
        content: const Text('新密码已生效，请使用新密码重新登录。',
            style: TextStyle(fontSize: 14, color: DT.textSecondary, height: 1.5)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dctx),
            child: const Text('去登录',
                style: TextStyle(color: DT.primary, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  void _toast(String msg) => NbToast.show(context, msg);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        backgroundColor: DT.bgWarm,
        appBar: GlassAppBar(
          technician: widget.technician,
          dark: true,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(CupertinoIcons.back,
                size: 20, color: DT.textPrimary),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(widget.title, style: DT.titleMedium),
          centerTitle: true,
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: DT.primary))
            : ListView(
                padding: const EdgeInsets.all(DT.xl),
                children: [
                  _card(Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('登录手机号',
                          style: DT.bodySmall.copyWith(color: DT.textMuted)),
                      const SizedBox(height: 6),
                      Text(_maskedPhone ?? '未绑定', style: DT.titleMedium),
                      const SizedBox(height: 6),
                      Text('如需更换手机号，请联系平台客服处理。',
                          style: DT.captionLarge),
                    ],
                  )),
                  const SizedBox(height: DT.lg),
                  _card(Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('修改密码', style: DT.titleMedium),
                      const SizedBox(height: DT.xs),
                      Text('密码至少 8 位，需同时包含字母和数字',
                          style: DT.captionLarge),
                      const SizedBox(height: DT.lg),
                      _pwdField('当前密码', _oldCtl, _oldErr,
                          (v) => setState(() => _oldErr = false)),
                      const SizedBox(height: DT.md),
                      _pwdField('新密码', _newCtl, _newErr,
                          (v) => setState(() => _newErr = false)),
                      const SizedBox(height: DT.md),
                      _pwdField('确认新密码', _confirmCtl, _confirmErr,
                          (v) => setState(() => _confirmErr = false)),
                      const SizedBox(height: DT.xl),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _submitting ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: DT.cream,
                            foregroundColor: DT.onCream,
                            disabledBackgroundColor:
                                DT.cream.withValues(alpha: 0.4),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(DT.rMd)),
                            elevation: 0,
                          ),
                          child: Text(_submitting ? '提交中…' : '确认修改',
                              style: DT.titleSmall.copyWith(color: DT.onCream)),
                        ),
                      ),
                    ],
                  )),
                ],
              ),
      ),
    );
  }

  Widget _card(Widget child) => Container(
        padding: const EdgeInsets.all(DT.xl),
        decoration: BoxDecoration(
          color: DT.surface.withValues(alpha: 0.78),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 16,
                offset: const Offset(0, 4)),
          ],
        ),
        child: child,
      );

  Widget _pwdField(String label, TextEditingController ctl, bool error,
      ValueChanged<String> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: DT.bodySmall
                .copyWith(fontWeight: FontWeight.w500, color: DT.textPrimary)),
        const SizedBox(height: 6),
        // 红色 liquid glass 效果：错误时红色描边 + 红色柔光
        DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(DT.rMd),
            boxShadow: error
                ? [
                    BoxShadow(
                        color: DT.error.withValues(alpha: 0.28),
                        blurRadius: 14,
                        spreadRadius: 1),
                  ]
                : null,
          ),
          child: TextField(
            controller: ctl,
            obscureText: true,
            onChanged: onChanged,
            style: DT.titleSmall,
            cursorColor: DT.primary,
            decoration: InputDecoration(
              filled: true,
              fillColor: DT.fillWarm,
              contentPadding: const EdgeInsets.symmetric(
                  horizontal: DT.md, vertical: DT.md),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(DT.rMd),
                borderSide:
                    BorderSide(color: error ? DT.error : DT.borderPink),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(DT.rMd),
                borderSide: BorderSide(
                    color: error ? DT.error : DT.borderPink,
                    width: error ? 1.5 : 1),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(DT.rMd),
                borderSide: BorderSide(
                    color: error ? DT.error : DT.primary, width: 1.5),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
