import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/theme/design_tokens.dart';

class TechnicianNotificationSettingsScreen extends StatefulWidget {
  const TechnicianNotificationSettingsScreen({super.key});

  @override
  State<TechnicianNotificationSettingsScreen> createState() => _TechnicianNotificationSettingsScreenState();
}

class _TechnicianNotificationSettingsScreenState extends State<TechnicianNotificationSettingsScreen> {
  bool _newOrder = true;
  bool _quoteConfirm = true;
  bool _tripReminder = true;
  bool _clientMessage = true;
  bool _marketing = false;
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
        _newOrder = prefs.getBool('notif_newOrder') ?? true;
        _quoteConfirm = prefs.getBool('notif_quoteConfirm') ?? true;
        _tripReminder = prefs.getBool('notif_tripReminder') ?? true;
        _clientMessage = prefs.getBool('notif_clientMessage') ?? true;
        _marketing = prefs.getBool('notif_marketing') ?? false;
        _loading = false;
      });
    }
  }

  Future<void> _save(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notif_$key', value);
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
        title: const Text('通知设置',
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
                      _buildToggle('新预约提醒', '收到客户新预约时通知', _newOrder, (v) {
                        setState(() => _newOrder = v);
                        _save('newOrder', v);
                      }),
                      _buildToggle('报价与确认提醒', '客户确认报价或预约状态变化时通知', _quoteConfirm, (v) {
                        setState(() => _quoteConfirm = v);
                        _save('quoteConfirm', v);
                      }),
                      _buildToggle('行程提醒', '上门服务前的出行时间提醒', _tripReminder, (v) {
                        setState(() => _tripReminder = v);
                        _save('tripReminder', v);
                      }),
                      _buildToggle('客户消息', '收到客户新消息时通知', _clientMessage, (v) {
                        setState(() => _clientMessage = v);
                        _save('clientMessage', v);
                      }),
                      _buildToggle('营销与活动通知', '平台活动和功能更新推送', _marketing, (v) {
                        setState(() => _marketing = v);
                        _save('marketing', v);
                      }, isLast: true),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text('消息推送能力上线后将按此设置生效',
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
