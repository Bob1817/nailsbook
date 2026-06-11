import 'dart:convert';

import 'package:nailbook_mobile/core/api/api_client.dart';

class ChatService {
  final ApiClient _api;

  ChatService(this._api);

  /// 上传语音文件，返回音频 URL。
  Future<String?> uploadAudio(String filePath) async {
    final res = await _api.uploadMultipart('/uploads/audio', filePath, 'file');
    final body = await res.stream.bytesToString();
    try {
      final json = jsonDecode(body) as Map<String, dynamic>;
      return json['url'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<List<Map<String, dynamic>>> conversations() async {
    final items = await _api.getList('/messages/conversations');
    return items.cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> messages(int conversationId) async {
    final res = await _api.get('/messages', queryParams: {'conversation_id': conversationId.toString()});
    if (res.containsKey('messages')) {
      return (res['messages'] as List<dynamic>).cast<Map<String, dynamic>>();
    }
    if (res.containsKey('data')) {
      return (res['data'] as List<dynamic>).cast<Map<String, dynamic>>();
    }
    return [];
  }

  Future<Map<String, dynamic>> sendMessage({
    int? conversationId,
    int? techId,
    int? clientId,
    required String messageType,
    String? content,
    String? imageUrl,
  }) async {
    final body = <String, dynamic>{
      'messageType': messageType,
    };
    if (conversationId != null) body['conversationId'] = conversationId;
    if (techId != null) body['techId'] = techId;
    if (clientId != null) body['clientId'] = clientId;
    if (content != null) body['content'] = content;
    if (imageUrl != null) body['imageUrl'] = imageUrl;
    final res = await _api.post('/messages', body: body);
    if (res.containsKey('message')) return res['message'] as Map<String, dynamic>;
    return res;
  }

  Future<void> markAsRead(int conversationId) async {
    await _api.patch('/messages/read', body: {'conversation_id': conversationId});
  }
}
