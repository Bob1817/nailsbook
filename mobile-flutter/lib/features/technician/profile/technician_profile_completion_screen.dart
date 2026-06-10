import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/technician_auth_service.dart';
import '../../../core/widgets/nb_toast.dart';

/// 完善服务城市：技师无 province/city 时的强制引导页。
/// 对齐 webapp technician-frontend ProfileCompletionPage.tsx（由 ProtectedRoute 守卫触发）。
class TechnicianProfileCompletionScreen extends StatefulWidget {
  final String? initialProvince;
  final String? initialCity;

  const TechnicianProfileCompletionScreen({super.key, this.initialProvince, this.initialCity});

  @override
  State<TechnicianProfileCompletionScreen> createState() => _State();
}

class _State extends State<TechnicianProfileCompletionScreen> {
  late final _provinceCtl = TextEditingController(text: widget.initialProvince ?? '');
  late final _cityCtl = TextEditingController(text: widget.initialCity ?? '');
  bool _saving = false;

  @override
  void dispose() {
    _provinceCtl.dispose();
    _cityCtl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    HapticFeedback.mediumImpact();
    final province = _provinceCtl.text.trim();
    final city = _cityCtl.text.trim();
    if (province.isEmpty || city.isEmpty) {
      _toast('请填写所在省份和城市');
      return;
    }
    setState(() => _saving = true);
    try {
      await TechnicianAuthService(context.read<ApiClient>())
          .updateProfile({'province': province, 'city': city});
      if (mounted) Navigator.pop(context, true);
    } catch (_) {
      if (mounted) {
        _toast('保存失败，请重试');
        setState(() => _saving = false);
      }
    }
  }

  void _toast(String msg) =>
      NbToast.show(context, msg);

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: DT.bg,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(DT.xxl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('完善服务城市', style: DT.titleLarge),
                  const SizedBox(height: DT.sm),
                  Text('请先完善你的服务省/市，用于同城上门预约与将来的定位推荐。',
                      style: DT.bodySmall.copyWith(height: 1.5)),
                  const SizedBox(height: DT.xl),
                  _field(_provinceCtl, '所在省份（如：上海市 / 广东省）'),
                  const SizedBox(height: DT.md),
                  _field(_cityCtl, '所在城市（如：上海市 / 深圳市）'),
                  const SizedBox(height: DT.xl),
                  SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _saving ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: DT.primary,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: DT.primary.withValues(alpha: 0.4),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DT.rMd)),
                      ),
                      child: Text(_saving ? '保存中\u2026' : '保存并继续',
                          style: DT.bodyLarge.copyWith(fontWeight: FontWeight.w600, color: Colors.white)),
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
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: DT.bodySmall.copyWith(color: DT.textLightGrey),
        filled: true,
        fillColor: DT.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: DT.md, vertical: DT.md),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(DT.rMd), borderSide: const BorderSide(color: DT.borderGrey)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(DT.rMd), borderSide: const BorderSide(color: DT.borderGrey)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(DT.rMd), borderSide: const BorderSide(color: DT.primary, width: 1.5)),
      ),
    );
  }
}
