import 'package:nailbook_mobile/core/api/api_client.dart';

class TechnicianOrderService {
  final ApiClient _api;

  TechnicianOrderService(this._api);

  Future<List<Map<String, dynamic>>> list({String? status, int? customerId}) async {
    final queryParams = <String, String>{};
    if (status != null) queryParams['status'] = status;
    if (customerId != null) queryParams['customerId'] = customerId.toString();
    final items = await _api.getList('/orders', queryParams: queryParams.isEmpty ? null : queryParams);
    return items.cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> trips() async {
    final items = await _api.getList('/orders/trips');
    return items.cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> detail(int id) async {
    return _api.get('/orders/$id');
  }

  Future<Map<String, dynamic>> create(Map<String, dynamic> data) async {
    return _api.post('/orders', body: data);
  }

  Future<Map<String, dynamic>> review(int id, Map<String, dynamic> data) async {
    return _api.patch('/orders/$id/review', body: data);
  }

  Future<Map<String, dynamic>> confirm(int id, {bool? depositConfirmed}) async {
    return _api.patch('/orders/$id/confirm', body: {
      if (depositConfirmed != null) 'depositConfirmed': depositConfirmed,
    });
  }

  Future<Map<String, dynamic>> complete(int id) async {
    return _api.patch('/orders/$id/complete');
  }

  Future<Map<String, dynamic>> cancel(int id) async {
    return _api.patch('/orders/$id/cancel');
  }

  /// 重新发起已过期预约：仅重选预约时间，其余信息保留。
  Future<Map<String, dynamic>> reinitiate(
      int id, String serviceDate, String startTime) async {
    return _api.patch('/orders/$id/reinitiate',
        body: {'serviceDate': serviceDate, 'startTime': startTime});
  }

  /// 把预约转发为会话内的预约卡片，返回 { message, conversationId }。
  Future<Map<String, dynamic>> forward(int orderId) async {
    return _api.post('/messages/forward', body: {'orderId': orderId});
  }
}
