import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/theme/design_tokens.dart';

class TechnicianPrivacySettingsScreen extends StatefulWidget {
  const TechnicianPrivacySettingsScreen({super.key});

  @override
  State<TechnicianPrivacySettingsScreen> createState() => _TechnicianPrivacySettingsScreenState();
}

class _TechnicianPrivacySettingsScreenState extends State<TechnicianPrivacySettingsScreen> {
  bool _showPhoneToClient = true;
  bool _showOnlineStatus = true;
  bool _worksVisibleDefault = true;
  bool _allowComments = true;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        _showPhoneToClient = prefs.getBool('privacy_showPhone') ?? true;
        _showOnlineStatus = prefs.getBool('privacy_showOnline') ?? true;
        _worksVisibleDefault = prefs.getBool('privacy_worksVisible') ?? true;
        _allowComments = prefs.getBool('privacy_allowComments') ?? true;
        _loading = false;
      });
    }
  }

  Future<void> _save(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('privacy_$key', value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DT.bgWarm,
      appBar: AppBar(
        backgroundColor: Colors.white.withOpacity(0.95),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: DT.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('隐私设置',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: DT.shadowSm,
                  ),
                  child: Column(
                    children: [
                      _buildToggle('向客户展示手机号', '关闭后客户仅可通过站内消息联系您', _showPhoneToClient, (v) {
                        setState(() => _showPhoneToClient = v);
                        _save('showPhone', v);
                      }),
                      _buildToggle('展示在线状态', '允许客户在聊天中看到您的在线/输入状态', _showOnlineStatus, (v) {
                        setState(() => _showOnlineStatus = v);
                        _save('showOnline', v);
                      }),
                      _buildToggle('新作品默认公开', '新上传的作品默认对绑定客户可见', _worksVisibleDefault, (v) {
                        setState(() => _worksVisibleDefault = v);
                        _save('worksVisible', v);
                      }),
                      _buildToggle('允许客户评论作品', '关闭后客户无法对作品发表评论', _allowComments, (v) {
                        setState(() => _allowComments = v);
                        _save('allowComments', v);
                      }, isLast: true),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text('隐私设置保存在本地，卸载后需要重新配置',
                  style: TextStyle(fontSize: 12, color: DT.textMuted)),
              ],
            ),
    );
  }

  Widget _buildToggle(String label, String description, bool value, ValueChanged<bool> onChanged, {bool isLast = false}) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: DT.textPrimary)),
                    const SizedBox(height: 2),
                    Text(description,
                      style: TextStyle(fontSize: 12, color: DT.textMuted)),
                  ],
                ),
              ),
              Switch(
                value: value,
                onChanged: onChanged,
                activeColor: DT.primary,
                activeTrackColor: DT.primarySoft,
              ),
            ],
          ),
        ),
        if (!isLast)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 18),
            child: Divider(height: 1, color: Color(0xFFF2F0F3)),
          ),
      ],
    );
  }
}
