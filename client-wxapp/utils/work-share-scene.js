// 24 字节授权令牌转为32字符 scene；公开作品用 w + 数字 ID。
function parseWorkScene(value) {
  let scene;
  try { scene = decodeURIComponent(value || ''); } catch (_) { return null; }
  if (/^w[1-9][0-9]{0,14}$/.test(scene)) return { id: scene.slice(1) };
  if (!/^[A-Za-z0-9_-]{32}$/.test(scene)) return null;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let token = '';
  for (let i = 0; i < scene.length; i += 4) {
    const n = (alphabet.indexOf(scene[i]) << 18) | (alphabet.indexOf(scene[i + 1]) << 12)
      | (alphabet.indexOf(scene[i + 2]) << 6) | alphabet.indexOf(scene[i + 3]);
    token += [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  return { shareToken: token };
}
module.exports = { parseWorkScene };
