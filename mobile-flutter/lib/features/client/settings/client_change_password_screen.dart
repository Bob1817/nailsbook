import 'package:nailbook_mobile/core/widgets/glass_container.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_error.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/client_auth_service.dart';
import '../../../core/widgets/nb_toast.dart';

/// 修改密码（已登录态）。对齐 webapp ChangePassword.tsx。
class ClientChangePasswordScreen extends StatefulWidget {
  const ClientChangePasswordScreen({super.key});

  @override
  State<ClientChangePasswordScreen> createState() => _State();
}

class _State extends State<ClientChangePasswordScreen> {
  final _oldCtl = TextEditingController();
  final _newCtl = TextEditingController();
  final _confirmCtl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _oldCtl.dispose();
    _newCtl.dispose();
    _confirmCtl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_oldCtl.text.isEmpty) return _toast('请输入当前密码');
    final pwd = _newCtl.text;
    if (pwd.length < 8 ||
        !RegExp(r'[a-zA-Z]').hasMatch(pwd) ||
        !RegExp(r'[0-9]').hasMatch(pwd)) {
      return _toast('新密码至少 8 位，需含字母和数字');
    }
    if (pwd != _confirmCtl.text) return _toast('两次输入的新密码不一致');

    setState(() => _submitting = true);
    final service = ClientAuthService(context.read<ApiClient>());
    try {
      await service.changePassword(_oldCtl.text, pwd);
      if (mounted) {
        _toast('密码修改成功');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        _toast(e is ApiError && e.message.isNotEmpty ? e.message : '修改失败');
        setState(() => _submitting = false);
      }
    }
  }

  void _toast(String msg) => NbToast.show(context, msg);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ET.bg,
      appBar: GlassAppBar(title: const Text('修改密码'), dark: true),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
                color: ET.surface, borderRadius: BorderRadius.circular(16)),
            child: Column(
              children: [
                _field(_oldCtl, '当前密码'),
                const SizedBox(height: 12),
                _field(_newCtl, '新密码（至少 8 位，含字母和数字）'),
                const SizedBox(height: 12),
                _field(_confirmCtl, '确认新密码'),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 50,
            child: ElevatedButton(
              onPressed: _submitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: ET.cream,
                foregroundColor: ET.onCream,
                disabledBackgroundColor: ET.cream.withValues(alpha: 0.4),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999)),
              ),
              child: Text(_submitting ? '提交中…' : '确认修改',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _field(TextEditingController ctl, String hint) {
    return TextField(
      controller: ctl,
      obscureText: true,
      cursorColor: ET.accent,
      style: const TextStyle(color: ET.ink, fontSize: 14),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: ET.inkMuted, fontSize: 13),
        filled: true,
        fillColor: ET.bgElevated,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none),
      ),
    );
  }
}
