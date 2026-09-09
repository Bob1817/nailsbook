const api = require('../../services/api');
const colors = require('../../utils/colors');
const { trackConversion } = require('../../utils/conversion-tracking');

Component({
  properties: { sharePath: { type: String, value: '' } },
  data: { busy: false, shareToken: '' },
  observers: {
    sharePath(path) {
      const match = /[?&]shareToken=([a-f0-9]{48})(?:&|$)/.exec(path || '');
      this.setData({ shareToken: match ? match[1] : '' });
    }
  },
  methods: {
    async copyCaption() {
      if (this.data.busy) return;
      this.setData({ busy: true });
      try {
        const work = await this.loadShareWork();
        await wx.setClipboardData({ data: `${work.title || '美甲作品'}｜${(work.technician || {}).name || '美甲师'}\n喜欢这款美甲，可以识别海报中的小程序码查看作品并预约。` });
      } catch (err) {
        wx.showToast({ title: err.message || '暂时无法复制文案', icon: 'none' });
      } finally { this.setData({ busy: false }); }
    },
    loadShareWork() {
      const idMatch = /[?&]id=([1-9][0-9]*)(?:&|$)/.exec(this.properties.sharePath);
      if (this.data.shareToken) return api.public.works.shared(this.data.shareToken);
      if (idMatch) return api.public.works.detail(idMatch[1]);
      return Promise.reject(new Error('分享链接尚未就绪'));
    },
    async savePoster() {
      if (this.data.busy) return;
      const path = this.properties.sharePath;
      const idMatch = /[?&]id=([1-9][0-9]*)(?:&|$)/.exec(path);
      const token = this.data.shareToken;
      if (!token && !idMatch) return;
      this.setData({ busy: true });
      let codePath;
      try {
        // 重新读取已授权的作品，不接受任意本地照片或外部 URL 作为公开作品。
        const work = await this.loadShareWork();
        const code = await api.public.works.shareCode(work.id, token);
        const cover = work.coverUrl || (work.imageUrls || [])[0];
        if (!cover) throw new Error('作品暂无可分享图片');
        const photo = await wx.getImageInfo({ src: cover });
        let avatar = null;
        if (work.technician && work.technician.avatarUrl) {
          try { avatar = await wx.getImageInfo({ src: work.technician.avatarUrl }); } catch (_) { /* 缺头像仍保留真实姓名。 */ }
        }
        codePath = wx.env.USER_DATA_PATH + '/work-code-' + Date.now() + '.png';
        await new Promise((resolve, reject) => wx.getFileSystemManager().writeFile({ filePath: codePath, data: code.imageBase64, encoding: 'base64', success: resolve, fail: reject }));
        const ctx = wx.createCanvasContext('work-poster', this);
        ctx.setFillStyle(colors.surface || '#FFFFFF');
        ctx.fillRect(0, 0, 600, 800);
        // 等比完整展示原作品，留白代替裁切、修图与滤镜。
        const scale = Math.min(600 / photo.width, 560 / photo.height);
        const width = photo.width * scale, height = photo.height * scale;
        ctx.drawImage(photo.path, (600 - width) / 2, (560 - height) / 2, width, height);
        ctx.setFillStyle(colors.ink || '#1D1D1F');
        ctx.setFontSize(26);
        const fit = (text, max) => {
          let result = String(text || '');
          if (ctx.measureText(result).width <= max) return result;
          while (result && ctx.measureText(result + '…').width > max) result = result.slice(0, -1);
          return result + '…';
        };
        ctx.fillText(fit(work.title || '美甲作品', 370), 28, 607);
        ctx.setFontSize(21);
        if (avatar) ctx.drawImage(avatar.path, 28, 624, 36, 36);
        ctx.fillText(fit((work.technician || {}).name || '美甲师', avatar ? 320 : 370), avatar ? 76 : 28, 650);
        ctx.setFillStyle(colors.secondary || '#6E6E73');
        ctx.setFontSize(17);
        const shops = work.shops || [];
        const shopText = shops.length === 1 ? shops[0].name : (work.technician || {}).city || '';
        if (shopText) ctx.fillText(fit(shopText, 370), 28, 685);
        ctx.fillText('扫码查看作品并预约美甲师', 28, 735);
        if (token) ctx.fillText('限时分享 · 以扫码时授权状态为准', 28, 770);
        ctx.drawImage(codePath, 422, 600, 150, 150);
        await new Promise(resolve => ctx.draw(false, resolve));
        const file = await new Promise((resolve, reject) => wx.canvasToTempFilePath({ canvasId: 'work-poster', width: 600, height: 800, destWidth: 1200, destHeight: 1600, success: resolve, fail: reject }, this));
        trackConversion({ eventType: 'poster_generated', workId: work.id, technicianId: (work.technician || {}).id, shareToken: token, channel: 'wechat_moments' });
        await wx.saveImageToPhotosAlbum({ filePath: file.tempFilePath });
        trackConversion({ eventType: 'poster_saved', workId: work.id, technicianId: (work.technician || {}).id, shareToken: token, channel: 'wechat_moments' });
        wx.showToast({ title: '已保存，请到朋友圈发布', icon: 'none' });
      } catch (err) {
        const message = err.message || err.errMsg || '';
        if (/auth deny|auth denied|authorize|permission/i.test(message)) {
          const result = await wx.showModal({ title: '需要相册权限', content: '允许保存图片后，可将作品海报分享至朋友圈。', confirmText: '去设置' });
          if (result.confirm) wx.openSetting();
        } else wx.showToast({ title: err.message || '海报生成或保存失败，请重试', icon: 'none' });
      } finally {
        if (codePath) wx.getFileSystemManager().unlink({ filePath: codePath, fail() {} });
        this.setData({ busy: false });
      }
    }
  }
});
