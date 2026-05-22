import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';

class ClientWorkDetailScreen extends StatefulWidget {
  final int workId;

  const ClientWorkDetailScreen({super.key, required this.workId});

  @override
  State<ClientWorkDetailScreen> createState() => _ClientWorkDetailScreenState();
}

class _ClientWorkDetailScreenState extends State<ClientWorkDetailScreen> {
  Map<String, dynamic>? _work;
  List<Map<String, dynamic>> _comments = [];
  bool _loading = true;
  bool _liked = false;
  bool _favorited = false;
  int _likeCount = 0;
  int _commentPage = 1;

  @override
  void initState() {
    super.initState();
    _loadWork();
  }

  Future<void> _loadWork() async {
    try {
      final apiClient = context.read<ApiClient>();
      final data = await apiClient.get('/home/works/${widget.workId}');
      if (mounted) {
        setState(() {
          _work = data;
          _liked = data['isLiked'] as bool? ?? false;
          _favorited = data['isFavorited'] as bool? ?? false;
          _likeCount = data['likeCount'] as int? ?? 0;
          _loading = false;
        });
        _loadComments();
      }
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  Future<void> _loadComments() async {
    try {
      final apiClient = context.read<ApiClient>();
      final items = await apiClient.getList('/home/works/${widget.workId}/comments',
          queryParams: {'page': _commentPage.toString()});
      if (mounted) setState(() => _comments = items.cast<Map<String, dynamic>>());
    } catch (_) {}
  }

  Future<void> _toggleLike() async {
    try {
      final apiClient = context.read<ApiClient>();
      if (_liked) {
        await apiClient.delete('/home/works/${widget.workId}/like');
        setState(() { _liked = false; _likeCount--; });
      } else {
        await apiClient.post('/home/works/${widget.workId}/like');
        setState(() { _liked = true; _likeCount++; });
      }
    } catch (_) {}
  }

  Future<void> _toggleFavorite() async {
    try {
      final apiClient = context.read<ApiClient>();
      if (_favorited) {
        await apiClient.delete('/home/works/${widget.workId}/favorite');
        setState(() { _favorited = false; });
      } else {
        await apiClient.post('/home/works/${widget.workId}/favorite');
        setState(() { _favorited = true; });
      }
    } catch (_) {}
  }

  Future<void> _sendComment(String content) async {
    if (content.trim().isEmpty) return;
    try {
      final apiClient = context.read<ApiClient>();
      await apiClient.post('/home/works/${widget.workId}/comments', body: {'content': content.trim()});
      _loadComments();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_work == null) return const Scaffold(body: Center(child: Text('加载失败')));

    final images = (_work!['imageUrls'] as List<dynamic>?) ?? [];
    final title = _work!['title'] as String? ?? '未命名作品';
    final description = _work!['description'] as String? ?? '';
    final tags = (_work!['tags'] as List<dynamic>?) ?? [];
    final techName = (_work!['technician'] as Map<String, dynamic>?)?['name']?.toString() ?? '美甲师';

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        title: Text(techName, style: const TextStyle(color: Colors.white)),
        actions: [
          IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: () => Navigator.pop(context)),
        ],
      ),
      body: Column(children: [
        Expanded(
          child: SingleChildScrollView(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (images.isNotEmpty)
                SizedBox(
                  height: MediaQuery.of(context).size.width,
                  child: PageView.builder(
                    itemCount: images.length,
                    itemBuilder: (context, index) => CachedNetworkImage(
                      imageUrl: images[index].toString(),
                      fit: BoxFit.cover,
                      placeholder: (_, __) => const Center(child: CircularProgressIndicator()),
                      errorWidget: (_, __, ___) => const Icon(Icons.image_not_supported, color: Colors.white54),
                    ),
                  ),
                ),
              Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text(title, style: Theme.of(context).textTheme.titleLarge)),
                    IconButton(
                      icon: Icon(_liked ? Icons.favorite : Icons.favorite_border,
                          color: _liked ? Colors.red : Colors.grey, size: 28),
                      onPressed: _toggleLike,
                    ),
                    Text('$_likeCount', style: const TextStyle(fontSize: 14, color: Colors.grey)),
                    IconButton(
                      icon: Icon(_favorited ? Icons.bookmark : Icons.bookmark_border,
                          color: _favorited ? Colors.amber : Colors.grey, size: 28),
                      onPressed: _toggleFavorite,
                    ),
                  ]),
                  if (description.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(description, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                  if (tags.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Wrap(spacing: 8, runSpacing: 4, children: tags.map((t) =>
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFCE4EC),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text('#${t.toString()}', style: const TextStyle(fontSize: 12, color: Color(0xFFE91E63))),
                      ),
                    ).toList()),
                  ],
                  const SizedBox(height: 20),
                  Text('评论 (${_comments.length})', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  if (_comments.isEmpty)
                    const Center(child: Padding(padding: EdgeInsets.all(16), child: Text('暂无评论，快来抢沙发！')))
                  else
                    ..._comments.map((c) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: const Color(0xFFE91E63),
                          child: Text(
                            (c['author'] as String?)?.substring(0, 1) ?? '?',
                            style: const TextStyle(color: Colors.white, fontSize: 12),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            Text(c['author']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                            const SizedBox(width: 8),
                            Text(c['createdAt']?.toString() ?? '', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          ]),
                          const SizedBox(height: 4),
                          Text(c['content']?.toString() ?? '', style: const TextStyle(fontSize: 14)),
                        ])),
                      ]),
                    )),
                ]),
              ),
            ]),
          ),
        ),
        SafeArea(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Colors.grey.shade200))),
            child: _CommentInputBar(onSend: _sendComment),
          ),
        ),
      ]),
    );
  }

}

class _CommentInputBar extends StatefulWidget {
  final void Function(String) onSend;
  const _CommentInputBar({required this.onSend});

  @override
  State<_CommentInputBar> createState() => _CommentInputBarState();
}

class _CommentInputBarState extends State<_CommentInputBar> {
  final _ctl = TextEditingController();

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(
        child: TextField(
          controller: _ctl,
          decoration: const InputDecoration(
            hintText: '写评论...',
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
        ),
      ),
      const SizedBox(width: 8),
      SizedBox(
        height: 44,
        child: ElevatedButton(
          onPressed: _ctl.text.trim().isEmpty ? null : () {
            widget.onSend(_ctl.text);
            _ctl.clear();
          },
          child: const Text('发送'),
        ),
      ),
    ]);
  }
}