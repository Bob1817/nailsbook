const api = require('../../services/api');
const colors = require('../../utils/colors');
const { trackConversion } = require('../../utils/conversion-tracking');

function getCoverCrop(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  if (sourceRatio > targetRatio) {
    const width = sourceHeight * targetRatio;
    return { x: (sourceWidth - width) / 2, y: 0, width, height: sourceHeight };
  }
  const height = sourceWidth / targetRatio;
  return { x: 0, y: (sourceHeight - height) / 2, width: sourceWidth, height };
}

Component({
  properties: {
    sharePath: { type: String, value: '' },
    show: { type: Boolean, value: false },
    work: { type: Object, value: null },
    mode: { type: String, value: 'sheet' }
  },
  data: { busy: false, shareToken: '' },
  observers: {
    sharePath(path) {
      const match = /[?&]shareToken=([a-f0-9]{48})(?:&|$)/.exec(path || '');
      this.setData({ shareToken: match ? match[1] : '' });
    }
  },
  methods: {
    closeSheet() {
      this.triggerEvent('close');
    },
    preventBubble() {},
    async copyCaption() {
      if (this.data.busy) return;
      this.setData({ busy: true });
      try {
        const work = await this.loadShareWork();
        await wx.setClipboardData({ data: `${work.title || '美甲作品'}｜${(work.technician || {}).name || '美甲师'}\n喜欢这款美甲，可以识别海报中的小程序码查看作品并预约。` });
        wx.showToast({ title: '已复制朋友圈文案', icon: 'success' });
      } catch (err) {
        wx.showToast({ title: err.message || '暂时无法复制文案', icon: 'none' });
      } finally { this.setData({ busy: false }); }
    },
    async copyXhsNote() {
      if (this.data.busy) return;
      this.setData({ busy: true });
      try {
        const work = await this.loadShareWork();
        const { buildWorkXhsCopy } = require('../../utils/share-copy');
        const note = buildWorkXhsCopy(work);
        await wx.setClipboardData({ data: note });
        trackConversion({ eventType: 'work_share_intent', workId: work.id, technicianId: (work.technician || {}).id, channel: 'xiaohongshu', touchpoint: 'work_share' });
        wx.showToast({ title: '小红书文案已复制', icon: 'success' });
      } catch (err) {
        wx.showToast({ title: err.message || '暂时无法复制文案', icon: 'none' });
      } finally { this.setData({ busy: false }); }
    },
    async saveWorkImages() {
      if (this.data.busy) return;
      this.setData({ busy: true });
      try {
        const work = await this.loadShareWork();
        let urls = work.imageUrls || [];
        if (typeof urls === 'string') {
          try { urls = JSON.parse(urls); } catch (_) { urls = []; }
        }
        if (!urls.length && work.images) {
          if (typeof work.images === 'string') {
            try { urls = JSON.parse(work.images); } catch (_) { urls = []; }
          } else if (Array.isArray(work.images)) {
            urls = work.images;
          }
        }
        if (!urls.length && work.coverUrl) urls = [work.coverUrl];
        if (!urls.length) throw new Error('作品暂无可保存的图片');

        wx.showLoading({ title: '正在导出原图...', mask: true });
        let savedCount = 0;
        for (const url of urls) {
          try {
            const photo = await wx.getImageInfo({ src: url });
            await wx.saveImageToPhotosAlbum({ filePath: photo.path });
            savedCount++;
          } catch (err) {
            const message = err.message || err.errMsg || '';
            if (/auth deny|auth denied|authorize|permission/i.test(message)) {
              wx.hideLoading();
              const result = await wx.showModal({ title: '需要相册权限', content: '允许保存图片后，可将作品原图保存到相册发布到小红书。', confirmText: '去设置' });
              if (result.confirm) wx.openSetting();
              return;
            }
          }
        }
        wx.hideLoading();
        if (savedCount > 0) {
          trackConversion({ eventType: 'work_share_intent', workId: work.id, technicianId: (work.technician || {}).id, channel: 'xiaohongshu_export_images', touchpoint: 'work_share' });
          wx.showToast({ title: `已保存 ${savedCount} 张原图到相册`, icon: 'success' });
        } else {
          wx.showToast({ title: '保存图片失败，请重试', icon: 'none' });
        }
      } catch (err) {
        wx.hideLoading();
        wx.showToast({ title: err.message || '导出图片失败', icon: 'none' });
      } finally {
        this.setData({ busy: false });
      }
    },
    loadShareWork() {
      const idMatch = /[?&]id=([1-9][0-9]*)(?:&|$)/.exec(this.properties.sharePath);
      if (this.data.shareToken) return api.public.works.shared(this.data.shareToken);
      if (idMatch) return api.public.works.detail(idMatch[1]);
      if (this.properties.work && this.properties.work.id) return Promise.resolve(this.properties.work);
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
        let brandLogo = null;
        try { brandLogo = await wx.getImageInfo({ src: '/static/onlynail-wordmark.jpg' }); } catch (_) { /* 品牌图加载失败时使用文字标识。 */ }
        let avatar = null;
        if (work.technician && work.technician.avatarUrl) {
          try { avatar = await wx.getImageInfo({ src: work.technician.avatarUrl }); } catch (_) { /* 缺头像仍保留真实姓名。 */ }
        }
        const socialMedia = (work.technician && work.technician.socialMedia) || {};
        let wechatQrCode = null;
        if (socialMedia.wechatQrCodeUrl) {
          try { wechatQrCode = await wx.getImageInfo({ src: socialMedia.wechatQrCodeUrl }); } catch (_) { /* 无法读取时不展示个人微信二维码。 */ }
        }
        codePath = wx.env.USER_DATA_PATH + '/work-code-' + Date.now() + '.png';
        await new Promise((resolve, reject) => wx.getFileSystemManager().writeFile({ filePath: codePath, data: code.imageBase64, encoding: 'base64', success: resolve, fail: reject }));
        const ctx = wx.createCanvasContext('work-poster', this);
        ctx.setFillStyle(colors.page || '#F5F5F7');
        ctx.fillRect(0, 0, 600, 800);

        ctx.setFillStyle(colors.surface || '#FFFFFF');
        ctx.fillRect(20, 20, 560, 760);
        if (brandLogo) ctx.drawImage(brandLogo.path, 40, 32, 112, 40);
        else {
          ctx.setFillStyle(colors.ink || '#1D1D1F');
          ctx.setFontSize(18);
          ctx.fillText('OnlyNail', 40, 54);
        }
        ctx.setFillStyle(colors.secondary || '#48484D');
        ctx.setFontSize(14);
        ctx.fillText('作品灵感', 496, 53);

        // 使用 9 参数 drawImage 从源图中心等比裁切，所有横竖图都不会被拉伸。
        const photoBox = { x: 40, y: 76, width: 520, height: 420 };
        const crop = getCoverCrop(photo.width, photo.height, photoBox.width, photoBox.height);
        ctx.drawImage(photo.path, crop.x, crop.y, crop.width, crop.height, photoBox.x, photoBox.y, photoBox.width, photoBox.height);

        ctx.setFillStyle(colors.ink || '#1D1D1F');
        ctx.setFontSize(30);
        const fit = (text, max) => {
          let result = String(text || '');
          if (ctx.measureText(result).width <= max) return result;
          while (result && ctx.measureText(result + '…').width > max) result = result.slice(0, -1);
          return result + '…';
        };
        ctx.fillText(fit(work.title || '美甲作品', 340), 40, 548);

        ctx.setFontSize(18);
        if (avatar) ctx.drawImage(avatar.path, 40, 570, 34, 34);
        ctx.fillText(fit((work.technician || {}).name || '美甲师', avatar ? 250 : 300), avatar ? 86 : 40, 595);
        ctx.setFillStyle(colors.secondary || '#6E6E73');
        ctx.setFontSize(15);
        const shops = work.shops || [];
        const shopText = shops.length === 1 ? shops[0].name : (work.technician || {}).city || '';
        if (shopText) ctx.fillText(fit(shopText, 300), 40, 626);

        ctx.setFillStyle(colors.ink || '#1D1D1F');
        ctx.setFontSize(20);
        ctx.fillText('扫码查看作品', 40, 682);
        ctx.setFillStyle(colors.secondary || '#48484D');
        ctx.setFontSize(15);
        ctx.fillText('游客可查看 · 预约时自动关联美甲师', 40, 714);
        if (token) {
          ctx.setFontSize(12);
          ctx.fillText('分享内容以扫码时状态为准', 40, 744);
        }

        // 小程序码始终直达游客可访问的公开作品页；个人微信二维码仅在美甲师主动配置后展示。
        ctx.setFillStyle(colors.surface || '#FFFFFF');
        if (wechatQrCode) {
          ctx.fillRect(278, 568, 132, 154);
          ctx.fillRect(424, 568, 132, 154);
          ctx.drawImage(codePath, 286, 576, 116, 116);
          ctx.drawImage(wechatQrCode.path, 432, 576, 116, 116);
          ctx.setFillStyle(colors.secondary || '#48484D');
          ctx.setFontSize(12);
          ctx.fillText('查看并预约', 306, 712);
          ctx.fillText('添加美甲师微信', 438, 712);
        } else {
          ctx.fillRect(400, 566, 152, 152);
          ctx.drawImage(codePath, 410, 576, 132, 132);
          ctx.setFillStyle(colors.secondary || '#48484D');
          ctx.setFontSize(12);
          ctx.fillText('查看并预约', 442, 734);
        }
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
