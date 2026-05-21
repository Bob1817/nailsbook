import 'package:nailbook_mobile/core/api/api_client.dart';
import 'client_order_models.dart';

class ClientOrderService {
  final ApiClient _api;

  ClientOrderService(this._api);

  Future<List<ClientOrder>> list() async {
    final items = await _api.getList('/orders');
    return items.map((e) => ClientOrder.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<ClientOrder>> trips() async {
    final items = await _api.getList('/orders/trips');
    return items.map((e) => ClientOrder.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ClientOrder> detail(int id) async {
    final json = await _api.get('/orders/$id');
    return ClientOrder.fromJson(json);
  }

  Future<ClientOrder> create(Map<String, dynamic> data) async {
    final json = await _api.post('/orders', body: data);
    return ClientOrder.fromJson(json);
  }

  Future<ClientOrder> createFromDesign(Map<String, dynamic> data) async {
    final json = await _api.post('/orders/from-design', body: data);
    return ClientOrder.fromJson(json);
  }

  Future<ClientOrder> update(int id, Map<String, dynamic> data) async {
    final json = await _api.patch('/orders/$id', body: data);
    return ClientOrder.fromJson(json);
  }

  Future<ClientOrder> agree(int id) async {
    final json = await _api.post('/orders/$id/agree');
    return ClientOrder.fromJson(json);
  }

  Future<ClientOrder> rejectQuote(int id, String reason) async {
    final json = await _api.post('/orders/$id/reject-quote', body: {'reason': reason});
    return ClientOrder.fromJson(json);
  }

  Future<ClientOrder> updateStatus(int id, String status) async {
    final json = await _api.patch('/orders/$id/status', body: {'status': status});
    return ClientOrder.fromJson(json);
  }
}
