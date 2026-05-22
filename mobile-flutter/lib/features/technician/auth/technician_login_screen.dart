import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/notifications/push_notification_service.dart';
import '../../../core/socket/chat_socket.dart';
import 'technician_auth_service.dart';

class TechnicianLoginScreen extends StatefulWidget {
  const TechnicianLoginScreen({super.key});

  @override
  State<TechnicianLoginScreen> createState() => _TechnicianLoginScreenState();
}

class _TechnicianLoginScreenState extends State<TechnicianLoginScreen> {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();

  bool _codeSent = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _requestCode() async {
    if (_phoneController.text.isEmpty) return;
    setState(() { _loading = true; _error = null; });

    try {
      final apiClient = context.read<ApiClient>();
      apiClient.setRole('technician');
      final service = TechnicianAuthService(apiClient);
      await service.requestCode(_phoneController.text.trim());
      setState(() { _codeSent = true; _loading = false; });
    } catch (e) {
      setState(() { _error = '发送验证码失败'; _loading = false; });
    }
  }

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });

    try {
      final apiClient = context.read<ApiClient>();
      apiClient.setRole('technician');
      final service = TechnicianAuthService(apiClient);
      final authSession = context.read<AuthSession>();

      final res = await service.login(
        phone: _phoneController.text.trim(),
        code: _codeController.text.trim(),
      );
      await authSession.loginAsTechnician(res.accessToken, refreshToken: res.refreshToken);
      _onLoginSuccess(res.accessToken);
    } catch (e) {
      setState(() { _error = '登录失败，请重试'; _loading = false; });
    }
  }

  void _onLoginSuccess(String accessToken) {
    try {
      final pushService = context.read<PushNotificationService>();
      pushService.init(role: 'technician');
      const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3000');
      pushService.registerTokenOnServer(apiBaseUrl: apiBaseUrl, accessToken: accessToken);
    } catch (_) {}

    try {
      final chatSocket = context.read<ChatSocket>();
      const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3000');
      chatSocket.configure(baseUrl: apiBaseUrl, token: accessToken);
      chatSocket.connect();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('美甲师登录')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 32),
            const Icon(Icons.spa, size: 64, color: Color(0xFFE91E63)),
            const SizedBox(height: 24),
            Text('美甲师登录', style: Theme.of(context).textTheme.headlineMedium, textAlign: TextAlign.center),
            const SizedBox(height: 32),
            TextField(
              controller: _phoneController,
              decoration: const InputDecoration(labelText: '手机号', hintText: '请输入手机号'),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 16),
            if (_codeSent) ...[
              TextField(
                controller: _codeController,
                decoration: const InputDecoration(labelText: '验证码', hintText: '请输入验证码'),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 24),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('登录'),
                ),
              ),
            ] else ...[
              const SizedBox(height: 24),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: _loading ? null : _requestCode,
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('获取验证码'),
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 14)),
            ],
          ],
        ),
      ),
    );
  }
}