import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;

typedef OnMessageNew = void Function(Map<String, dynamic> data);
typedef OnMessageRead = void Function(Map<String, dynamic> data);
typedef OnTypingStart = void Function(Map<String, dynamic> data);
typedef OnTypingStop = void Function(Map<String, dynamic> data);
typedef OnPresenceOnline = void Function(Map<String, dynamic> data);
typedef OnPresenceOffline = void Function(Map<String, dynamic> data);
typedef OnError = void Function(String message);

class ChatSocket {
  io.Socket? _socket;
  String? _token;
  String? _baseUrl;

  final _onMessageNewController = StreamController<Map<String, dynamic>>.broadcast();
  final _onMessageReadController = StreamController<Map<String, dynamic>>.broadcast();
  final _onTypingStartController = StreamController<Map<String, dynamic>>.broadcast();
  final _onTypingStopController = StreamController<Map<String, dynamic>>.broadcast();
  final _onPresenceOnlineController = StreamController<Map<String, dynamic>>.broadcast();
  final _onPresenceOfflineController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get onMessageNew => _onMessageNewController.stream;
  Stream<Map<String, dynamic>> get onMessageRead => _onMessageReadController.stream;
  Stream<Map<String, dynamic>> get onTypingStart => _onTypingStartController.stream;
  Stream<Map<String, dynamic>> get onTypingStop => _onTypingStopController.stream;
  Stream<Map<String, dynamic>> get onPresenceOnline => _onPresenceOnlineController.stream;
  Stream<Map<String, dynamic>> get onPresenceOffline => _onPresenceOfflineController.stream;

  bool get isConnected => _socket?.connected ?? false;

  void configure({required String baseUrl, required String token}) {
    _baseUrl = baseUrl;
    _token = token;
  }

  void connect() {
    if (_baseUrl == null || _token == null) return;
    disconnect();

    _socket = io.io(_baseUrl!, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
      'auth': {'token': _token},
    });

    _socket!.on('message:new', (data) {
      if (data is Map<String, dynamic>) {
        _onMessageNewController.add(data);
      }
    });

    _socket!.on('message:read', (data) {
      if (data is Map<String, dynamic>) {
        _onMessageReadController.add(data);
      }
    });

    _socket!.on('typing:start', (data) {
      if (data is Map<String, dynamic>) {
        _onTypingStartController.add(data);
      }
    });

    _socket!.on('typing:stop', (data) {
      if (data is Map<String, dynamic>) {
        _onTypingStopController.add(data);
      }
    });

    _socket!.on('presence:online', (data) {
      if (data is Map<String, dynamic>) {
        _onPresenceOnlineController.add(data);
      }
    });

    _socket!.on('presence:offline', (data) {
      if (data is Map<String, dynamic>) {
        _onPresenceOfflineController.add(data);
      }
    });

    _socket!.on('error', (data) {
      _socket?.disconnect();
    });

    _socket!.on('disconnect', (_) {});

    _socket!.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  Future<Map<String, dynamic>?> sendMessage({
    int? conversationId,
    int? techId,
    int? clientId,
    required String messageType,
    String? content,
    String? imageUrl,
  }) async {
    if (_socket == null || !_socket!.connected) return null;

    final data = <String, dynamic>{
      'messageType': messageType,
    };
    if (conversationId != null) data['conversationId'] = conversationId;
    if (techId != null) data['techId'] = techId;
    if (clientId != null) data['clientId'] = clientId;
    if (content != null) data['content'] = content;
    if (imageUrl != null) data['imageUrl'] = imageUrl;

    final ack = _socket!.emitWithAck('message:send', data);
    return ack as Map<String, dynamic>?;
  }

  void markAsRead(int conversationId) {
    if (_socket == null || !_socket!.connected) return;
    _socket!.emit('message:read', {'conversationId': conversationId});
  }

  void startTyping(int conversationId) {
    if (_socket == null || !_socket!.connected) return;
    _socket!.emit('typing:start', {'conversationId': conversationId});
  }

  void stopTyping(int conversationId) {
    if (_socket == null || !_socket!.connected) return;
    _socket!.emit('typing:stop', {'conversationId': conversationId});
  }

  void dispose() {
    disconnect();
    _onMessageNewController.close();
    _onMessageReadController.close();
    _onTypingStartController.close();
    _onTypingStopController.close();
    _onPresenceOnlineController.close();
    _onPresenceOfflineController.close();
  }
}
