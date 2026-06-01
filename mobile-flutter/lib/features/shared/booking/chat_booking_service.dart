import 'package:nailbook_mobile/core/api/api_client.dart';

class ChatBookingService {
  final ApiClient _api;
  ChatBookingService(this._api);

  /// Client mode: fetch the technician's profile data (service types, shop addresses).
  /// Uses /auth/me which resolves to GET /api/client/auth/me with client rolePrefix.
  Future<Map<String, dynamic>?> fetchTechnicianForClient(int techId) async {
    final profile = await _api.get('/auth/me');
    final techs = (profile['technicians'] as List<dynamic>?) ?? [];
    for (final t in techs) {
      final m = t as Map<String, dynamic>;
      if ((m['id'] as int?) == techId) return m;
    }
    return null;
  }

  /// Client creates a booking from chat. chatMode=true skips server-side
  /// service-content validation. Resolves to POST /api/client/orders.
  Future<void> createClientChatBooking({
    required int techId,
    required String serviceType,
    required String serviceDate,   // 'YYYY-MM-DD'
    required String startTime,     // 'HH:mm'
    int? addressId,
    Map<String, dynamic>? shopAddress,
    String? customDescription,
    List<String>? customImages,
  }) async {
    final body = <String, dynamic>{
      'techId': techId,
      'serviceType': serviceType,
      'serviceDate': serviceDate,
      'startTime': startTime,
      'chatMode': true,
    };
    if (addressId != null) body['addressId'] = addressId;
    if (shopAddress != null) body['shopAddress'] = shopAddress;
    if (customDescription?.trim().isNotEmpty == true) {
      body['customDescription'] = customDescription!.trim();
    }
    if (customImages?.isNotEmpty == true) body['customImages'] = customImages;
    await _api.post('/orders', body: body);
  }

  /// Technician creates a booking from chat for a client.
  /// Resolves to POST /api/technician/orders.
  /// Returns the response map which includes `confirmUrl` when shareToClient=true.
  Future<Map<String, dynamic>> createTechnicianChatBooking({
    required int clientUserId,
    required String serviceType,
    required String serviceDate,   // 'YYYY-MM-DD'
    required String startTimSlot,  // 'HH:mm'
    required String address,
    double? price,
    bool shareToClient = false,
    String? customDescription,
    List<String>? customImages,
  }) async {
    // Build ISO 8601 datetime string from date + time slot
    final dt = DateTime.parse('$serviceDate $startTimSlot:00');
    final isoTime = dt.toIso8601String();

    final body = <String, dynamic>{
      'clientUserId': clientUserId,
      'serviceName': '聊天预约',
      'startTime': isoTime,
      'endTime': isoTime,
      'address': address,
      'serviceType': serviceType,
      'shareToClient': shareToClient,
    };
    if (price != null) body['price'] = price;
    if (customDescription?.trim().isNotEmpty == true) {
      body['customDescription'] = customDescription!.trim();
    }
    if (customImages?.isNotEmpty == true) body['customImages'] = customImages;
    return await _api.post('/orders', body: body);
  }

  /// Fetch token-based order detail. Must be called with a fresh ApiClient
  /// that has no rolePrefix (public endpoint).
  /// Resolves to GET /api/orders/confirm/:token.
  Future<Map<String, dynamic>> fetchConfirmDetail(String token) async {
    return await _api.get('/orders/confirm/$token');
  }

  /// Client confirms via token. No auth. Resolves to POST /api/orders/confirm/:token/accept.
  Future<void> acceptByToken(String token) async {
    await _api.post('/orders/confirm/$token/accept', body: {});
  }

  /// Client cancels via token. No auth. Resolves to POST /api/orders/confirm/:token/cancel.
  Future<void> cancelByToken(String token) async {
    await _api.post('/orders/confirm/$token/cancel', body: {});
  }
}
