import 'package:nailbook_mobile/core/api/api_client.dart';
import 'client_design_models.dart';

class ClientDesignService {
  final ApiClient _api;

  ClientDesignService(this._api);

  Future<List<ClientDesign>> list() async {
    final items = await _api.getList('/designs');
    return items.map((e) => ClientDesign.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ClientDesign> detail(int id) async {
    final json = await _api.get('/designs/$id');
    return ClientDesign.fromJson(json);
  }

  Future<ClientDesign> create(Map<String, dynamic> data) async {
    final json = await _api.post('/designs', body: data);
    return ClientDesign.fromJson(json);
  }

  Future<ClientDesign> update(int id, Map<String, dynamic> data) async {
    final json = await _api.patch('/designs/$id', body: data);
    return ClientDesign.fromJson(json);
  }

  Future<ClientDesign> switchTechnician(int id, int techId) async {
    final json = await _api.patch('/designs/$id/switch-technician', body: {'techId': techId});
    return ClientDesign.fromJson(json);
  }

  Future<void> delete(int id) async {
    await _api.delete('/designs/$id');
  }
}