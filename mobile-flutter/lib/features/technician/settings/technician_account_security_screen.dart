import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/technician_auth_service.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

class TechnicianAccountSecurityScreen extends StatefulWidget {
  const TechnicianAccountSecurityScreen({super.key});

  @override
  State<TechnicianAccountSecurityScreen> createState() =>
      _TechnicianAccountSecurityScreenState();
}

class _TechnicianAccountSecurityScreenState
    extends State<TechnicianAccountSecurityScreen> {
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
    HapticFeedback.mediumImpact();
    final oldPwd = _oldPwdCtl.text.trim();
    final newPwd = _newPwdCtl.text.trim();
    final confirmPwd = _confirmPwdCtl.text.trim();

    if (oldPwd.isEmpty) {
      _showMsg('请输入当前密码');
      return;
    }
    if (newPwd.length < 8 ||
        !RegExp(r'[a-zA-Z]').hasMatch(newPwd) ||
        !RegExp(r'[0-9]').hasMatch(newPwd)) {
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
    NbToast.show(context, msg);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DT.bgWarm,
      appBar: GlassAppBar(
        backgroundColor: Colors.white.withValues(alpha: 0.95),
        elevation: 0,
        leading: IconButton(
          icon:
              const Icon(CupertinoIcons.back, size: 20, color: DT.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('账号与安全', style: DT.titleMedium),
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : ListView(
              padding: const EdgeInsets.all(DT.xl),
              children: [
                // Account info
                Container(
                  padding: const EdgeInsets.all(DT.xl),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.78),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('登录手机号',
                          style: DT.bodySmall.copyWith(color: DT.textMuted)),
                      const SizedBox(height: 6),
                      Text(_maskedPhone ?? '未绑定', style: DT.titleMedium),
                      const SizedBox(height: 6),
                      Text('如需更换手机号，请联系平台客服处理。', style: DT.captionLarge),
                    ],
                  ),
                ),
                const SizedBox(height: DT.lg),
                // Change password
                Container(
                  padding: const EdgeInsets.all(DT.xl),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.78),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('修改密码', style: DT.titleMedium),
                      const SizedBox(height: DT.xs),
                      Text('密码至少8位，需同时包含字母和数字', style: DT.captionLarge),
                      const SizedBox(height: DT.lg),
                      _buildPwdField('当前密码', _oldPwdCtl, 'current-password'),
                      const SizedBox(height: DT.md),
                      _buildPwdField('新密码', _newPwdCtl, 'new-password'),
                      const SizedBox(height: DT.md),
                      _buildPwdField('确认新密码', _confirmPwdCtl, 'new-password'),
                      const SizedBox(height: DT.xl),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _submitting ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: DT.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(DT.rMd)),
                            elevation: 0,
                          ),
                          child: Text(_submitting ? '提交中...' : '确认修改',
                              style:
                                  DT.titleSmall.copyWith(color: Colors.white)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildPwdField(
      String label, TextEditingController ctl, String autocomplete) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: DT.bodySmall
                .copyWith(fontWeight: FontWeight.w500, color: DT.textPrimary)),
        const SizedBox(height: 6),
        TextField(
          controller: ctl,
          obscureText: true,
          style: DT.titleSmall,
          decoration: InputDecoration(
            filled: true,
            fillColor: DT.fillWarm,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: DT.md, vertical: DT.md),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(DT.rMd),
              borderSide: const BorderSide(color: DT.borderPink),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(DT.rMd),
              borderSide: const BorderSide(color: DT.borderPink),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(DT.rMd),
              borderSide: const BorderSide(color: DT.primary, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
