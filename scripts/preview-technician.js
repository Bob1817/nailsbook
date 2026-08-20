const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 14 Pro'],
    locale: 'zh-CN',
    colorScheme: 'light',
  });

  const page = await context.newPage();

  try {
    // ---- Step 1: Phone ----
    console.log('→ 打开登录页（输入手机号）');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('input[type="tel"]', { timeout: 15000 });

    await page.fill('input[type="tel"]', '13800138000');
    await page.click('button:has-text("下一步")');

    // ---- Step 2: Password ----
    console.log('→ 输入密码并登录');
    await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    await page.fill('input[type="password"]', 'demo1234');

    // 勾选协议（处理自定义勾选框）
    try {
      // 先找标准 checkbox
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.count() > 0) {
        if (!(await checkbox.isChecked())) {
          await checkbox.check({ force: true, timeout: 2000 });
        }
      } else {
        // 自定义：点击包含「同意」字样元素的第一个孩子
        const agreeContainer = page.locator('*').filter({ hasText: /我已阅读并同意/ }).first();
        await agreeContainer.click({ force: true, timeout: 2000, position: { x: 4, y: 4 } });
      }
    } catch (e) {
      console.log('  ⚠ 协议勾选未处理:', String(e).slice(0, 100));
    }

    await page.click('button:has-text("登录")');
    await page.waitForTimeout(3000);

    // 处理可能的弹出
    for (const btnText of ['✕', '×', '关闭', '跳过', '稍后再说']) {
      try {
        const el = page.getByRole('button', { name: btnText, exact: false });
        if (await el.count() > 0 && await el.first().isVisible({ timeout: 800 })) {
          console.log('→ 关闭弹窗:', btnText);
          await el.first().click({ force: true });
          await page.waitForTimeout(500);
        }
      } catch (_) { /* ignore */ }
    }

    // ---- 首页 / ----
    console.log('→ 打开首页');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    const homePath = '/Users/shibo/Documents/Codex/nailBook/client-wxapp/qa-artifacts/preview-technician-home.png';
    await page.screenshot({ path: homePath, fullPage: true });
    console.log('✓ 首页截图:', homePath);

    // ---- 行程页 /schedule ----
    console.log('→ 打开行程页');
    await page.goto('http://localhost:5173/schedule', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    const schedPath = '/Users/shibo/Documents/Codex/nailBook/client-wxapp/qa-artifacts/preview-technician-schedule.png';
    await page.screenshot({ path: schedPath, fullPage: true });
    console.log('✓ 行程页截图:', schedPath);

  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  } finally {
    await context.close();
    await browser.close();
  }
})();
