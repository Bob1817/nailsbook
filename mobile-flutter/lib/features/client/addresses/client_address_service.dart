import 'package:nailbook_mobile/core/api/api_client.dart';
import 'client_address_models.dart';

class ClientAddressService {
  final ApiClient _api;

  ClientAddressService(this._api);

  Future<List<ClientAddress>> list() async {
    final items = await _api.getList('/addresses');
    return items.map((e) => ClientAddress.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ClientAddress> create(Map<String, dynamic> data) async {
    final json = await _api.post('/addresses', body: data);
    return ClientAddress.fromJson(json);
  }

  Future<ClientAddress> update(int id, Map<String, dynamic> data) async {
    final json = await _api.patch('/addresses/$id', body: data);
    return ClientAddress.fromJson(json);
  }

  Future<void> delete(int id) async {
    await _api.delete('/addresses/$id');
  }

  Future<ClientAddress> setDefault(int id) async {
    final json = await _api.post('/addresses/$id/default');
    return ClientAddress.fromJson(json);
  }
}
