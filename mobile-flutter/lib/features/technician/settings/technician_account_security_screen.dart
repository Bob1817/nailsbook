import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/technician_auth_service.dart';

class TechnicianAccountSecurityScreen extends StatefulWidget {
  const TechnicianAccountSecurityScreen({super.key});

  @override
  State<TechnicianAccountSecurityScreen> createState() => _TechnicianAccountSecurityScreenState();
}

class _TechnicianAccountSecurityScreenState extends State<TechnicianAccountSecurityScreen> {
  final _oldPwdCtl = TextEditingController();
  final _newPwdCtl = TextEditingController();
  final _confirmPwdCtl = TextEditingController();

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
    _oldPwdCtl.dispose();
    _newPwdCtl.dispose();
    _confirmPwdCtl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      final p = await TechnicianAuthService(api).getProfile();
      if (mounted) {
        setState(() {
          _maskedPhone = _maskPhone(p.phone);
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _maskPhone(String? phone) {
    if (phone == null || phone.length < 11) return '未绑定';
    return '${phone.substring(0, 3)}****${phone.substring(7)}';
  }

  Future<void> _submit() async {
    final oldPwd = _oldPwdCtl.text.trim();
    final newPwd = _newPwdCtl.text.trim();
    final confirmPwd = _confirmPwdCtl.text.trim();

    if (oldPwd.isEmpty) {
      _showMsg('请输入当前密码');
      return;
    }
    if (newPwd.length < 8 || !RegExp(r'[a-zA-Z]').hasMatch(newPwd) || !RegExp(r'[0-9]').hasMatch(newPwd)) {
      _showMsg('新密码需至少8位，包含字母和数字');
      return;
    }
    if (newPwd != confirmPwd) {
      _showMsg('两次输入的新密码不一致');
      return;
    }

    setState(() => _submitting = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      await TechnicianAuthService(api).changePassword(oldPwd, newPwd);
      if (mounted) {
        _oldPwdCtl.clear();
        _newPwdCtl.clear();
        _confirmPwdCtl.clear();
        _showMsg('密码修改成功');
      }
    } catch (e) {
      _showMsg('修改失败：${e.toString()}');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showMsg(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DT.bgWarm,
      appBar: AppBar(
        backgroundColor: Colors.white.withOpacity(0.95),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: DT.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('账号与安全',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                // Account info
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: DT.shadowSm,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('登录手机号',
                        style: TextStyle(fontSize: 13, color: DT.textMuted)),
                      const SizedBox(height: 6),
                      Text(_maskedPhone ?? '未绑定',
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
                      const SizedBox(height: 6),
                      Text('如需更换手机号，请联系平台客服处理。',
                        style: TextStyle(fontSize: 12, color: DT.textMuted)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                // Change password
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: DT.shadowSm,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('修改密码',
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
                      const SizedBox(height: 4),
                      Text('密码至少8位，需同时包含字母和数字',
                        style: TextStyle(fontSize: 12, color: DT.textMuted)),
                      const SizedBox(height: 16),
                      _buildPwdField('当前密码', _oldPwdCtl, 'current-password'),
                      const SizedBox(height: 12),
                      _buildPwdField('新密码', _newPwdCtl, 'new-password'),
                      const SizedBox(height: 12),
                      _buildPwdField('确认新密码', _confirmPwdCtl, 'new-password'),
                      const SizedBox(height: 20),
                      GestureDetector(
                        onTap: _submitting ? null : _submit,
                        child: Container(
                          height: 48,
                          decoration: BoxDecoration(
                            color: DT.primary,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          alignment: Alignment.center,
                          child: Text(_submitting ? '提交中...' : '确认修改',
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildPwdField(String label, TextEditingController ctl, String autocomplete) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: DT.textPrimary)),
        const SizedBox(height: 6),
        TextField(
          controller: ctl,
          obscureText: true,
          style: const TextStyle(fontSize: 15, color: DT.textPrimary),
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFFFFF9F8),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFFF2E6EC)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFFF2E6EC)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: DT.primary, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
