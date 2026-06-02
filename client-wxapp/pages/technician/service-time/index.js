const api = require('../../../services/api');

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

Page({
  data: {
    schedule: DAYS.map((label, i) => ({
      day: i + 1,
      label,
      enabled: i < 5,
      startTime: '09:00',
      endTime: '21:00'
    })),
    loading: true,
    saving: false
  },

  async onLoad() {
    try {
      const res = await api.technician.schedule.get();
      if (res && res.length > 0) {
        const schedule = DAYS.map((label, i) => {
          const item = res.find(r => r.day === i + 1);
          return {
            day: i + 1,
            label,
            enabled: item ? item.enabled : i < 5,
            startTime: item?.startTime || '09:00',
            endTime: item?.endTime || '21:00'
          };
        });
        this.setData({ schedule });
      }
    } catch {}
    this.setData({ loading: false });
  },

  toggleDay(e) {
    const idx = e.currentTarget.dataset.idx;
    const schedule = [...this.data.schedule];
    schedule[idx] = { ...schedule[idx], enabled: !schedule[idx].enabled };
    this.setData({ schedule });
  },

  async save() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      await api.technician.schedule.update(this.data.schedule);
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
