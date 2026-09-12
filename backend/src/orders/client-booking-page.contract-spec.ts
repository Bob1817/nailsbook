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
    expect(createOrder).toContain('作品与当前美甲师不一致');
    expect(createOrder).toContain(
      'if (self.sourceWorkId) payload.sourceWorkId = self.sourceWorkId;',
    );
  });

  it('登录恢复前重新核对价格和定金规则', () => {
    const createOrder = readWxapp('pages/client/create-order/index.js');

    expect(createOrder).toContain('expectedPriceFen: this.expectedPriceFen()');
    expect(createOrder).toContain("draft.depositMode !== this.data.depositMode");
    expect(createOrder).toContain('价格或定金设置已更新，请核对后提交');
    expect(createOrder).toContain("inviteCode = this.inviteCode || (this.data.selectedTech || {}).invitationCode");
  });

  it('公开作品预约同款在登录后保留目标页面', () => {
    const publicWorkJs = readWxapp('pages/client/public-work/index.js');
    const publicWorkWxml = readWxapp('pages/client/public-work/index.wxml');
    const login = readWxapp('pages/client/login/index.js');
    const register = readWxapp('pages/client/register/index.js');
    const navigation = readWxapp('utils/artist-navigation.js');

    expect(publicWorkWxml).toMatch(/bind(?:tap|:book)="bookSameStyle"/);
    expect(publicWorkJs).toContain('create-order/index?workId=');
    expect(publicWorkJs).toContain('encodeURIComponent(this.shareToken)');
    expect(navigation).toContain('post_auth_redirect');
    expect(login).toContain('consumePostAuthRedirect(this.redirect)');
    expect(register).toContain('consumePostAuthRedirect(this.redirect)');
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
    const registeredPages = [
      ...appConfig.pages,
      ...(appConfig.subPackages || []).flatMap((pkg: any) =>
        pkg.pages.map((page: string) => `${pkg.root}/${page}`),
      ),
    ];
    expect(registeredPages).toEqual(
      expect.arrayContaining([
        'pages/client/work-detail/index',
        'pages/client/create-order/index',
        'pages/client/orders/index',
        'pages/client/chat-detail/index',
      ]),
    );
  });
});
