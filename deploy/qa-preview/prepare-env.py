"""Create local QA secrets once; do not import production environment files."""
from pathlib import Path
import os
import secrets

root = Path(__file__).resolve().parents[2]
os.umask(0o077)
directory = root / '.qa-local'
directory.mkdir(exist_ok=True)
directory.chmod(0o700)
target = directory / 'backend.env'
if not target.exists():
    env = {
        'NODE_ENV': 'production', 'DATABASE_URL': 'file:/app/data/qa-preview.db',
        'JWT_EXPIRES_IN': '8h', 'AUTO_SEED_DEMO_DATA': 'false',
        'MINIPROGRAM_LAUNCH_MODE': 'true', 'MINIPROGRAM_TECHNICIAN_ID': '1',
        'ADMIN_INITIAL_USERNAME': 'qa-admin', 'ADMIN_INITIAL_PASSWORD': secrets.token_urlsafe(24),
        'QA_ACCOUNT_PASSWORD': secrets.token_urlsafe(18), 'QA_PREVIEW': 'true',
        'PORT': '3000', 'ENABLE_SWAGGER': 'false', 'STORAGE_PROVIDER': 'local',
        'UPLOAD_BASE_URL': 'http://127.0.0.1:3300', 'SMS_PROVIDER': '', 'OSS_BUCKET': '',
        'FIREBASE_SERVICE_ACCOUNT': '', 'GOOGLE_APPLICATION_CREDENTIALS': '',
        'PAYMENT_PROVIDER': '', 'ALLOW_DEV_MVP_VERIFICATION_CODE': 'false',
    }
    for key in ['ADMIN_JWT_SECRET', 'TECHNICIAN_JWT_SECRET', 'CLIENT_JWT_SECRET', 'WECHAT_SESSION_SECRET', 'SYSTEM_CONFIG_ENCRYPTION_KEY']:
        env[key] = secrets.token_hex(32)
    target.write_text(''.join(key + '=' + value + '\n' for key, value in env.items()))
target.chmod(0o600)
env = dict(line.split('=', 1) for line in target.read_text().splitlines() if '=' in line)
accounts = directory / 'TEST-ACCOUNTS.md'
accounts.write_text(
    '# 隔离测试账号（禁止用于正式环境）\n\n'
    '- 美甲师：19900000001\n- 已绑定客户 A：19900000002\n- 未绑定客户 B：19900000003\n'
    '- 三个测试账号密码：`' + env['QA_ACCOUNT_PASSWORD'] + '`\n'
    '- 管理员：qa-admin；密码：`' + env['ADMIN_INITIAL_PASSWORD'] + '`\n'
    '- 测试邀请码：QAPREVIEW\n\n仅用于本地隔离数据库，不是可接收短信的真实账号。\n'
)
accounts.chmod(0o600)
print('QA secrets and account instructions ready in ignored .qa-local; existing secrets preserved.')
