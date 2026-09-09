import '../theme/colors.generated.dart';
import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';
import '../theme/editorial_tokens.dart';

enum NbToastType { success, error, info }

/// 统一的轻量通知：顶部滑入的毛玻璃卡片，替代默认底部全黑 SnackBar。
///
/// 用法：`NbToast.show(context, '已保存')`，类型可省略（按文案自动推断）。
class NbToast {
  static OverlayEntry? _current;

  static void show(BuildContext context, String message, {NbToastType? type}) {
    if (message.trim().isEmpty) return;
    final overlay = Overlay.maybeOf(context, rootOverlay: true);
    if (overlay == null) return;
    final resolved = type ?? _infer(message);

    _current?.remove();
    _current = null;

    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (_) => _NbToastWidget(
        message: message,
        type: resolved,
        onDismiss: () {
          if (_current == entry) _current = null;
          if (entry.mounted) entry.remove();
        },
      ),
    );
    _current = entry;
    overlay.insert(entry);
  }

  static void success(BuildContext c, String m) => show(c, m, type: NbToastType.success);
  static void error(BuildContext c, String m) => show(c, m, type: NbToastType.error);
  static void info(BuildContext c, String m) => show(c, m, type: NbToastType.info);

  static NbToastType _infer(String m) {
    if (RegExp(r'失败|错误|无效|无法|不支持|不能|出错|异常').hasMatch(m)) {
      return NbToastType.error;
    }
    if (RegExp(r'成功|已|完成|复制|提交|保存|发送|删除|绑定').hasMatch(m)) {
      return NbToastType.success;
    }
    return NbToastType.info;
  }
}

class _NbToastWidget extends StatefulWidget {
  final String message;
  final NbToastType type;
  final VoidCallback onDismiss;

  const _NbToastWidget({required this.message, required this.type, required this.onDismiss});

  @override
  State<_NbToastWidget> createState() => _NbToastWidgetState();
}

class _NbToastWidgetState extends State<_NbToastWidget> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 260));
  Timer? _timer;
  bool _closing = false;

  @override
  void initState() {
    super.initState();
    _c.forward();
    _timer = Timer(const Duration(milliseconds: 2600), _close);
  }

  void _close() {
    if (_closing) return;
    _closing = true;
    _timer?.cancel();
    if (mounted) {
      _c.reverse().then((_) => widget.onDismiss());
    } else {
      widget.onDismiss();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _c.dispose();
    super.dispose();
  }

  ({IconData icon, Color color}) get _style {
    switch (widget.type) {
      case NbToastType.success:
        return (icon: Icons.check_circle_rounded, color: NBColors.action);
      case NbToastType.error:
        return (icon: Icons.error_rounded, color: NBColors.action);
      case NbToastType.info:
        return (icon: Icons.info_rounded, color: DT.primary);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = _style;
    final curved = CurvedAnimation(parent: _c, curve: Curves.easeOutCubic, reverseCurve: Curves.easeInCubic);
    return Positioned(
      top: 0, left: 0, right: 0,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: FadeTransition(
            opacity: curved,
            child: SlideTransition(
              position: Tween<Offset>(begin: const Offset(0, -0.6), end: Offset.zero).animate(curved),
              child: Align(
                alignment: Alignment.topCenter,
                child: GestureDetector(
                  onTap: _close,
                  onVerticalDragEnd: (d) {
                    if ((d.primaryVelocity ?? 0) < 0) _close();
                  },
                  child: Material(
                    color: Colors.transparent,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 420),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                            decoration: BoxDecoration(
                              color: ET.bgElevated.withValues(alpha: 0.92),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: ET.hairlineStrong, width: 0.5),
                              boxShadow: const [
                                BoxShadow(
                                  color: Color(0x66000000),
                                  blurRadius: 28,
                                  offset: Offset(0, 12),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(s.icon, size: 20, color: s.color),
                                const SizedBox(width: 10),
                                Flexible(
                                  child: Text(
                                    widget.message,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      height: 1.35,
                                      fontWeight: FontWeight.w500,
                                      color: DT.textPrimary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
