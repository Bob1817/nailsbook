import 'package:nailbook_mobile/core/api/api_client.dart';
import 'client_auth_models.dart';

class ClientAuthService {
  final ApiClient _api;

  ClientAuthService(this._api);

  Future<Technician> findTechnicianByInviteCode(String inviteCode) async {
    final json = await _api.get('/auth/find-by-invite-code', queryParams: {'code': inviteCode});
    return Technician.fromJson(json);
  }

  Future<Map<String, dynamic>> requestLoginCode(String phone) async {
    return _api.post('/auth/request-login-code', body: {'phone': phone});
  }

  Future<Map<String, dynamic>> requestRegisterCode(String phone, String inviteCode) async {
    return _api.post('/auth/request-register-code', body: {
      'phone': phone,
      'inviteCode': inviteCode,
    });
  }

  Future<AuthResponse> registerByInvite({
    required String phone,
    required String code,
    required int techId,
    required String inviteCode,
  }) async {
    final json = await _api.post('/auth/register-by-invite', body: {
      'phone': phone,
      'code': code,
      'techId': techId,
      'inviteCode': inviteCode,
    });
    return AuthResponse.fromJson(json);
  }

  Future<AuthResponse> login({
    required String phone,
    required String code,
  }) async {
    final json = await _api.post('/auth/login', body: {
      'phone': phone,
      'code': code,
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
  }) async {
    final body = <String, dynamic>{
      'techId': techId,
      'inviteCode': inviteCode,
    };
    if (isDefault != null) body['isDefault'] = isDefault;
    return _api.post('/auth/bind-technician', body: body);
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
}
