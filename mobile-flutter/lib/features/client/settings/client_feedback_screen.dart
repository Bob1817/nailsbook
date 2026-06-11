import '../../../core/widgets/glass_container.dart';

class ClientFeedbackScreen extends StatefulWidget {
  const ClientFeedbackScreen({super.key});

  @override
  State<ClientFeedbackScreen> createState() => _ClientFeedbackScreenState();
}

class _ClientFeedbackScreenState extends State<ClientFeedbackScreen> {
  static const _maxAttachments = 3;

  final _titleCtl = TextEditingController();
  final _contentCtl = TextEditingController();
  final List<String> _attachmentUrls = [];
  bool _uploading = false;
  bool _submitting = false;

  @override
  void dispose() {
    _titleCtl.dispose();
    _contentCtl.dispose();
    super.dispose();
  }

  Future<void> _pickAttachment() async {
    if (_attachmentUrls.length >= _maxAttachments || _uploading) return;
    final file = await ImagePicker()
        .pickImage(source: ImageSource.gallery, maxWidth: 1600);
    if (file == null || !mounted) return;
    setState(() => _uploading = true);
    try {
      final resp = await context
          .read<ApiClient>()
          .uploadMultipart('/uploads/image', file.path, 'file');
      final body = await resp.stream.bytesToString();
      final json = jsonDecode(body) as Map<String, dynamic>;
      final url = json['url']?.toString();
      if (url == null || url.isEmpty) throw const FormatException();
      if (mounted) setState(() => _attachmentUrls.add(url));
    } catch (_) {
      if (mounted) NbToast.show(context, '附件上传失败，请重试');
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _submit() async {
    final title = _titleCtl.text.trim();
    final content = _contentCtl.text.trim();
    if (title.isEmpty) {
      NbToast.show(context, '请输入反馈主题');
      return;
    }
    if (content.isEmpty) {
      NbToast.show(context, '请输入反馈内容');
      return;
    }

    setState(() => _submitting = true);
    try {
      await context.read<ApiClient>().post('/feedback', body: {
        'title': title,
        'type': '联系客服',
        'content': content,
        'attachmentUrls': _attachmentUrls,
      });
      if (mounted) {
        NbToast.show(context, '反馈已提交');
        Navigator.pop(context, true);
      }
    } catch (_) {
      if (mounted) NbToast.show(context, '提交失败，请重试');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).padding.bottom;
    return Scaffold(
      backgroundColor: ET.bg,
      appBar: const GlassAppBar(title: Text('问题反馈'), dark: true),
      body: ListView(
        padding: EdgeInsets.fromLTRB(16, 16, 16, bottomPad + 24),
        children: [
          _section(
            title: '反馈主题',
            child: TextField(
              controller: _titleCtl,
              maxLength: 30,
              cursorColor: ET.accent,
              style: const TextStyle(color: ET.ink, fontSize: 15),
              decoration: _inputDecoration('请简要描述你遇到的问题'),
            ),
          ),
          const SizedBox(height: 12),
          _section(
            title: '反馈内容',
            child: TextField(
              controller: _contentCtl,
              maxLines: 6,
              maxLength: 500,
              cursorColor: ET.accent,
              style: const TextStyle(color: ET.ink, fontSize: 15),
              decoration: _inputDecoration('请补充问题发生的场景、操作步骤或建议'),
            ),
          ),
          const SizedBox(height: 12),
          _section(
            title: '反馈附件',
            subtitle: '可上传问题截图，最多 $_maxAttachments 张',
            child: _attachmentGrid(),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: _submitting || _uploading ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: ET.cream,
                foregroundColor: ET.onCream,
                disabledBackgroundColor: ET.cream.withValues(alpha: 0.42),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999)),
                elevation: 0,
              ),
              child: _submitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: ET.onCream),
                    )
                  : const Text('提交反馈',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _section(
      {required String title, String? subtitle, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ET.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: ET.hairline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontSize: 15, fontWeight: FontWeight.w600, color: ET.ink)),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(subtitle,
                style: const TextStyle(fontSize: 12, color: ET.inkMuted)),
          ],
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      filled: true,
      fillColor: ET.bgElevated,
      hintText: hint,
      hintStyle: const TextStyle(color: ET.inkMuted, fontSize: 13),
      counterStyle: const TextStyle(color: ET.inkMuted, fontSize: 11),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: ET.hairlineStrong),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: ET.hairlineStrong),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: ET.accent, width: 1.2),
      ),
    );
  }

  Widget _attachmentGrid() {
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      children: [
        ..._attachmentUrls.asMap().entries.map((entry) {
          return _attachmentThumb(entry.key, entry.value);
        }),
        if (_attachmentUrls.length < _maxAttachments) _addAttachmentButton(),
      ],
    );
  }

  Widget _attachmentThumb(int index, String url) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Stack(
        fit: StackFit.expand,
        children: [
          CachedNetworkImage(
            imageUrl: url,
            fit: BoxFit.cover,
            placeholder: (_, __) => Container(color: ET.bgElevated),
            errorWidget: (_, __, ___) => Container(
              color: ET.bgElevated,
              child: const Icon(Icons.image_not_supported_outlined,
                  color: ET.inkMuted),
            ),
          ),
          Positioned(
            top: 4,
            right: 4,
            child: GestureDetector(
              onTap: () => setState(() => _attachmentUrls.removeAt(index)),
              child: Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.55),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.close_rounded,
                    size: 15, color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _addAttachmentButton() {
    return GestureDetector(
      onTap: _uploading ? null : _pickAttachment,
      child: Container(
        decoration: BoxDecoration(
          color: ET.bgElevated,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: ET.hairlineStrong),
        ),
        child: Center(
          child: _uploading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: ET.accent),
                )
              : const Icon(Icons.add_photo_alternate_outlined,
                  size: 28, color: ET.inkMuted),
        ),
      ),
    );
  }
}
