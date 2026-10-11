function isPhoneLikeNickname(nickname, phone) {
  const value = String(nickname || '').trim();
  const mobile = String(phone || '').trim();
  return !value || value === mobile || /^1[3-9]\d{9}$/.test(value);
}

function needsClientProfile(client) {
  if (!client) return true;
  return !client.avatarUrl || isPhoneLikeNickname(client.nickname, client.phone);
}

function completionUrl(next) {
  const target = next || '/pages/client/home/index';
  return '/pages/client/profile-completion/index?next=' + encodeURIComponent(target);
}

module.exports = { isPhoneLikeNickname, needsClientProfile, completionUrl };
