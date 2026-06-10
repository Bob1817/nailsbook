import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/theme/editorial_tokens.dart';
import '../auth/client_auth_service.dart';
import '../auth/client_auth_models.dart';
import '../addresses/client_addresses_screen.dart';
import '../designs/client_designs_screen.dart';
import '../works/client_favorites_screen.dart';
import '../works/client_likes_screen.dart';
import '../profile/client_edit_profile_screen.dart';
import '../settings/client_change_password_screen.dart';
import '../settings/client_notification_settings_screen.dart';
import '../settings/client_help_feedback_screen.dart';
import '../settings/client_legal_doc_screen.dart';
import '../../shared/chat/conversations_screen.dart';

class ClientProfileScreen extends StatefulWidget {
  const ClientProfileScreen({super.key});

  @override
  State<ClientProfileScreen> createState() => _ClientProfileScreenState();
}

class _ClientProfileScreenState extends State<ClientProfileScreen> {
  Map<String, dynamic>? _profile;
  List<Technician>? _technicians;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final apiClient = context.read<ApiClient>();
      final data = await ClientAuthService(apiClient).getProfile();
      if (mounted) {
        setState(() {
          _profile = data;
          _technicians = (data['technicians'] as List<dynamic>?)
                  ?.map((e) => Technician.fromJson(e as Map<String, dynamic>))
                  .toList() ??
              [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(backgroundColor: ET.bg, body: Center(child: CircularProgressIndicator(color: ET.accent)));

    final client = (_profile?['client'] as Map<String, dynamic>?) ?? _profile;
    final nickname = (client?['nickname'] as String?) ?? '';
    final phone = (client?['phone'] as String?) ?? '';
    final avatarUrl = client?['avatarUrl'] as String?;

    final topPad = MediaQuery.of(context).padding.top;
    final headerH = topPad + 150;

    return Scaffold(
      backgroundColor: ET.bg,
      body: Stack(
        children: [
          ListView(
            padding: EdgeInsets.only(top: headerH + 8, bottom: 96),
            children: [
          if (_technicians != null && _technicians!.isNotEmpty) ...[
            _sectionTitle('我的美甲师'),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  ..._technicians!.map(_technicianCard),
                  const SizedBox(height: 4),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => _showBindDialog(context),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: ET.accentOnDark,
                        side: const BorderSide(color: ET.hairline),
                      ),
                      icon: const Icon(Icons.add_rounded, size: 18),
                      label: const Text('绑定新美甲师'),
                    ),
                  ),
                ],
              ),
            ),
          ],
          _sectionTitle('我的服务'),
          _menuCard([
            _MenuItem(Icons.location_on_outlined, '地址管理', () => _push(const ClientAddressesScreen())),
            _MenuItem(Icons.palette_outlined, '我的设计', () => _push(const ClientDesignsScreen())),
            _MenuItem(Icons.favorite_outline_rounded, '我的收藏', () => _push(const ClientFavoritesScreen())),
            _MenuItem(Icons.thumb_up_outlined, '我的点赞', () => _push(const ClientLikesScreen())),
            _MenuItem(Icons.headset_mic_outlined, '联系客服', () => _push(const ConversationsScreen())),
          ]),
          _sectionTitle('账号设置'),
          _menuCard([
            _MenuItem(Icons.lock_outline_rounded, '修改密码', () => _push(const ClientChangePasswordScreen())),
            _MenuItem(Icons.notifications_none_rounded, '通知设置', () => _push(const ClientNotificationSettingsScreen())),
            _MenuItem(Icons.help_outline_rounded, '帮助与反馈', () => _push(const ClientHelpFeedbackScreen())),
            _MenuItem(Icons.description_outlined, '用户协议', () => _push(const ClientLegalDocScreen(type: 'terms'))),
            _MenuItem(Icons.privacy_tip_outlined, '隐私政策', () => _push(const ClientLegalDocScreen(type: 'privacy'))),
          ]),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
            child: SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton(
                onPressed: () => context.read<AuthSession>().logout(),
                style: OutlinedButton.styleFrom(
                  foregroundColor: DT.error,
                  side: const BorderSide(color: ET.hairline),
                ),
                child: const Text('退出登录', style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
          ),
          const Center(child: Text('v1.0.0', style: TextStyle(color: ET.inkMuted, fontSize: 12))),
            ],
          ),
          // 固定的毛玻璃头部（内容滚动其下时透出模糊）
          Positioned(
            top: 0, left: 0, right: 0,
            child: _glassHeader(headerH, topPad, nickname, phone, avatarUrl),
          ),
        ],
      ),
    );
  }

  void _push(Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen)).then((_) => _loadProfile());
  }

  Widget _glassHeader(double headerH, double topPad, String nickname, String phone, String? avatarUrl) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(28)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          height: headerH,
          padding: EdgeInsets.fromLTRB(20, topPad + 12, 20, 20),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xC21D1D1F), Color(0xC248484A)], // 90% 不透明深色，透出底层模糊
            ),
            borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(2.5),
                decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white.withOpacity(0.25), width: 2.5)),
                child: CircleAvatar(
                  radius: 32,
                  backgroundColor: Colors.white,
                  backgroundImage: (avatarUrl != null && avatarUrl.isNotEmpty) ? NetworkImage(avatarUrl) : null,
                  child: (avatarUrl == null || avatarUrl.isEmpty)
                      ? Text(nickname.isNotEmpty ? nickname.substring(0, 1) : '?', style: const TextStyle(fontSize: 24, color: ET.onCream))
                      : null,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(nickname.isNotEmpty ? nickname : '未设置昵称',
                        maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                    const SizedBox(height: 4),
                    Text(phone, style: TextStyle(fontSize: 13, color: Colors.white.withOpacity(0.7))),
                    const SizedBox(height: 12),
                    GestureDetector(
                      onTap: () => _push(const ClientEditProfileScreen()),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.16),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: Colors.white.withOpacity(0.25)),
                        ),
                        child: const Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(Icons.edit_outlined, size: 14, color: Colors.white),
                          SizedBox(width: 5),
                          Text('编辑资料', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                        ]),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _technicianCard(Technician tech) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: ET.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ET.hairline),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: ET.accentSoft,
            backgroundImage: (tech.avatarUrl != null && tech.avatarUrl!.isNotEmpty) ? NetworkImage(tech.avatarUrl!) : null,
            child: (tech.avatarUrl == null || tech.avatarUrl!.isEmpty)
                ? Text(tech.name.substring(0, 1), style: const TextStyle(color: ET.accentOnDark))
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(child: Text(tech.name, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: ET.ink))),
                    if (tech.isDefault == true) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: ET.accentSoft, borderRadius: BorderRadius.circular(6)),
                        child: const Text('默认', style: TextStyle(color: ET.accentOnDark, fontSize: 10, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ],
                ),
                if (tech.city != null && tech.city!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(tech.city!, style: const TextStyle(fontSize: 12, color: ET.inkSecondary)),
                ],
              ],
            ),
          ),
          if (tech.isDefault != true)
            TextButton(
              onPressed: () => _setDefault(tech.id),
              style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 8), minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
              child: const Text('设为默认', style: TextStyle(fontSize: 12)),
            ),
          TextButton(
            onPressed: () => _unbind(tech.id),
            style: TextButton.styleFrom(foregroundColor: DT.error, padding: const EdgeInsets.symmetric(horizontal: 8), minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
            child: const Text('解除', style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
      child: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: ET.inkSecondary)),
    );
  }

  Widget _menuCard(List<_MenuItem> items) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(color: ET.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: ET.hairline)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: List.generate(items.length, (i) {
          final item = items[i];
          return Column(
            children: [
              if (i > 0) const Divider(height: 1, indent: 60, color: ET.hairlineFaint),
              Material(
                type: MaterialType.transparency,
                child: ListTile(
                  leading: Container(
                    width: 34, height: 34,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: ET.accentSoft, borderRadius: BorderRadius.circular(10)),
                    child: Icon(item.icon, color: ET.accentOnDark, size: 19),
                  ),
                  title: Text(item.label, style: const TextStyle(fontSize: 15, color: ET.ink)),
                  trailing: const Icon(Icons.chevron_right_rounded, size: 20, color: ET.inkMuted),
                  onTap: item.onTap,
                ),
              ),
            ],
          );
        }),
      ),
    );
  }

  Future<void> _setDefault(int techId) async {
    try {
      final apiClient = context.read<ApiClient>();
      await ClientAuthService(apiClient).setDefaultTechnician(techId);
      _loadProfile();
    } catch (_) {}
  }

  Future<void> _unbind(int techId) async {
    final service = ClientAuthService(context.read<ApiClient>());
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('解除绑定'),
        content: const Text('确定要解除与该美甲师的绑定吗？'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('确定')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await service.unbindTechnician(techId);
      _loadProfile();
    } catch (_) {}
  }

  void _showBindDialog(BuildContext context) {
    final codeCtl = TextEditingController();
    Technician? found;
    bool searching = false;
    bool binding = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: StatefulBuilder(
          builder: (ctx, setDialogState) => ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
              child: Container(
                padding: EdgeInsets.fromLTRB(20, 12, 20, MediaQuery.of(ctx).padding.bottom + 20),
                decoration: BoxDecoration(
                  color: ET.bgElevated.withValues(alpha: 0.96),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                  border: const Border(top: BorderSide(color: ET.hairline, width: 0.5)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40, height: 4,
                        decoration: BoxDecoration(color: ET.hairline, borderRadius: BorderRadius.circular(2)),
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Text('绑定美甲师', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: ET.ink)),
                    const SizedBox(height: 6),
                    const Text('输入美甲师提供的邀请码完成绑定', style: TextStyle(fontSize: 13, color: ET.inkMuted)),
                    const SizedBox(height: 20),
                    CupertinoTextField(
                      controller: codeCtl,
                      placeholder: '请输入邀请码',
                      autofocus: true,
                      textCapitalization: TextCapitalization.characters,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      style: const TextStyle(fontSize: 16, color: ET.ink, letterSpacing: 1.5),
                      placeholderStyle: const TextStyle(fontSize: 16, color: ET.inkMuted, letterSpacing: 0),
                      decoration: BoxDecoration(
                        color: ET.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: ET.hairline, width: 0.5),
                      ),
                      suffix: searching
                          ? const Padding(
                              padding: EdgeInsets.only(right: 14),
                              child: CupertinoActivityIndicator(radius: 9),
                            )
                          : null,
                      onChanged: (v) async {
                        if (v.trim().length >= 4) {
                          setDialogState(() => searching = true);
                          try {
                            final apiClient = context.read<ApiClient>();
                            final tech = await ClientAuthService(apiClient).findTechnicianByInviteCode(v.trim());
                            setDialogState(() { found = tech; searching = false; });
                          } catch (_) {
                            setDialogState(() { found = null; searching = false; });
                          }
                        } else {
                          setDialogState(() { found = null; searching = false; });
                        }
                      },
                    ),
                    if (found != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: ET.accentSoft,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(children: [
                          CircleAvatar(
                            radius: 22,
                            backgroundColor: ET.surface,
                            backgroundImage: (found!.avatarUrl != null && found!.avatarUrl!.isNotEmpty)
                                ? NetworkImage(found!.avatarUrl!) : null,
                            child: (found!.avatarUrl == null || found!.avatarUrl!.isEmpty)
                                ? Text(found!.name.substring(0, 1),
                                    style: const TextStyle(color: ET.accentOnDark, fontWeight: FontWeight.w600))
                                : null,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(found!.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: ET.ink)),
                                if (found!.city != null) ...[
                                  const SizedBox(height: 2),
                                  Text(found!.city!, style: const TextStyle(fontSize: 12, color: ET.inkMuted)),
                                ],
                              ],
                            ),
                          ),
                          const Icon(CupertinoIcons.checkmark_circle_fill, color: ET.accent, size: 22),
                        ]),
                      ),
                    ],
                    const SizedBox(height: 22),
                    SizedBox(
                      width: double.infinity,
                      child: CupertinoButton(
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        borderRadius: BorderRadius.circular(999),
                        color: ET.cream,
                        disabledColor: ET.cream.withValues(alpha: 0.35),
                        onPressed: (found != null && !binding) ? () async {
                          setDialogState(() => binding = true);
                          try {
                            final apiClient = context.read<ApiClient>();
                            await ClientAuthService(apiClient).bindTechnician(
                              techId: found!.id,
                              inviteCode: codeCtl.text.trim(),
                              isDefault: _technicians?.isEmpty ?? true,
                            );
                            if (ctx.mounted) Navigator.pop(ctx);
                            _loadProfile();
                          } catch (_) {
                            setDialogState(() => binding = false);
                          }
                        } : null,
                        child: binding
                            ? const CupertinoActivityIndicator(color: ET.onCream)
                            : const Text('确认绑定', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: ET.onCream)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  _MenuItem(this.icon, this.label, this.onTap);
}
