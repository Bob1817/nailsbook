const { execFileSync } = require('child_process');
const { readdirSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const checks = readdirSync(__dirname)
  .filter((name) => name.startsWith('test-') && name.endsWith('.js'))
  .sort();

execFileSync(process.execPath, [join(__dirname, 'validate-miniprogram.js')], {
  cwd: root,
  stdio: 'inherit'
});
for (const check of checks) {
  execFileSync(process.execPath, [join(__dirname, check)], {
    cwd: root,
    stdio: 'inherit'
  });
}
console.log(`发布门禁通过：1 项全量静态检查，${checks.length} 项专项检查。`);
