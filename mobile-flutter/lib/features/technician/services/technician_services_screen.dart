import 'package:nailbook_mobile/core/widgets/glass_container.dart';

import '../works/technician_work_service.dart';

// ════════════════════════════════════════════════════════════════════
// 服务管理页面
//
// • 顶部导航栏：与首页一致的毛玻璃效果（GlassContainer 暗色玻璃）
// • 返回按钮 / + 按钮：与预约详情页统一样式（44×44 半透明圆形）
// • 服务卡片：展示名称、内容说明、价格 + 编辑/删除/开关
// • 新增弹窗：毛玻璃透明背景，含名称、内容、价格三个字段
// ════════════════════════════════════════════════════════════════════

class TechnicianServicesScreen extends StatefulWidget {
  const TechnicianServicesScreen({super.key});

  @override
  State<TechnicianServicesScreen> createState() =>
      _TechnicianServicesScreenState();
}

class _TechnicianServicesScreenState extends State<TechnicianServicesScreen> {
  List<Map<String, dynamic>> _services = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadServices();
  }

  // ──── 数据加载 ────

  Future<void> _loadServices() async {
    try {
      final apiClient = context.read<ApiClient>();
      final items = await TechnicianServiceService(apiClient).list();
      if (mounted) {
        setState(() {
          _services = items;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleService(String id) async {
    try {
      final apiClient = context.read<ApiClient>();
      await TechnicianServiceService(apiClient).toggle(id);
      _loadServices();
    } catch (_) {}
  }

  Future<void> _deleteService(String id, String name) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('删除服务'),
        content: Text('确定删除「$name」吗？'),
        actions: [
          CupertinoDialogAction(
              child: const Text('取消'),
              onPressed: () => Navigator.pop(ctx, false)),
          CupertinoDialogAction(
              isDestructiveAction: true,
              child: const Text('删除'),
              onPressed: () => Navigator.pop(ctx, true)),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    HapticFeedback.mediumImpact();
    try {
      final apiClient = context.read<ApiClient>();
      await TechnicianServiceService(apiClient).delete(id);
      if (mounted) {
        NbToast.success(context, '已删除「$name」');
        _loadServices();
      }
    } catch (_) {
      if (mounted) NbToast.error(context, '删除失败，请重试');
    }
  }

  // ──── 编辑弹窗 ────

  void _showEditDialog(BuildContext context, Map<String, dynamic> svc) {
    final id = svc['id'] as String;
    final nameCtl = TextEditingController(text: svc['name']?.toString() ?? '');
    final descCtl =
        TextEditingController(text: svc['description']?.toString() ?? '');
    final priceCtl = TextEditingController(
        text: (svc['price'] as num?)?.toString() ?? '');

    _showGlassDialog(
      context: context,
      title: '编辑服务',
      nameCtl: nameCtl,
      descCtl: descCtl,
      priceCtl: priceCtl,
      confirmLabel: '保存',
      onConfirm: () async {
        HapticFeedback.mediumImpact();
        try {
          final apiClient = context.read<ApiClient>();
          await TechnicianServiceService(apiClient).update(id, {
            'name': nameCtl.text,
            'description': descCtl.text,
            'price': double.tryParse(priceCtl.text) ?? 0,
          });
          if (context.mounted) {
            NbToast.success(context, '服务已更新');
            _loadServices();
          }
        } catch (_) {
          if (context.mounted) NbToast.error(context, '更新失败，请重试');
        }
      },
    );
  }

  // ──── 新增弹窗 ────

  void _showCreateDialog(BuildContext context) {
    final nameCtl = TextEditingController();
    final descCtl = TextEditingController();
    final priceCtl = TextEditingController();

    _showGlassDialog(
      context: context,
      title: '新建服务',
      nameCtl: nameCtl,
      descCtl: descCtl,
      priceCtl: priceCtl,
      confirmLabel: '创建',
      onConfirm: () async {
        HapticFeedback.mediumImpact();
        try {
          final apiClient = context.read<ApiClient>();
          await TechnicianServiceService(apiClient).create({
            'name': nameCtl.text,
            'description': descCtl.text,
            'price': double.tryParse(priceCtl.text) ?? 0,
          });
          if (context.mounted) {
            NbToast.success(context, '服务已创建');
            _loadServices();
          }
        } catch (_) {
          if (context.mounted) NbToast.error(context, '创建失败，请重试');
        }
      },
    );
  }

  // ──── 统一毛玻璃弹窗 ────

  void _showGlassDialog({
    required BuildContext context,
    required String title,
    required TextEditingController nameCtl,
    required TextEditingController descCtl,
    required TextEditingController priceCtl,
    required String confirmLabel,
    required Future<void> Function() onConfirm,
  }) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        var saving = false;
        return StatefulBuilder(
          builder: (ctx, setSheetState) => _GlassFormSheet(
            title: title,
            nameCtl: nameCtl,
            descCtl: descCtl,
            priceCtl: priceCtl,
            confirmLabel: confirmLabel,
            saving: saving,
            onConfirm: () async {
              if (nameCtl.text.trim().isEmpty) {
                NbToast.error(context, '请输入服务名称');
                return;
              }
              setSheetState(() => saving = true);
              await onConfirm();
              if (ctx.mounted) Navigator.pop(ctx);
            },
          ),
        );
      },
    );
  }

  // ────────────────────────────────────────────────────────────────
  // BUILD
  // ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: DT.bg,
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: DT.primary))
          : Stack(
              children: [
                // ── 内容列表 ──
                _services.isEmpty
                    ? _emptyState(topPad)
                    : RefreshIndicator(
                        color: DT.primary,
                        onRefresh: _loadServices,
                        child: ListView.separated(
                          padding: EdgeInsets.fromLTRB(
                              DT.xl, topPad + 80, DT.xl, bottomPad + DT.xxxl),
                          itemCount: _services.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: DT.md),
                          itemBuilder: (_, i) =>
                              _serviceCard(_services[i]),
                        ),
                      ),

                // ── 毛玻璃导航栏 ──
                Positioned(
                    left: 0, right: 0, top: 0, child: _header(topPad)),
              ],
            ),
    );
  }

  // ──── 毛玻璃导航栏（与首页一致的暗色玻璃） ────

  Widget _header(double topPad) {
    return GlassContainer(
      tint: TechnicianGlassStyle.tint,
      blur: TechnicianGlassStyle.blur,
      opacity: TechnicianGlassStyle.opacity,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.fromLTRB(DT.sm, topPad + DT.xs, DT.sm, DT.md),
      child: Row(
        children: [
          // 返回按钮（与预约详情页统一样式）
          _circleIconButton(
            icon: CupertinoIcons.back,
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
          ),
          const SizedBox(width: DT.md),
          const Expanded(
              child: Text('服务管理',
                  textAlign: TextAlign.center, style: DT.titleMedium)),
          // 新增按钮（与返回按钮统一样式和大小）
          _circleIconButton(
            icon: CupertinoIcons.plus,
            onTap: () {
              HapticFeedback.lightImpact();
              _showCreateDialog(context);
            },
          ),
        ],
      ),
    );
  }

  // ──── 统一圆形图标按钮（44×44，半透明表面） ────

  Widget _circleIconButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: DT.surface.withValues(alpha: 0.45),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 18, color: DT.textPrimary),
      ),
    );
  }

  // ──── 空状态 ────

  Widget _emptyState(double topPad) {
    return ListView(
      padding: EdgeInsets.fromLTRB(DT.xl, topPad + 80, DT.xl, DT.xxxl),
      children: [
        const SizedBox(height: 80),
        Center(
          child: Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
                color: DT.surfaceAlt,
                borderRadius: BorderRadius.circular(24)),
            child: const Icon(CupertinoIcons.square_grid_2x2,
                size: 32, color: DT.textTertiary),
          ),
        ),
        const SizedBox(height: 14),
        const Center(
          child: Text('暂无服务项目，点击右上角 + 添加',
              style: TextStyle(fontSize: 14, color: DT.textMuted)),
        ),
      ],
    );
  }

  // ──── 服务卡片 ────

  Widget _serviceCard(Map<String, dynamic> svc) {
    final id = svc['id'] as String;
    final name = svc['name']?.toString() ?? '';
    final description = svc['description']?.toString() ?? '';
    final price = svc['price'];
    final isActive = svc['isActive'] as bool? ?? true;

    return Container(
      padding: const EdgeInsets.all(DT.lg),
      decoration: BoxDecoration(
        color: DT.surface.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(DT.rCard),
        boxShadow: DT.shadowTile,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── 第一行：名称 + 状态开关 ──
          Row(
            children: [
              Expanded(
                child: Text(name,
                    style: DT.titleSmall.copyWith(
                        color: isActive ? DT.textPrimary : DT.textMuted)),
              ),
              Transform.scale(
                scale: 0.72,
                child: CupertinoSwitch(
                  value: isActive,
                  activeTrackColor: DT.primary,
                  inactiveTrackColor: DT.bgWarm,
                  thumbColor: DT.cream,
                  onChanged: (_) {
                    HapticFeedback.selectionClick();
                    _toggleService(id);
                  },
                ),
              ),
            ],
          ),

          // ── 服务内容说明 ──
          if (description.isNotEmpty) ...[
            const SizedBox(height: DT.sm),
            Text(description,
                style: DT.bodySmall.copyWith(
                    color: isActive ? DT.textSecondary : DT.textMuted),
                maxLines: 2,
                overflow: TextOverflow.ellipsis),
          ],

          // ── 价格 + 操作按钮 ──
          const SizedBox(height: DT.md),
          Row(
            children: [
              // 价格
              if (price != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: DT.md, vertical: 4),
                  decoration: BoxDecoration(
                    color: DT.primarySoft,
                    borderRadius: BorderRadius.circular(DT.rFull),
                  ),
                  child: Text(
                    '¥${(price is num) ? price.toStringAsFixed(price.truncateToDouble() == price ? 0 : 2) : price}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: DT.primary,
                      fontFeatures: const [FontFeature.tabularFigures()],
                      height: 1.4,
                    ),
                  ),
                ),

              const Spacer(),

              // 编辑按钮
              _cardAction(
                icon: CupertinoIcons.pencil,
                label: '编辑',
                onTap: () => _showEditDialog(context, svc),
              ),
              const SizedBox(width: DT.sm),

              // 删除按钮
              _cardAction(
                icon: CupertinoIcons.trash,
                label: '删除',
                color: DT.error,
                onTap: () => _deleteService(id, name),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _cardAction({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color? color,
  }) {
    final fg = color ?? DT.textSecondary;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        constraints: const BoxConstraints(minHeight: 36),
        padding: const EdgeInsets.symmetric(horizontal: DT.md),
        decoration: BoxDecoration(
          color: (color ?? DT.bgWarm).withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(DT.rFull),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: fg),
            const SizedBox(width: 4),
            Text(label,
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: fg,
                    height: 1.4)),
          ],
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════════
// 毛玻璃表单弹窗（新增 / 编辑共用）
// ════════════════════════════════════════════════════════════════════

class _GlassFormSheet extends StatelessWidget {
  final String title;
  final TextEditingController nameCtl;
  final TextEditingController descCtl;
  final TextEditingController priceCtl;
  final String confirmLabel;
  final bool saving;
  final VoidCallback onConfirm;

  const _GlassFormSheet({
    required this.title,
    required this.nameCtl,
    required this.descCtl,
    required this.priceCtl,
    required this.confirmLabel,
    required this.saving,
    required this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).padding.bottom;
    final viewInsets = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.fromLTRB(DT.xl, DT.md, DT.xl, bottomPad + DT.md + viewInsets * 0.0),
      decoration: const BoxDecoration(
        color: DT.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(DT.rCard)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── 拖拽指示条 ──
          Center(
            child: Container(
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: DT.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: DT.md),

          // ── 标题行 ──
          Row(
            children: [
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => Navigator.pop(context),
                child: Container(
                  constraints: const BoxConstraints(minHeight: 44, minWidth: 56),
                  alignment: Alignment.centerLeft,
                  child: Text('取消',
                      style: DT.bodyMedium.copyWith(
                          color: DT.textSecondary,
                          fontWeight: FontWeight.w600)),
                ),
              ),
              Expanded(
                child: Text(title,
                    textAlign: TextAlign.center, style: DT.titleMedium),
              ),
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: saving ? null : onConfirm,
                child: Container(
                  constraints:
                      const BoxConstraints(minHeight: 44, minWidth: 56),
                  alignment: Alignment.centerRight,
                  child: saving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: DT.primary),
                        )
                      : Text(confirmLabel,
                          style: DT.bodyMedium.copyWith(
                              color: DT.primary,
                              fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
          const SizedBox(height: DT.lg),

          // ── 服务名称 ──
          _formField(
            label: '服务名称',
            hint: '例如：日式美甲、基础护理',
            controller: nameCtl,
          ),
          const SizedBox(height: DT.md),

          // ── 服务内容 ──
          _formField(
            label: '服务内容',
            hint: '描述服务包含的项目和流程',
            controller: descCtl,
            maxLines: 3,
          ),
          const SizedBox(height: DT.md),

          // ── 服务价格 ──
          _formField(
            label: '服务价格',
            hint: '请输入价格',
            controller: priceCtl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            prefix: '¥',
          ),
          const SizedBox(height: DT.lg),
        ],
      ),
    );
  }

  Widget _formField({
    required String label,
    required String hint,
    required TextEditingController controller,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? prefix,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: DT.titleSmall.copyWith(color: DT.textSecondary)),
        const SizedBox(height: DT.sm),
        Container(
          padding: EdgeInsets.fromLTRB(
            DT.md,
            DT.sm,
            DT.md,
            DT.sm,
          ),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: DT.border, width: 0.5),
            ),
          ),
          child: Row(
            crossAxisAlignment:
                maxLines > 1 ? CrossAxisAlignment.start : CrossAxisAlignment.center,
            children: [
              if (prefix != null)
                Padding(
                  padding: const EdgeInsets.only(right: DT.sm),
                  child: Text(prefix,
                      style: DT.bodyLarge.copyWith(
                          color: DT.textTertiary,
                          fontWeight: FontWeight.w600)),
                ),
              Expanded(
                child: TextField(
                  controller: controller,
                  style: DT.bodyLarge.copyWith(color: DT.textPrimary),
                  maxLines: maxLines,
                  keyboardType: keyboardType,
                  decoration: InputDecoration(
                    hintText: hint,
                    hintStyle:
                        const TextStyle(color: DT.textMuted, fontSize: 16),
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
