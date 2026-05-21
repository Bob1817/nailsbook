import 'package:nailbook_mobile/core/api/api_client.dart';
import 'technician_auth_models.dart';

class TechnicianAuthService {
  final ApiClient _api;

  TechnicianAuthService(this._api);

  Future<Map<String, dynamic>> requestCode(String phone) async {
    return _api.post('/auth/request-code', body: {'phone': phone});
  }

  Future<TechnicianAuthResponse> login({
    required String phone,
    required String code,
  }) async {
    final json = await _api.post('/auth/login', body: {'phone': phone, 'password': code});
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
}