// Legacy behavior tests exercise the complete product. Launch-mode restrictions
// have dedicated tests and must be enabled explicitly in those test cases.
process.env.MINIPROGRAM_LAUNCH_MODE = 'false';

// Unit and HTTP contract tests must run from a clean checkout without reading
// developer or production .env files. These values are test-only and public.
process.env.ADMIN_JWT_SECRET ??= 'jest-only-admin-secret-32-characters';
process.env.TECHNICIAN_JWT_SECRET ??=
  'jest-only-technician-secret-32-characters';
process.env.CLIENT_JWT_SECRET ??= 'jest-only-client-secret-32-characters';
process.env.PASSWORD_VAULT_KEY ??= 'jest-only-password-vault-key-32-chars';
