#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];

function relative(file) {
  return path.relative(root, file);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(file);
    return [file];
  });
}

function parseJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${relative(file)}: JSON 无法解析（${error.message}）`);
    return null;
  }
}

const appConfig = parseJson(path.join(root, 'app.json'));
const mainPages = appConfig && Array.isArray(appConfig.pages) ? appConfig.pages : [];
const subPages = appConfig && Array.isArray(appConfig.subPackages)
  ? appConfig.subPackages.flatMap((pkg) =>
      (Array.isArray(pkg.pages) ? pkg.pages : []).map((page) => `${pkg.root}/${page}`),
    )
  : [];
const pages = [...mainPages, ...subPages];
const uniquePages = new Set(pages);

if (uniquePages.size !== pages.length) {
  errors.push('app.json: 存在重复页面注册');
}

for (const page of pages) {
  const base = path.join(root, page);
  for (const extension of ['.js', '.json', '.wxml', '.wxss']) {
    const file = `${base}${extension}`;
    if (!fs.existsSync(file)) {
      errors.push(`${page}: 缺少 ${extension} 文件`);
    }
  }
}

const sourceFiles = walk(root).filter(
  (file) =>
    !file.includes(`${path.sep}.git${path.sep}`) &&
    !file.includes(`${path.sep}node_modules${path.sep}`),
);

// 按需注入不会自动注册 WXML 中的自定义组件。
const builtInHyphenTags = new Set([
  'scroll-view', 'swiper-item', 'cover-view', 'cover-image', 'movable-area',
  'movable-view', 'rich-text', 'web-view', 'official-account', 'open-data',
  'live-player', 'live-pusher', 'page-meta', 'navigation-bar', 'ad-custom',
  'match-media', 'voip-room', 'root-portal', 'keyboard-accessory',
  'checkbox-group', 'radio-group', 'picker-view', 'picker-view-column',
]);
for (const file of sourceFiles.filter((item) => item.endsWith('.wxml'))) {
  const configFile = file.replace(/\.wxml$/, '.json');
  if (!fs.existsSync(configFile)) continue;
  const config = parseJson(configFile);
  if (!config) continue;
  const components = { ...(appConfig || {}).usingComponents, ...config.usingComponents };
  const markup = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const tags = new Set(Array.from(markup.matchAll(/<([a-zA-Z][\w-]*)\b/g), (match) => match[1]));
  for (const tag of tags) {
    if (tag.includes('-') && !builtInHyphenTags.has(tag) && !components[tag]) {
      errors.push(`${relative(file)}: 自定义组件 ${tag} 未在 usingComponents 中注册`);
    }
  }
  for (const [tag, target] of Object.entries(components)) {
    if (!target.startsWith('/') && !target.startsWith('.')) continue;
    const base = target.startsWith('/') ? path.join(root, target) : path.resolve(path.dirname(file), target);
    for (const extension of ['.js', '.json', '.wxml']) {
      if (!fs.existsSync(`${base}${extension}`)) {
        errors.push(`${relative(configFile)}: 组件 ${tag} 路径 ${target} 缺少 ${extension} 文件`);
      }
    }
  }
}

for (const file of sourceFiles.filter((item) => item.endsWith('.json'))) {
  parseJson(file);
}

for (const file of sourceFiles.filter((item) => item.endsWith('.js'))) {
  const content = fs.readFileSync(file, 'utf8');
  try {
    new vm.Script(content, { filename: relative(file) });
  } catch (error) {
    errors.push(`${relative(file)}: JavaScript 语法错误（${error.message}）`);
  }

  // 微信小程序分包隔离检查：禁止分包跨包 require 其他分包文件
  if (appConfig && Array.isArray(appConfig.subPackages)) {
    for (const pkg of appConfig.subPackages) {
      const pkgDir = path.join(root, pkg.root);
      if (!file.startsWith(pkgDir + path.sep)) continue;
      const otherRoots = appConfig.subPackages.filter((p) => p.root !== pkg.root).map((p) => p.root);
      const reqMatches = content.matchAll(/require\(['"]([^'"]+)['"]\)/g);
      for (const match of reqMatches) {
        const reqPath = match[1];
        if (!reqPath.startsWith('.')) continue;
        const resolved = path.relative(root, path.resolve(path.dirname(file), reqPath));
        for (const otherRoot of otherRoots) {
          if (resolved === otherRoot || resolved.startsWith(otherRoot + path.sep)) {
            errors.push(`${relative(file)}: 非法跨分包引用 "${reqPath}"（指向分包 ${otherRoot}，微信运行时会抛出 module is not defined 导致白屏）`);
          }
        }
      }
    }
  }
}

for (const file of sourceFiles.filter((item) => item.endsWith('.wxml'))) {
  const content = fs.readFileSync(file, 'utf8');
  const bindingPattern = /\{\{([^}]+)\}\}/g;
  let match;
  while ((match = bindingPattern.exec(content))) {
    const expr = match[1];
    if (/\)\s*(\.|\[)/.test(expr)) {
      errors.push(`${relative(file)}: WXML 模板表达式包含非法的括号成员访问语法 "{{${expr.trim()}}}"（WXML 不支持 (a || b).prop 或 (a || b)[0]）`);
    }
  }
}

for (const page of pages) {
  const jsFile = path.join(root, `${page}.js`);
  const wxmlFile = path.join(root, `${page}.wxml`);
  if (!fs.existsSync(jsFile) || !fs.existsSync(wxmlFile)) continue;

  const js = fs.readFileSync(jsFile, 'utf8');
  const wxml = fs.readFileSync(wxmlFile, 'utf8');
  const handlerPattern =
    /(?:bind|catch)(?::)?[a-z][a-z-]*\s*=\s*["']([A-Za-z_$][\w$]*)["']/g;
  const handlers = new Set();
  let match;
  while ((match = handlerPattern.exec(wxml))) handlers.add(match[1]);

  for (const handler of handlers) {
    const methodPattern = new RegExp(
      `(?:^|[,{\\n]\\s*)(?:async\\s+)?${handler.replace(/[$]/g, '\\$&')}\\s*(?:\\(|:)`,
      'm',
    );
    if (!methodPattern.test(js)) {
      errors.push(`${page}.wxml: 事件处理函数 ${handler} 未在页面脚本中找到`);
    }
  }
}

if (errors.length) {
  console.error(`小程序静态检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `小程序静态检查通过：${mainPages.length} 个主包页面、${subPages.length} 个分包页面，` +
    `${sourceFiles.filter((file) => file.endsWith('.js')).length} 个 JavaScript 文件，` +
    `${sourceFiles.filter((file) => file.endsWith('.json')).length} 个 JSON 文件。`,
);
