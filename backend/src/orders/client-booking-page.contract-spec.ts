import { readFileSync } from 'fs';
import { resolve } from 'path';

const wxappRoot = resolve(process.cwd(), '../client-wxapp');
const readWxapp = (file: string) =>
  readFileSync(resolve(wxappRoot, file), 'utf8');

describe('客户端核心路径静态契约', () => {
  it('作品详情将来源作品带入预约提交', () => {
    const detail = readWxapp('pages/client/work-detail/index.js');
    const createOrder = readWxapp('pages/client/create-order/index.js');

    expect(detail).toContain('create-order/index?workId=');
    expect(createOrder).toContain('sourceWorkId: w.id');
    expect(createOrder).toContain(
      'if (self.sourceWorkId) payload.sourceWorkId = self.sourceWorkId;',
    );
  });

  it('公开作品预约同款在登录后保留目标页面', () => {
    const publicWorkJs = readWxapp('pages/client/public-work/index.js');
    const publicWorkWxml = readWxapp('pages/client/public-work/index.wxml');
    const login = readWxapp('pages/client/login/index.js');
    const register = readWxapp('pages/client/register/index.js');

    expect(publicWorkWxml).toContain('bindtap="bookSameStyle"');
    expect(publicWorkJs).toContain('login/index?redirect=');
    expect(login).toContain("this.redirect || '/pages/client/home/index'");
    expect(register).toContain("this.redirect || '/pages/client/home/index'");
  });

  it('聊天与设计预约入口兼容美甲师参数', () => {
    const chat = readWxapp('pages/client/chat-detail/index.js');
    const design = readWxapp('pages/client/design-detail/index.js');
    const createOrder = readWxapp('pages/client/create-order/index.js');

    expect(chat).toContain('create-order/index?techId=');
    expect(design).toContain('tech_id=');
    expect(createOrder).toContain('options.techId || options.tech_id');
  });

  it('核心页面仍注册在小程序路由中', () => {
    const appConfig = JSON.parse(readWxapp('app.json'));
    expect(appConfig.pages).toEqual(
      expect.arrayContaining([
        'pages/client/work-detail/index',
        'pages/client/create-order/index',
        'pages/client/orders/index',
        'pages/client/chat-detail/index',
      ]),
    );
  });
});
