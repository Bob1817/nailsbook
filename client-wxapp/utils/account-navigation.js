function postLoginPath(role, path) {
  if (role === 'technician') {
    if (/^\/pages\/(?:client\/create-order|booking)\/index(?:\?|$)/.test(path || '')) return '/pages/technician/create-order/index';
    return '/pages/technician/home/index';
  }
  if (/^\/pages\/booking\/index(?:\?|$)/.test(path || '')) return '/pages/client/create-order/index';
  return path || '/pages/client/home/index';
}
module.exports = { postLoginPath };
