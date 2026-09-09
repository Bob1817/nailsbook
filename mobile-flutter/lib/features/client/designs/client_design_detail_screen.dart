import '../../../core/theme/colors.generated.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

import '../orders/client_create_order_screen.dart';
import 'client_design_models.dart';
import 'client_design_service.dart';

/// 设计需求详情：图片 + 描述 + 状态 + 报价 + 美甲师；可发起预约 / 编辑 / 删除。
/// 对齐 webapp client-frontend/src/pages/DesignDetail.tsx（按后端真实接口裁剪）。
class ClientDesignDetailScreen extends StatefulWidget {
  final int designId;
  const ClientDesignDetailScreen({super.key, required this.designId});

  @override
  State<ClientDesignDetailScreen> createState() =>
      _ClientDesignDetailScreenState();
}

const _statusColors = <String, (Color, Color)>{
  'pending_quote': (NBColors.page, NBColors.action),
  'quoted': (NBColors.page, NBColors.action),
  'accepted': (NBColors.page, NBColors.action),
  'converted': (NBColors.page, NBColors.action),
  'rejected': (NBColors.page, NBColors.action),
};

class _ClientDesignDetailScreenState extends State<ClientDesignDetailScreen> {
  ClientDesign? _design;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final design = await ClientDesignService(context.read<ApiClient>())
          .detail(widget.designId);
      if (mounted) {
        setState(() {
          _design = design;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit() async {
    final d = _design!;
    final service = ClientDesignService(context.read<ApiClient>());
    final titleCtl = TextEditingController(text: d.title ?? '');
    final descCtl = TextEditingController(text: d.description ?? '');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('编辑设计'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
              controller: titleCtl,
              decoration: const InputDecoration(labelText: '标题')),
          const SizedBox(height: 8),
          TextField(
              controller: descCtl,
              decoration: const InputDecoration(labelText: '描述'),
              maxLines: 3),
        ]),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('保存')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      final updated = await service.update(d.id, {
        'title': titleCtl.text.trim(),
        'description': descCtl.text.trim(),
      });
      if (mounted) setState(() => _design = updated);
    } catch (_) {
      if (mounted) _toast('保存失败');
    }
  }

  Future<void> _delete() async {
    final service = ClientDesignService(context.read<ApiClient>());
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('确认删除'),
        content: const Text('删除后无法恢复，是否确认删除该设计？'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: DT.error),
            child: const Text('确认删除'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await service.delete(_design!.id);
      if (mounted) {
        _toast('已删除');
        Navigator.pop(context, true);
      }
    } catch (_) {
      if (mounted) _toast('删除失败');
    }
  }

  void _book() {
    final techId = (_design?.technician?['id'] as int?);
    Navigator.push(
        context,
        MaterialPageRoute(
            builder: (_) =>
                ClientCreateOrderScreen(preselectedTechId: techId)));
  }

  void _toast(String msg) => NbToast.show(context, msg);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ET.bg,
      appBar: GlassAppBar(
        dark: true,
        title: const Text('设计详情'),
        actions: _design == null
            ? null
            : [
                IconButton(
                    icon: const Icon(Icons.edit_outlined), onPressed: _edit),
                IconButton(
                    icon: const Icon(Icons.delete_outline), onPressed: _delete),
              ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: ET.accent))
          : _design == null
              ? const Center(child: Text('设计不存在'))
              : _buildBody(_design!),
      bottomNavigationBar: (_design == null) ? null : _bottomBar(),
    );
  }

  Widget _buildBody(ClientDesign d) {
    final images = d.imageUrls ?? const [];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (images.isNotEmpty)
          SizedBox(
            height: 280,
            child: PageView.builder(
              itemCount: images.length,
              itemBuilder: (_, i) => ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: CachedNetworkImage(
                  imageUrl: images[i],
                  fit: BoxFit.cover,
                  placeholder: (_, __) =>
                      Container(color: ET.surface),
                  errorWidget: (_, __, ___) =>
                      Container(color: ET.surface),
                ),
              ),
            ),
          ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: Text(d.title?.isNotEmpty == true ? d.title! : '未命名设计',
                  style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: ET.ink)),
            ),
            _statusBadge(d.status, d.statusLabel),
          ],
        ),
        if (d.description != null && d.description!.isNotEmpty) ...[
          const SizedBox(height: 12),
          _card(
              child: Text(d.description!,
                  style: const TextStyle(
                      fontSize: 14, height: 1.6, color: ET.inkSecondary))),
        ],
        if (d.technician != null) ...[
          const SizedBox(height: 12),
          _technicianCard(d.technician!),
        ],
        if (d.quotePrice != null) ...[
          const SizedBox(height: 12),
          _quoteCard(d),
        ],
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _statusBadge(String status, String label) {
    final c = _statusColors[status] ?? (ET.surface, ET.inkSecondary);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration:
          BoxDecoration(color: c.$1, borderRadius: BorderRadius.circular(999)),
      child: Text(label,
          style: TextStyle(
              fontSize: 12, fontWeight: FontWeight.w600, color: c.$2)),
    );
  }

  Widget _technicianCard(Map<String, dynamic> tech) {
    final name = tech['name']?.toString() ?? '美甲师';
    final avatar = tech['avatarUrl']?.toString();
    return _card(
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: ET.accentSoft,
            backgroundImage: (avatar != null && avatar.isNotEmpty)
                ? CachedNetworkImageProvider(avatar)
                : null,
            child: (avatar == null || avatar.isEmpty)
                ? Text(name.isNotEmpty ? name.substring(0, 1) : '美',
                    style: const TextStyle(color: ET.accent))
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: ET.ink)),
                const SizedBox(height: 2),
                const Text('你的专属美甲师',
                    style: TextStyle(fontSize: 12, color: ET.inkSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _quoteCard(ClientDesign d) {
    return _card(
      color: ET.accentSoft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('美甲师报价',
              style: TextStyle(fontSize: 13, color: ET.inkSecondary)),
          const SizedBox(height: 4),
          Text('¥${d.quotePrice!.toStringAsFixed(0)}',
              style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: ET.accentOnDark)),
          if (d.quoteRemark != null && d.quoteRemark!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(d.quoteRemark!,
                style: const TextStyle(fontSize: 13, color: ET.inkSecondary)),
          ],
        ],
      ),
    );
  }

  Widget _bottomBar() {
    return GlassBottomSurface(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: SizedBox(
        height: 50,
        child: ElevatedButton(
          onPressed: _book,
          style: ElevatedButton.styleFrom(
            backgroundColor: ET.cream,
            foregroundColor: ET.onCream,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999)),
          ),
          child: const Text('发起预约',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        ),
      ),
    );
  }

  Widget _card({required Widget child, Color color = ET.surface}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration:
          BoxDecoration(color: color, borderRadius: BorderRadius.circular(16)),
      child: child,
    );
  }
}
