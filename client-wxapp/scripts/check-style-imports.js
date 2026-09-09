const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const scanRoots = ['pages', 'components'];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

let checked = 0;
for (const relativeRoot of scanRoots) {
  const directory = path.join(root, relativeRoot);
  for (const file of walk(directory).filter((item) => item.endsWith('.wxss'))) {
    const source = fs.readFileSync(file, 'utf8');
    const imports = source.matchAll(/@import\s+['"]([^'"]+)['"]/g);
    for (const match of imports) {
      const importPath = match[1];
      if (!importPath.startsWith('.')) continue;
      checked += 1;
      assert(fs.existsSync(path.resolve(path.dirname(file), importPath)),
        `${path.relative(root, file)} 引用了不存在的样式文件 ${importPath}`);
    }
  }
}

console.log(`WXSS 样式导入路径检查通过：${checked} 个相对引用。`);
