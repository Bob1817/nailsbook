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
const pages = appConfig && Array.isArray(appConfig.pages) ? appConfig.pages : [];
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

for (const file of sourceFiles.filter((item) => item.endsWith('.json'))) {
  parseJson(file);
}

for (const file of sourceFiles.filter((item) => item.endsWith('.js'))) {
  try {
    new vm.Script(fs.readFileSync(file, 'utf8'), { filename: relative(file) });
  } catch (error) {
    errors.push(`${relative(file)}: JavaScript 语法错误（${error.message}）`);
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
  `小程序静态检查通过：${pages.length} 个页面，` +
    `${sourceFiles.filter((file) => file.endsWith('.js')).length} 个 JavaScript 文件，` +
    `${sourceFiles.filter((file) => file.endsWith('.json')).length} 个 JSON 文件。`,
);
