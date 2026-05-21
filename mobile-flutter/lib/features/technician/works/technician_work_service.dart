import 'package:nailbook_mobile/core/api/api_client.dart';

class TechnicianWorkService {
  final ApiClient _api;

  TechnicianWorkService(this._api);

  Future<List<Map<String, dynamic>>> list() async {
    final items = await _api.getList('/works');
    return items.cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> detail(int id) async {
    return _api.get('/works/$id');
  }

  Future<Map<String, dynamic>> create(Map<String, dynamic> data) async {
    return _api.post('/works', body: data);
  }

  Future<Map<String, dynamic>> update(int id, Map<String, dynamic> data) async {
    return _api.patch('/works/$id', body: data);
  }

  Future<void> delete(int id) async {
    await _api.delete('/works/$id');
  }

  Future<Map<String, dynamic>> toggleVisible(int id) async {
    return _api.post('/works/$id/toggle-visible');
  }

  Future<Map<String, dynamic>> togglePinned(int id) async {
    return _api.post('/works/$id/toggle-pinned');
  }

  Future<Map<String, dynamic>> toggleFeatured(int id) async {
    return _api.post('/works/$id/toggle-featured');
  }
}

class TechnicianServiceService {
  final ApiClient _api;

  TechnicianServiceService(this._api);

  Future<List<Map<String, dynamic>>> list() async {
    final items = await _api.getList('/services');
    return items.cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> create(Map<String, dynamic> data) async {
    return _api.post('/services', body: data);
  }

  Future<Map<String, dynamic>> update(String id, Map<String, dynamic> data) async {
    return _api.patch('/services/$id', body: data);
  }

  Future<Map<String, dynamic>> toggle(String id) async {
    return _api.patch('/services/$id/toggle');
  }

  Future<void> delete(String id) async {
    await _api.delete('/services/$id');
  }
}
