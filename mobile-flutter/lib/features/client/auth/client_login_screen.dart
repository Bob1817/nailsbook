import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/notifications/push_notification_service.dart';
import '../../../core/socket/chat_socket.dart';
import 'client_auth_models.dart';
import 'client_auth_service.dart';

class ClientLoginScreen extends StatefulWidget {
  const ClientLoginScreen({super.key});

  @override
  State<ClientLoginScreen> createState() => _ClientLoginScreenState();
}

class _ClientLoginScreenState extends State<ClientLoginScreen> {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  final _inviteCodeController = TextEditingController();

  bool _isRegisterMode = false;
  bool _codeSent = false;
  bool _loading = false;
  String? _error;
  Technician? _inviteTechnician;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    _inviteCodeController.dispose();
    super.dispose();
  }

  Future<void> _lookupInviteCode() async {
    if (_inviteCodeController.text.isEmpty) return;
    setState(() { _loading = true; _error = null; });

    try {
      final apiClient = context.read<ApiClient>();
      apiClient.setRole('client');
      final service = ClientAuthService(apiClient);
      final tech = await service.findTechnicianByInviteCode(_inviteCodeController.text.trim());
      setState(() { _inviteTechnician = tech; _loading = false; });
    } catch (e) {
      setState(() { _error = '邀请码无效'; _inviteTechnician = null; _loading = false; });
    }
  }

  Future<void> _requestCode() async {
    if (_phoneController.text.isEmpty) return;
    setState(() { _loading = true; _error = null; });

    try {
      final apiClient = context.read<ApiClient>();
      apiClient.setRole('client');
      final service = ClientAuthService(apiClient);

      if (_isRegisterMode) {
        await service.requestRegisterCode(
          _phoneController.text.trim(),
          _inviteCodeController.text.trim(),
        );
      } else {
        await service.requestLoginCode(_phoneController.text.trim());
      }
      setState(() { _codeSent = true; _loading = false; });
    } catch (e) {
      setState(() { _error = '发送验证码失败'; _loading = false; });
    }
  }

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });

    try {
      final apiClient = context.read<ApiClient>();
      apiClient.setRole('client');
      final service = ClientAuthService(apiClient);
      final authSession = context.read<AuthSession>();

      if (_isRegisterMode && _inviteTechnician != null) {
        final res = await service.registerByInvite(
          phone: _phoneController.text.trim(),
          code: _codeController.text.trim(),
          techId: _inviteTechnician!.id,
          inviteCode: _inviteCodeController.text.trim(),
        );
        await authSession.loginAsClient(res.accessToken, refreshToken: res.refreshToken);
        _onLoginSuccess(res.accessToken);
      } else {
        final res = await service.login(
          phone: _phoneController.text.trim(),
          code: _codeController.text.trim(),
        );
        await authSession.loginAsClient(res.accessToken, refreshToken: res.refreshToken);
        _onLoginSuccess(res.accessToken);
      }
    } catch (e) {
      setState(() { _error = '登录失败，请重试'; _loading = false; });
    }
  }

  void _onLoginSuccess(String accessToken) {
    try {
      final pushService = context.read<PushNotificationService>();
      pushService.init(role: 'client');
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
      appBar: AppBar(title: const Text('客户登录')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 32),
            const Icon(Icons.spa, size: 64, color: Color(0xFFE91E63)),
            const SizedBox(height: 24),
            Text(
              _isRegisterMode ? '新用户注册' : '欢迎回来',
              style: Theme.of(context).textTheme.headlineMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            if (_isRegisterMode) ...[
              TextField(
                controller: _inviteCodeController,
                decoration: const InputDecoration(
                  labelText: '邀请码',
                  hintText: '输入美甲师邀请码',
                ),
                onChanged: (_) => setState(() { _inviteTechnician = null; }),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 44,
                child: ElevatedButton(
                  onPressed: _loading ? null : _lookupInviteCode,
                  child: const Text('查找美甲师'),
                ),
              ),
              if (_inviteTechnician != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5F5F5),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(children: [
                    const Icon(Icons.person, color: Color(0xFFE91E63)),
                    const SizedBox(width: 8),
                    Text(_inviteTechnician!.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                    if (_inviteTechnician!.city != null)
                      Text(' · ${_inviteTechnician!.city!}', style: const TextStyle(color: Color(0xFF757575))),
                  ]),
                ),
              ],
              const SizedBox(height: 16),
            ],
            TextField(
              controller: _phoneController,
              decoration: const InputDecoration(
                labelText: '手机号',
                hintText: '请输入手机号',
              ),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 16),
            if (_codeSent) ...[
              TextField(
                controller: _codeController,
                decoration: const InputDecoration(
                  labelText: '验证码',
                  hintText: '请输入验证码',
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 24),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : Text(_isRegisterMode ? '注册' : '登录'),
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
            const SizedBox(height: 24),
            TextButton(
              onPressed: () => setState(() {
                _isRegisterMode = !_isRegisterMode;
                _codeSent = false;
                _error = null;
              }),
              child: Text(_isRegisterMode ? '已有账号？点击登录' : '新用户？点击注册'),
            ),
          ],
        ),
      ),
    );
  }
}
