import 'package:app_links/app_links.dart';

class DeepLinkService {
  final AppLinks _appLinks = AppLinks();
  Uri? _initialLink;

  Uri? get initialLink => _initialLink;

  Future<void> init() async {
    try {
      _initialLink = await _appLinks.getInitialAppLink();
    } catch (_) {}
  }

  Stream<Uri> get onLink => _appLinks.uriLinkStream;

  /// 解析分享/邀请链接，提取邀请码及可选的目标作品。
  /// 支持三种形式（对齐 webapp 分享链接）：
  ///   /invite?invite_code=CODE&tech_id=ID
  ///   /w/:id?inviteCode=CODE        （作品分享）
  ///   /artist/:code                 （美甲师名片）
  static DeepLinkParams? parseInviteLink(Uri uri) {
    final segments = uri.pathSegments;

    // /invite?invite_code=...
    if (uri.path == '/invite' || uri.path == '/invite/') {
      final code = uri.queryParameters['invite_code'] ?? uri.queryParameters['inviteCode'];
      final techId = uri.queryParameters['tech_id'];
      if (code != null && code.isNotEmpty) {
        return DeepLinkParams(
          type: DeepLinkType.invite,
          inviteCode: code,
          techId: techId != null ? int.tryParse(techId) : null,
        );
      }
    }

    // /w/:id?inviteCode=...
    if (segments.length == 2 && segments.first == 'w') {
      final workId = int.tryParse(segments[1]);
      final code = uri.queryParameters['inviteCode'] ?? uri.queryParameters['invite_code'];
      if (workId != null) {
        return DeepLinkParams(
          type: DeepLinkType.work,
          inviteCode: (code != null && code.isNotEmpty) ? code : null,
          workId: workId,
        );
      }
    }

    // /artist/:code
    if (segments.length == 2 && segments.first == 'artist') {
      final code = segments[1];
      if (code.isNotEmpty) {
        return DeepLinkParams(type: DeepLinkType.artist, inviteCode: code);
      }
    }

    return null;
  }
}

enum DeepLinkType { invite, work, artist }

class DeepLinkParams {
  final DeepLinkType type;
  final String? inviteCode;
  final int? techId;
  final int? workId;

  DeepLinkParams({required this.type, this.inviteCode, this.techId, this.workId});
}
