import 'package:nailbook_mobile/core/widgets/glass_container.dart';

import '../../shared/auth/change_password_screen.dart';
import '../auth/client_auth_service.dart';

/// 客户端修改密码：复用通用页（UI 与美甲师端「账号与安全」一致）。
class ClientChangePasswordScreen extends StatelessWidget {
  const ClientChangePasswordScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangePasswordScreen(
      title: '修改密码',
      technician: false,
      loginRoute: '/login',
      loadPhone: () async {
        final p = await ClientAuthService(context.read<ApiClient>())
            .getProfile();
        return p['phone']?.toString();
      },
      submit: (oldPwd, newPwd) => ClientAuthService(context.read<ApiClient>())
          .changePassword(oldPwd, newPwd),
    );
  }
}
