/**
 * 公众号自定义菜单定义（接口方式）。
 *
 * 与 docs/微信公众号配置与接入手册.md 附录 B 保持一致：
 *  - 一级菜单最多 3 个，每个一级下最多 5 个二级
 *  - miniprogram 类型的 pagepath 不带前导斜杠（后台可视化配置则需带 "/"）
 *  - url 为低版本客户端的备用网页，必须为 https 且已配置业务域名
 */

export const MINI_PROGRAM_APP_ID = 'wx05644a205a1844a0';
/** 备用网页：低版本微信客户端或不支持小程序时打开。 */
export const FALLBACK_URL = 'https://m.lunails.cn/';
/** 美甲师快捷报价 H5 页面链接（免登录、即开即用出单器）。 */
export const QUOTE_H5_URL = process.env.QUOTE_H5_URL || 'https://lunails.cn/quote';

export interface MenuButton {
  type?: string;
  name: string;
  key?: string;
  url?: string;
  appid?: string;
  pagepath?: string;
  sub_button?: MenuButton[];
}

function miniProgram(name: string, pagepath: string): MenuButton {
  return {
    type: 'miniprogram',
    name,
    url: FALLBACK_URL,
    appid: MINI_PROGRAM_APP_ID,
    pagepath,
  };
}

export const DEFAULT_OFFICIAL_MENU = {
  button: [
    miniProgram('立即预约', 'pages/booking/index'),
    {
      name: '我的服务',
      sub_button: [
        miniProgram('我的预约', 'pages/client/orders/index'),
        miniProgram('我的美甲师', 'pages/client/my-technicians/index'),
        { type: 'click', name: '联系客服', key: 'MENU_CONTACT_SERVICE' },
        miniProgram('使用帮助', 'pages/client/manual/index'),
        miniProgram('意见反馈', 'pages/client/feedback/index'),
      ],
    },
    {
      name: '美甲师专区',
      sub_button: [
        { type: 'view', name: '快捷报价', url: QUOTE_H5_URL },
        { type: 'view', name: '美甲师招募', url: 'https://lunails.cn/' },
        miniProgram('作品精选', 'pages/client/works/index'),
        miniProgram('发现美甲师', 'pages/client/discover/index'),
        { type: 'click', name: '关于我们', key: 'MENU_ABOUT_US' },
      ],
    },
  ],
};

