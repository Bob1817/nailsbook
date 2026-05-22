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

  static DeepLinkParams? parseInviteLink(Uri uri) {
    if (uri.path == '/invite' || uri.path == '/invite/') {
      final code = uri.queryParameters['invite_code'];
      final techId = uri.queryParameters['tech_id'];
      if (code != null) {
        return DeepLinkParams(
          type: DeepLinkType.invite,
          inviteCode: code,
          techId: techId != null ? int.tryParse(techId) : null,
        );
      }
    }
    return null;
  }
}

enum DeepLinkType { invite }

class DeepLinkParams {
  final DeepLinkType type;
  final String? inviteCode;
  final int? techId;

  DeepLinkParams({required this.type, this.inviteCode, this.techId});
}
