const routes = {
  shop: '/pages/technician/shop-management/index',
  homepage: '/pages/technician/homepage-settings/index',
  works: '/pages/technician/works/index',
  services: '/pages/technician/services/index',
  schedule: '/pages/technician/profile/index?setup=schedule'
};
function openSetupStep(key) {
  if (routes[key]) wx.navigateTo({ url: routes[key] });
}
module.exports = { routes, openSetupStep };
