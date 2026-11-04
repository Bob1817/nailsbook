const PUBLIC_CLIENT_PATHS = [
  '/pages/client/artist-home/index',
  '/pages/client/public-work/index',
  '/pages/client/quick-booking/index',
  '/pages/client/quote-confirm/index',
  '/pages/client/shop-guidance/index'
];

function routeOf(path) {
  return String(path || '').split('?')[0];
}

function isPublicClientPath(path) {
  const route = routeOf(path);
  if (PUBLIC_CLIENT_PATHS.includes(route)) return true;
  return route === '/pages/client/works/index' && /(?:\?|&)techId=\d+(?:&|$)/.test(String(path || ''));
}

function postLoginPath(role, path) {
  if (role === 'technician') {
    if (/^\/pages\/(?:client\/create-order|booking)\/index(?:\?|$)/.test(path || '')) return '/pages/technician/create-order/index';
    if (/^\/pages\/technician\//.test(path || '')) return path;
    if (isPublicClientPath(path)) return path;
    if (/^\/pages\/client\//.test(path || '') && !isPublicClientPath(path)) return '/pages/technician/home/index';
    return '/pages/technician/home/index';
  }
  if (/^\/pages\/technician\//.test(path || '')) return '/pages/client/home/index';
  if (/^\/pages\/booking\/index(?:\?|$)/.test(path || '')) return '/pages/client/create-order/index';
  return path || '/pages/client/home/index';
}
module.exports = { PUBLIC_CLIENT_PATHS, isPublicClientPath, postLoginPath };
