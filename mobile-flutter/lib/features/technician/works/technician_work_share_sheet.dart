import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:screenshot/screenshot.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/nb_toast.dart';

/// 客户端分享落地页基址（对齐 webapp VITE_CLIENT_BASE_URL 默认值）。
const _clientBaseUrl = 'https://m.lunails.cn';

/// 作品分享名片：复制链接 / 生成并分享带二维码的海报。
/// 对齐 webapp technician-frontend/src/components/ShareModal.tsx。
class TechnicianWorkShareSheet extends StatefulWidget {
  final Map<String, dynamic> work;
  final String? invitationCode;
  final String? technicianName;

  const TechnicianWorkShareSheet({
    super.key,
    required this.work,
    this.invitationCode,
    this.technicianName,
  });

  static Future<void> show(
    BuildContext context, {
    required Map<String, dynamic> work,
    String? invitationCode,
    String? technicianName,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => TechnicianWorkShareSheet(
        work: work,
        invitationCode: invitationCode,
        technicianName: technicianName,
      ),
    );
  }

  @override
  State<TechnicianWorkShareSheet> createState() => _TechnicianWorkShareSheetState();
}

class _TechnicianWorkShareSheetState extends State<TechnicianWorkShareSheet> {
  final _screenshotController = ScreenshotController();
  bool _sharing = false;

  String get _shareLink {
    final id = widget.work['id'];
    final code = Uri.encodeComponent(widget.invitationCode ?? '');
    return '$_clientBaseUrl/w/$id?inviteCode=$code';
  }

  Future<void> _copyLink() async {
    HapticFeedback.mediumImpact();
    await Clipboard.setData(ClipboardData(text: _shareLink));
    if (!mounted) return;
    Navigator.pop(context);
    NbToast.show(context, '分享链接已复制，去微信发送给好友吧！');
  }

  Future<void> _sharePoster() async {
    if (_sharing) return;
    HapticFeedback.mediumImpact();
    setState(() => _sharing = true);
    try {
      final bytes = await _screenshotController.captureFromWidget(
        _PosterCard(
          work: widget.work,
          shareLink: _shareLink,
          technicianName: widget.technicianName,
        ),
        pixelRatio: 3,
        context: context,
      );
      final file = XFile.fromData(bytes, name: 'nail_poster.png', mimeType: 'image/png');
      await Share.shareXFiles([file], text: widget.work['title']?.toString() ?? '美甲作品');
    } catch (_) {
      if (mounted) {
        NbToast.show(context, '海报生成失败，请重试');
      }
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        decoration: BoxDecoration(
          color: DT.bg,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(DT.xl)),
        ),
        padding: const EdgeInsets.fromLTRB(DT.lg, DT.md, DT.lg, DT.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: DT.lg),
            Flexible(
              child: SingleChildScrollView(
                child: _PosterCard(
                  work: widget.work,
                  shareLink: _shareLink,
                  technicianName: widget.technicianName,
                ),
              ),
            ),
            const SizedBox(height: DT.lg),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _copyLink,
                    icon: const Icon(CupertinoIcons.link, size: 18),
                    label: const Text('复制链接'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: DT.textPrimary,
                      side: BorderSide(color: DT.border.withValues(alpha: 0.3)),
                      padding: const EdgeInsets.symmetric(vertical: DT.md),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DT.md)),
                    ),
                  ),
                ),
                const SizedBox(width: DT.md),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _sharing ? null : _sharePoster,
                    icon: _sharing
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(CupertinoIcons.share, size: 18),
                    label: Text(_sharing ? '生成中…' : '分享海报'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: DT.cream,
                      foregroundColor: DT.onCream,
                      padding: const EdgeInsets.symmetric(vertical: DT.md),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DT.md)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PosterCard extends StatelessWidget {
  final Map<String, dynamic> work;
  final String shareLink;
  final String? technicianName;

  const _PosterCard({required this.work, required this.shareLink, this.technicianName});

  @override
  Widget build(BuildContext context) {
    final title = work['title']?.toString();
    final desc = work['description']?.toString();
    final cover = work['coverUrl']?.toString();
    final images = (work['imageUrls'] as List<dynamic>?) ?? const [];
    final imageUrl = (cover != null && cover.isNotEmpty)
        ? cover
        : (images.isNotEmpty ? images.first.toString() : null);
    final tags = (work['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [];
    final name = technicianName ?? work['technicianName']?.toString() ?? '美甲师';

    return Container(
      width: 300,
      decoration: BoxDecoration(
        color: DT.surface,
        borderRadius: BorderRadius.circular(DT.xl),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 24, offset: const Offset(0, 8))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          AspectRatio(
            aspectRatio: 4 / 5,
            child: imageUrl != null
                ? CachedNetworkImage(
                    imageUrl: imageUrl,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: DT.primarySoft),
                    errorWidget: (_, __, ___) => Container(color: DT.primarySoft),
                  )
                : Container(color: DT.primarySoft),
          ),
          Padding(
            padding: const EdgeInsets.all(DT.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title?.isNotEmpty == true ? title! : '美甲作品',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: DT.titleMedium),
                if (desc != null && desc.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(desc,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, height: 1.4, color: DT.textSecondary)),
                ],
                if (tags.isNotEmpty) ...[
                  const SizedBox(height: DT.sm),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: tags.take(3).map((t) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: DT.sm, vertical: 3),
                      decoration: BoxDecoration(color: DT.primarySoft, borderRadius: BorderRadius.circular(DT.rFull)),
                      child: Text('#$t', style: const TextStyle(fontSize: 11, color: DT.primaryDark)),
                    )).toList(),
                  ),
                ],
                const SizedBox(height: DT.lg),
                Divider(height: 1, color: Colors.black.withValues(alpha: 0.06)),
                const SizedBox(height: DT.md),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: DT.textPrimary)),
                          const SizedBox(height: DT.xs),
                          const Text('扫码查看作品 · 预约同款',
                              style: TextStyle(fontSize: 11, color: DT.textSecondary)),
                        ],
                      ),
                    ),
                    const SizedBox(width: DT.md),
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: DT.surface,
                        borderRadius: BorderRadius.circular(DT.sm),
                        border: Border.all(color: Colors.black.withValues(alpha: 0.08)),
                      ),
                      child: QrImageView(
                        data: shareLink,
                        version: QrVersions.auto,
                        size: 72,
                        padding: EdgeInsets.zero,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
