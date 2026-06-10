import 'package:nailbook_mobile/core/api/api_client.dart';
import 'technician_auth_models.dart';

class TechnicianAuthService {
  final ApiClient _api;

  TechnicianAuthService(this._api);

  /// 检查手机号注册/激活状态（对齐 webapp authService.checkPhone）。
  Future<TechnicianPhoneStatus> checkPhone(String phone) async {
    final json = await _api.post('/auth/check-phone', body: {'phone': phone});
    return TechnicianPhoneStatus.fromJson(json);
  }

  Future<TechnicianAuthResponse> login({
    required String phone,
    required String password,
  }) async {
    final json = await _api.post('/auth/login', body: {'phone': phone, 'password': password});
    return TechnicianAuthResponse.fromJson(json);
  }

  Future<TechnicianAuthResponse> register({
    required String inviteKey,
    required String name,
    required String phone,
    required String password,
  }) async {
    final json = await _api.post('/auth/register', body: {
      'inviteKey': inviteKey,
      'name': name,
      'phone': phone,
      'password': password,
    });
    return TechnicianAuthResponse.fromJson(json);
  }

  /// 已注册但未设密码的账号：设置初始密码并自动登录。
  Future<TechnicianAuthResponse> setInitialPassword({
    required String phone,
    required String newPassword,
  }) async {
    final json = await _api.post('/auth/set-initial-password', body: {
      'phone': phone,
      'newPassword': newPassword,
    });
    return TechnicianAuthResponse.fromJson(json);
  }

  Future<TechnicianProfile> getProfile() async {
    final json = await _api.get('/auth/me');
    return TechnicianProfile.fromJson(json);
  }

  Future<TechnicianProfile> updateStatus(String status) async {
    final json = await _api.patch('/auth/status', body: {'status': status});
    return TechnicianProfile.fromJson(json);
  }

  Future<TechnicianProfile> updateProfile(Map<String, dynamic> data) async {
    final json = await _api.patch('/auth/profile', body: data);
    return TechnicianProfile.fromJson(json);
  }

  Future<TechnicianProfile> updateServiceType(Map<String, dynamic> data) async {
    final json = await _api.patch('/auth/service-type', body: data);
    return TechnicianProfile.fromJson(json);
  }

  /// 已登录态强制改密（mustChangePassword 场景）。
  Future<TechnicianAuthResponse> setPassword(String newPassword) async {
    final json = await _api.post('/auth/set-password', body: {'newPassword': newPassword});
    return TechnicianAuthResponse.fromJson(json);
  }

  Future<void> changePassword(String oldPassword, String newPassword) async {
    await _api.patch('/auth/password', body: {
      'oldPassword': oldPassword,
      'newPassword': newPassword,
    });
  }
}