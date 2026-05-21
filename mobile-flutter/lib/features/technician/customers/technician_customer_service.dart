import 'package:nailbook_mobile/core/api/api_client.dart';

class TechnicianCustomerService {
  final ApiClient _api;

  TechnicianCustomerService(this._api);

  Future<List<Map<String, dynamic>>> list({String? search, String? tags}) async {
    final queryParams = <String, String>{};
    if (search != null) queryParams['search'] = search;
    if (tags != null) queryParams['tags'] = tags;
    final items = await _api.getList('/customers', queryParams: queryParams.isEmpty ? null : queryParams);
    return items.cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> detail(int id) async {
    return _api.get('/customers/$id');
  }

  Future<Map<String, dynamic>> updateTags(int id, String tags) async {
    return _api.patch('/customers/$id/tags', body: {'tags': tags});
  }
}
