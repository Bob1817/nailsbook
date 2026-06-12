import 'package:nailbook_mobile/core/widgets/glass_container.dart';
import 'package:share_plus/share_plus.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../auth/technician_auth_models.dart';
import '../auth/technician_auth_service.dart';
import '../settings/technician_profile_settings_screen.dart';

/// 美甲师「我的名片」：预览公开名片，可点击进入编辑。
class TechnicianBusinessCardScreen extends StatefulWidget {
  const TechnicianBusinessCardScreen({super.key});

  @override
  State<TechnicianBusinessCardScreen> createState() =>
      _TechnicianBusinessCardScreenState();
}

class _TechnicianBusinessCardScreenState
    extends State<TechnicianBusinessCardScreen> {
  TechnicianProfile? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      final p = await TechnicianAuthService(api).getProfile();
      if (mounted) setState(() {
        _profile = p;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _shareUrl(TechnicianProfile p) {
    const base = 'https://m.lunails.cn';
    final code = p.invitationCode;
    if (code != null && code.isNotEmpty) {
      return '$base/artist/${Uri.encodeComponent(code)}';
    }
    return '$base/artist/${p.id}';
  }

  Future<void> _share(String text, String fallbackLink) async {
    final box = context.findRenderObject() as RenderBox?;
    try {
      await Share.share(text,
          sharePositionOrigin:
              box != null ? box.localToGlobal(Offset.zero) & box.size : null);
    } catch (_) {
      await Clipboard.setData(ClipboardData(text: fallbackLink));
      if (mounted) NbToast.success(context, '链接已复制，发给客户即可');
    }
  }

  Future<void> _edit() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
          builder: (_) => const TechnicianProfileSettingsScreen()),
    );
    _load(); // 编辑返回后刷新名片
  }

  @override
  Widget build(BuildContext context) {
    final p = _profile;
    return Scaffold(
      backgroundColor: DT.bg,
      appBar: GlassAppBar(
        dark: true,
        title: const Text('我的名片'),
        actions: [
          if (p != null)
            TextButton(
              onPressed: _edit,
              child: const Text('编辑',
                  style:
                      TextStyle(color: DT.primary, fontWeight: FontWeight.w600)),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : p == null
              ? const Center(
                  child: Text('名片加载失败，请重试',
                      style: TextStyle(color: DT.textMuted)))
              : ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    GestureDetector(
                      onTap: _edit,
                      child: _cardPreview(p),
                    ),
                    const SizedBox(height: 12),
                    Center(
                      child: Text('点击名片可编辑信息',
                          style: DT.captionLarge.copyWith(color: DT.textMuted)),
                    ),
                    const SizedBox(height: 20),
                    if (!p.bookingReady)
                      _lockedHint()
                    else
                      Row(children: [
                        Expanded(
                          child: _actionBtn(
                              CupertinoIcons.doc_on_clipboard, '复制链接', false,
                              () {
                            Clipboard.setData(
                                ClipboardData(text: _shareUrl(p)));
                            NbToast.success(context, '链接已复制，发给客户即可');
                          }),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _actionBtn(CupertinoIcons.share, '分享名片', true,
                              () => _share(
                                  '${p.name} 的美甲主页，长按或点击预约：${_shareUrl(p)}',
                                  _shareUrl(p))),
                        ),
                      ]),
                  ],
                ),
    );
  }

  Widget _cardPreview(TechnicianProfile p) {
    final url = _shareUrl(p);
    final city = p.city ?? '';
    final code = p.invitationCode;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: DT.primaryGradient,
        borderRadius: BorderRadius.circular(DT.rCard),
        boxShadow: DT.shadowButtonLg,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _avatar(p.avatarUrl, p.name),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: DT.titleLarge.copyWith(color: DT.textWhite)),
                    if (city.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Row(children: [
                        const Icon(CupertinoIcons.location_solid,
                            size: 13, color: Colors.white70),
                        const SizedBox(width: 4),
                        Text(city,
                            style: DT.bodySmall.copyWith(
                                color: Colors.white.withValues(alpha: 0.9))),
                      ]),
                    ],
                    const SizedBox(height: 10),
                    Wrap(spacing: 6, runSpacing: 6, children: [
                      if (p.homeService == true) _tag('🚗 上门'),
                      if (p.shopService == true) _tag('🏪 到店'),
                    ]),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: DT.surface,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                QrImageView(
                    data: url,
                    version: QrVersions.auto,
                    size: 84,
                    padding: EdgeInsets.zero),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('扫码或点击链接，预约我的美甲服务',
                          style: DT.bodySmall
                              .copyWith(color: DT.textPrimary, height: 1.4)),
                      if (code != null && code.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text('邀请码 $code',
                            style: DT.captionLarge
                                .copyWith(color: DT.textSecondary)),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _avatar(String? url, String name) {
    if (url != null && url.isNotEmpty) {
      return ClipOval(
        child: CachedNetworkImage(
          imageUrl: url,
          width: 56,
          height: 56,
          fit: BoxFit.cover,
          memCacheWidth: 160,
          errorWidget: (_, __, ___) => _avatarFallback(name),
        ),
      );
    }
    return _avatarFallback(name);
  }

  Widget _avatarFallback(String name) => Container(
        width: 56,
        height: 56,
        alignment: Alignment.center,
        decoration: const BoxDecoration(
            color: Colors.white24, shape: BoxShape.circle),
        child: Text(name.isNotEmpty ? name.substring(0, 1) : '美',
            style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: Colors.white)),
      );

  Widget _tag(String t) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
            color: DT.surface.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(999)),
        child: Text(t,
            style: const TextStyle(fontSize: 12, color: Colors.white)),
      );

  /// 未开启任何服务类型时锁定邀请链接，引导先去开启服务。
  Widget _lockedHint() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: DT.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: DT.border),
      ),
      child: Row(
        children: [
          const Icon(CupertinoIcons.lock_fill, size: 18, color: DT.textMuted),
          const SizedBox(width: 10),
          Expanded(
            child: Text('开启上门或到店服务后，才能生成并分享邀请链接',
                style: DT.bodySmall.copyWith(color: DT.textSecondary)),
          ),
        ],
      ),
    );
  }

  Widget _actionBtn(
      IconData icon, String label, bool filled, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 48,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: filled ? DT.cream : DT.surface,
          borderRadius: BorderRadius.circular(999),
          border: filled ? null : Border.all(color: DT.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon,
                size: 17, color: filled ? DT.onCream : DT.textPrimary),
            const SizedBox(width: 6),
            Text(label,
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: filled ? DT.onCream : DT.textPrimary)),
          ],
        ),
      ),
    );
  }
}
