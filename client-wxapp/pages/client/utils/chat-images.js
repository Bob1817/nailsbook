const api = require('../../../services/api');

// Keep the client and technician subpackage copies identical.
function imageMethods(role) {
  return {
    restoreImageOutbox() {
      if (!this._imageOutboxKey) {
        const user = wx.getStorageSync(`${role}_userInfo`);
        const peerId = this.data[role === 'client' ? 'techId' : 'clientId'];
        if (!user || !user.id || !peerId) return;
        this._imageOutboxKey = `chat_images_${role}_${user.id}_${peerId}`;
        const saved = wx.getStorageSync(this._imageOutboxKey);
        if (Array.isArray(saved) && saved.length) {
          this.setData({ pendingImages: saved.map(item => ({ ...item, status: 'failed', error: '上次未确认发送结果，请重试' })) });
        }
      }
      const pendingImages = (this.data.pendingImages || []).filter(item => !item.url || !this.data.messages.some(message =>
        message.senderType === role && message.messageType === 'image' && message.imageUrl === item.url));
      this.setImageData({ pendingImages });
    },

    setImageData(patch) {
      if (this._imagesUnloaded) Object.assign(this.data, patch);
      else this.setData(patch);
      if (this._imageOutboxKey) {
        try {
          if (this.data.pendingImages.length) wx.setStorageSync(this._imageOutboxKey, this.data.pendingImages);
          else wx.removeStorageSync(this._imageOutboxKey);
        } catch (_) { /* Storage exhaustion must not interrupt a send. */ }
      }
    },

    discardImage(e) {
      if (this._imageBusy) return;
      this.setImageData({ pendingImages: this.data.pendingImages.filter(item => item.id !== e.currentTarget.dataset.id) });
    },

    pickChatImages() {
      if (this._imageBusy || this._pickingImages || this.data.sending) return;
      if (!this.data.conversationId && !this.data[role === 'client' ? 'techId' : 'clientId']) {
        wx.showToast({ title: '暂无法获取对话对象，请重新进入', icon: 'none' });
        return;
      }
      this.restoreImageOutbox();
      this._pickingImages = true;
      wx.chooseMedia({
        count: 9,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: (res) => {
          const files = res.tempFiles || [];
          const accepted = files.filter(file => file.tempFilePath && file.size <= 5 * 1024 * 1024 && /\.(jpe?g|png|webp)$/i.test(file.tempFilePath.split('?')[0]));
          if (accepted.length !== files.length) wx.showToast({ title: '仅支持 5MB 内 JPG/PNG/WebP', icon: 'none' });
          const pending = this.data.pendingImages || [];
          const stamp = Date.now();
          const added = accepted.map((file, index) => ({
            id: `image-${stamp}-${index}`, path: file.tempFilePath, status: 'waiting', error: ''
          }));
          this.setImageData({ pendingImages: pending.concat(added), scrollToId: added.length ? added[added.length - 1].id : this.data.scrollToId });
          this.sendPendingImages(added.map(item => item.id));
        },
        fail: (err) => {
          if (!/cancel/.test(err.errMsg || '')) wx.showToast({ title: '无法选择图片，请检查相册权限', icon: 'none' });
        },
        complete: () => { this._pickingImages = false; }
      });
    },

    async sendPendingImages(ids) {
      if (this._imageBusy || this.data.sending || !ids.length) return;
      this._imageBusy = true;
      this._imageSendVersion = (this._imageSendVersion || 0) + 1;
      this.setImageData({ sending: true });
      this.stopPolling();
      try {
        for (const id of ids) {
          const item = this.data.pendingImages.find(entry => entry.id === id);
          if (!item) continue;
          const update = (patch) => {
            Object.assign(item, patch);
            this.setImageData({ pendingImages: this.data.pendingImages.slice() });
          };
          update({ status: 'sending', error: '' });
          try {
            if (!item.url) {
              const uploaded = await api.upload.image(item.path, role);
              if (!uploaded.url) throw new Error('图片上传未完成，请重试');
              update({ url: uploaded.url });
            }
            const payload = { messageType: 'image', imageUrl: item.url };
            if (this.data.conversationId) payload.conversationId = this.data.conversationId;
            else payload[role === 'client' ? 'techId' : 'clientId'] = this.data[role === 'client' ? 'techId' : 'clientId'];
            const result = await api.chat.sendMessage(payload, role);
            const conversationId = result.conversationId || (result.message && result.message.conversationId);
            if (conversationId) this.setImageData({ conversationId: Number(conversationId) });
            if (!result.message) throw new Error('未确认发送结果，请重试');
            const messages = this.data.messages.filter(message => message.id !== result.message.id).concat(result.message);
            this.setImageData({ messages: this.formatMessages(messages), pendingImages: this.data.pendingImages.filter(entry => entry.id !== id) });
            if (!this._imagesUnloaded) this.groupByDate();
          } catch (err) {
            update({ status: 'failed', error: err.message || '发送失败，请重试' });
          }
        }
      } finally {
        this._imageBusy = false;
        this.setImageData({ sending: false });
        if (this._pageActive) {
          await this.loadMessages(false);
          this.startPolling();
          const pending = this.data.pendingImages;
          if (pending.length) this.setImageData({ scrollToId: pending[pending.length - 1].id });
          else this.scrollToBottom(true);
        }
      }
    },

    retryImage(e) {
      return this.sendPendingImages([e.currentTarget.dataset.id]);
    },

    previewImage(e) {
      const current = e.currentTarget.dataset.url;
      if (!current) return;
      const urls = [...new Set(this.data.messages.filter(item => item.messageType === 'image' && item.imageUrl).map(item => item.imageUrl)
        .concat((this.data.pendingImages || []).map(item => item.url || item.path)))];
      wx.previewImage({ current, urls: urls.includes(current) ? urls : [current], fail: () => wx.showToast({ title: '图片加载失败，请重试', icon: 'none' }) });
    }
  };
}

module.exports = { imageMethods };
