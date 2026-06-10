import 'package:nailbook_mobile/core/widgets/glass_container.dart';

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import 'client_design_service.dart';
import '../../../core/widgets/nb_toast.dart';

/// 上传/定制设计需求：标题 + 参考图（最多9张）+ 描述。
/// 对齐 webapp client-frontend/src/pages/CreateDesign.tsx。
class ClientCreateDesignScreen extends StatefulWidget {
  const ClientCreateDesignScreen({super.key});

  @override
  State<ClientCreateDesignScreen> createState() =>
      _ClientCreateDesignScreenState();
}

class _ClientCreateDesignScreenState extends State<ClientCreateDesignScreen> {
  final _titleCtl = TextEditingController();
  final _descCtl = TextEditingController();
  final List<String> _images = [];
  bool _uploading = false;
  bool _submitting = false;

  @override
  void dispose() {
    _titleCtl.dispose();
    _descCtl.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    if (_images.length >= 9) return;
    final api = context.read<ApiClient>();
    final file = await ImagePicker()
        .pickImage(source: ImageSource.gallery, maxWidth: 1600);
    if (file == null) return;
    setState(() => _uploading = true);
    try {
      final resp =
          await api.uploadMultipart('/uploads/image', file.path, 'image');
      final json =
          jsonDecode(await resp.stream.bytesToString()) as Map<String, dynamic>;
      final url = json['url'] as String?;
      if (url != null && mounted) setState(() => _images.add(url));
    } catch (_) {
      if (mounted) _toast('图片上传失败，请重试');
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _submit() async {
    if (_images.isEmpty) {
      _toast('请至少上传一张图片');
      return;
    }
    setState(() => _submitting = true);
    try {
      final api = context.read<ApiClient>();
      await ClientDesignService(api).create({
        if (_titleCtl.text.trim().isNotEmpty) 'title': _titleCtl.text.trim(),
        'imageUrls': _images,
        'description': _descCtl.text.trim(),
      });
      if (mounted) {
        _toast('设计已提交');
        Navigator.pop(context, true);
      }
    } catch (_) {
      if (mounted) {
        _toast('提交失败，请重试');
        setState(() => _submitting = false);
      }
    }
  }

  void _toast(String msg) => NbToast.show(context, msg);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F6F8),
      appBar: GlassAppBar(title: const Text('上传设计')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('设计标题', style: _labelStyle),
                const SizedBox(height: 10),
                TextField(
                  controller: _titleCtl,
                  decoration: _fieldDecoration('给你的设计起个名字…'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('上传图片（${_images.length}/9）', style: _labelStyle),
                const SizedBox(height: 12),
                _imageGrid(),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('设计描述', style: _labelStyle),
                const SizedBox(height: 10),
                TextField(
                  controller: _descCtl,
                  maxLines: 5,
                  decoration: _fieldDecoration('描述你想要的款式，如：想做类似图片的猫眼款式…'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 50,
            child: ElevatedButton(
              onPressed: (_submitting || _images.isEmpty) ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: DT.primary,
                foregroundColor: Colors.white,
                disabledBackgroundColor: DT.primary.withOpacity(0.4),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999)),
              ),
              child: Text(_submitting ? '提交中…' : '提交设计',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _imageGrid() {
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      children: [
        ..._images.asMap().entries.map((e) => _thumb(e.key, e.value)),
        if (_images.length < 9) _addButton(),
      ],
    );
  }

  Widget _thumb(int index, String url) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Stack(
        fit: StackFit.expand,
        children: [
          CachedNetworkImage(imageUrl: url, fit: BoxFit.cover),
          Positioned(
            top: 4,
            right: 4,
            child: GestureDetector(
              onTap: () => setState(() => _images.removeAt(index)),
              child: Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.5),
                    shape: BoxShape.circle),
                child: const Icon(Icons.close, size: 14, color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _addButton() {
    return GestureDetector(
      onTap: _uploading ? null : _pickImage,
      child: DottedBorderBox(
        child: Center(
          child: _uploading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: DT.primary))
              : const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.add, size: 28, color: Color(0xFF9CA3AF)),
                    SizedBox(height: 4),
                    Text('添加图片',
                        style:
                            TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(20)),
      child: child,
    );
  }

  static const _labelStyle = TextStyle(
      fontSize: 14, fontWeight: FontWeight.w600, color: DT.textPrimary);

  InputDecoration _fieldDecoration(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
        filled: true,
        fillColor: const Color(0xFFF5F6FA),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide.none),
      );
}

class DottedBorderBox extends StatelessWidget {
  final Widget child;
  const DottedBorderBox({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFFFFAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFD1D5DB), width: 1.5),
      ),
      child: child,
    );
  }
}
