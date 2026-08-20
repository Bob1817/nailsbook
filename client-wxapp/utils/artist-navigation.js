const POST_AUTH_REDIRECT_KEY = 'post_auth_redirect';

function normalizeArtistId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? String(id) : '';
}

function normalizeSource(value) {
  const source = String(value || '').trim().toLowerCase();
  return /^[a-z0-9_-]{1,32}$/.test(source) ? source : 'artist_identity';
}

function normalizeInternalPath(value) {
  const path = String(value || '').trim();
  if (!path.startsWith('/pages/') || path.startsWith('//') || path.length > 500) return '';
  return path;
}

function artistHomePath(technicianId, source) {
  const id = normalizeArtistId(technicianId);
  if (!id) return '';
  return `/pages/client/artist-home/index?id=${id}&source=${encodeURIComponent(normalizeSource(source))}`;
}

function openArtistHome(technicianId, source) {
  const url = artistHomePath(technicianId, source);
  if (!url) {
    wx.showToast({ title: '美甲师信息暂不可用', icon: 'none' });
    return false;
  }
  wx.navigateTo({ url });
  return true;
}

function rememberPostAuthRedirect(path) {
  const normalized = normalizeInternalPath(path);
  if (normalized) wx.setStorageSync(POST_AUTH_REDIRECT_KEY, normalized);
  return normalized;
}

function buildClientLoginUrl(path, options) {
  const redirect = rememberPostAuthRedirect(path);
  const params = [];
  if (redirect) params.push(`redirect=${encodeURIComponent(redirect)}`);
  if (options && options.inviteCode) {
    params.push(`invite=${encodeURIComponent(options.inviteCode)}`);
  }
  params.push(`source=${encodeURIComponent(normalizeSource(options && options.source))}`);
  return `/pages/login/index?${params.join('&')}`;
}

function consumePostAuthRedirect(fallback) {
  const stored = normalizeInternalPath(wx.getStorageSync(POST_AUTH_REDIRECT_KEY));
  wx.removeStorageSync(POST_AUTH_REDIRECT_KEY);
  return stored || normalizeInternalPath(fallback) || '/pages/client/home/index';
}

module.exports = {
  artistHomePath,
  buildClientLoginUrl,
  consumePostAuthRedirect,
  normalizeInternalPath,
  openArtistHome,
  rememberPostAuthRedirect
};
