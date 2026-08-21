import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/design_tokens.dart';
import '../theme/editorial_tokens.dart';

/// 统一输入框样式（对齐消息对话框输入框）：无边框线条，填充底 + 聚焦柔光边界。
class GlowField extends StatefulWidget {
  final TextEditingController? controller;
  final FocusNode? focusNode;
  final String? hint;
  final int minLines;
  final int maxLines;
  final bool obscureText;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final Widget? prefix;
  final Widget? suffix;
  final EdgeInsetsGeometry contentPadding;
  final bool autofocus;

  /// 错误态：红色柔光（替代描边）提醒，输入即可由外部清除。
  final bool error;

  const GlowField({
    super.key,
    this.controller,
    this.focusNode,
    this.hint,
    this.minLines = 1,
    this.maxLines = 1,
    this.obscureText = false,
    this.keyboardType,
    this.inputFormatters,
    this.textInputAction,
    this.onChanged,
    this.onSubmitted,
    this.prefix,
    this.suffix,
    this.contentPadding =
        const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    this.autofocus = false,
    this.error = false,
  });

  @override
  State<GlowField> createState() => _GlowFieldState();
}

class _GlowFieldState extends State<GlowField> {
  late final FocusNode _focus = widget.focusNode ?? FocusNode();
  bool _ownsFocus = false;

  @override
  void initState() {
    super.initState();
    _ownsFocus = widget.focusNode == null;
    _focus.addListener(_onFocus);
  }

  void _onFocus() => setState(() {});

  @override
  void dispose() {
    _focus.removeListener(_onFocus);
    if (_ownsFocus) _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final focused = _focus.hasFocus;
    final glow = widget.error ? DT.error : ET.accent;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
      decoration: BoxDecoration(
        color: focused ? ET.bgElevated : ET.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: (focused || widget.error)
            ? [
                BoxShadow(
                  // 聚焦时柔光增强；错误态用红色柔光替代描边
                  color: glow.withValues(alpha: focused ? 0.32 : 0.24),
                  blurRadius: focused ? 20 : 14,
                  spreadRadius: 1,
                ),
                if (focused)
                  BoxShadow(
                    color: Colors.white.withValues(alpha: 0.06),
                    blurRadius: 10,
                    spreadRadius: -2,
                    offset: const Offset(0, -1),
                  ),
              ]
            : null,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (widget.prefix != null) ...[
            const SizedBox(width: 12),
            widget.prefix!,
          ],
          Expanded(
            child: TextField(
              controller: widget.controller,
              focusNode: _focus,
              autofocus: widget.autofocus,
              minLines: widget.minLines,
              maxLines: widget.obscureText ? 1 : widget.maxLines,
              obscureText: widget.obscureText,
              keyboardType: widget.keyboardType,
              inputFormatters: widget.inputFormatters,
              textInputAction: widget.textInputAction,
              cursorColor: ET.accent,
              style: const TextStyle(color: ET.ink, fontSize: 14, height: 1.4),
              onChanged: widget.onChanged,
              onSubmitted: widget.onSubmitted,
              decoration: InputDecoration(
                hintText: widget.hint,
                hintStyle: const TextStyle(color: ET.inkMuted, fontSize: 14),
                filled: true,
                fillColor: Colors.transparent,
                isDense: true,
                contentPadding: widget.contentPadding,
                border: const OutlineInputBorder(
                    borderRadius: BorderRadius.all(Radius.circular(18)),
                    borderSide: BorderSide.none),
                enabledBorder: const OutlineInputBorder(
                    borderRadius: BorderRadius.all(Radius.circular(18)),
                    borderSide: BorderSide.none),
                focusedBorder: const OutlineInputBorder(
                    borderRadius: BorderRadius.all(Radius.circular(18)),
                    borderSide: BorderSide.none),
              ),
            ),
          ),
          if (widget.suffix != null) ...[
            widget.suffix!,
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}
