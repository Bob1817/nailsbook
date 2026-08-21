import 'package:nailbook_mobile/core/api/api_client.dart';
import 'client_auth_models.dart';

class ClientAuthService {
  final ApiClient _api;

  ClientAuthService(this._api);

  Future<Technician> findTechnicianByInviteCode(String inviteCode) async {
    final json = await _api.get('/auth/find-by-invite-code', queryParams: {'code': inviteCode});
    return Technician.fromJson(json);
  }

  /// 检查手机号是否已注册（对齐 webapp authService.checkPhone）。
  Future<bool> checkPhone(String phone) async {
    final json = await _api.post('/auth/check-phone', body: {'phone': phone});
    return json['exists'] as bool? ?? false;
  }

  Future<AuthResponse> registerByInvite({
    required String phone,
    required String password,
    required String inviteCode,
  }) async {
    final json = await _api.post('/auth/register-by-invite', body: {
      'phone': phone,
      'password': password,
      'inviteCode': inviteCode,
    });
    return AuthResponse.fromJson(json);
  }

  Future<AuthResponse> login({
    required String phone,
    required String password,
  }) async {
    final json = await _api.post('/auth/login', body: {
      'phone': phone,
      'password': password,
    });
    return AuthResponse.fromJson(json);
  }

  Future<Map<String, dynamic>> getProfile() async {
    return _api.get('/auth/me');
  }

  Future<Map<String, dynamic>> bindTechnician({
    required int techId,
    required String inviteCode,
    bool? isDefault,
    String? note,
  }) async {
    final body = <String, dynamic>{
      'techId': techId,
      'inviteCode': inviteCode,
    };
    if (isDefault != null) body['isDefault'] = isDefault;
    if (note != null && note.trim().isNotEmpty) body['note'] = note.trim();
    return _api.post('/auth/bind-technician', body: body);
  }

  /// 历史会话再次申请绑定（已解绑，无需重新输入邀请码）。
  Future<Map<String, dynamic>> requestRebind(int techId, {String? note}) {
    return _api.post('/auth/binding-applications/request', body: {
      'techId': techId,
      if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
    });
  }

  Future<void> unbindTechnician(int techId) async {
    await _api.delete('/auth/unbind-technician/$techId');
  }

  Future<Map<String, dynamic>> setDefaultTechnician(int techId) async {
    return _api.post('/auth/set-default-technician/$techId');
  }

  Future<ClientUser> updateProfile({String? nickname, String? avatarUrl}) async {
    final body = <String, dynamic>{};
    if (nickname != null) body['nickname'] = nickname;
    if (avatarUrl != null) body['avatarUrl'] = avatarUrl;
    final json = await _api.patch('/auth/me', body: body);
    return ClientUser.fromJson(json);
  }

  /// 已登录态修改密码（PATCH /auth/password）。
  Future<void> changePassword(String oldPassword, String newPassword) async {
    await _api.patch('/auth/password', body: {
      'oldPassword': oldPassword,
      'newPassword': newPassword,
    });
  }

  Future<void> sendResetCode(String phone) async {
    await _api.post('/auth/forgot-password/send-code', body: {'phone': phone});
  }

  Future<void> resetPassword(String phone, String code, String newPassword) async {
    await _api.post('/auth/forgot-password/reset', body: {
      'phone': phone,
      'code': code,
      'newPassword': newPassword,
    });
  }
}
