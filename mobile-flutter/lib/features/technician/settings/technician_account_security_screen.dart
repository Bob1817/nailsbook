import 'package:provider/provider.dart';
import 'package:flutter/widgets.dart';

import '../../../core/api/api_client.dart';
import '../../shared/auth/change_password_screen.dart';
import '../auth/technician_auth_service.dart';

/// 美甲师端账号与安全：复用通用修改密码页。
class TechnicianAccountSecurityScreen extends StatelessWidget {
  const TechnicianAccountSecurityScreen({super.key});

  TechnicianAuthService _service(BuildContext context) {
    final api = context.read<ApiClient>();
    api.setRole('technician');
    return TechnicianAuthService(api);
  }

  @override
  Widget build(BuildContext context) {
    return ChangePasswordScreen(
      title: '账号与安全',
      technician: true,
      loginRoute: '/login',
      loadPhone: () async => (await _service(context).getProfile()).phone,
      submit: (oldPwd, newPwd) =>
          _service(context).changePassword(oldPwd, newPwd),
    );
  }
}
