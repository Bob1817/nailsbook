const api = require('../../services/api');

// 统一作品卡片组件（发现 / 首页最新动态 / 作品 / 点赞 / 收藏 通用视觉）
Component({
  data: {
    compactExpertise: '1年 · -',
    gridArtistMeta: '',
    localLiked: false,
    localFavorited: false,
    localLikeCount: 0,
    localFavoriteCount: 0,
    localCommentCount: 0,
    socialLoading: false
  },
  properties: {
    work: {
      type: Object,
      value: {}
    },
    aspectClass: {
      type: String,
      value: ''
    },
    variant: {
      type: String,
      value: 'editorial'
    },
    featured: {
      type: Boolean,
      value: false
    },
    manageable: {
      type: Boolean,
      value: false
    }
  },

  observers: {
    work: function (work) {
      work = work || {};
      // 作品卡展示专用精简：城市去掉末尾的"市"（杭州市→杭州）、从业文案去掉"从业"二字（从业6年→6年）
      // 注意：只在 work-card 展示层精简；normalizeWork 输出的 artistMetaText 继续与美甲师详情页口径一致（public-work 详情页用）
      function slimCity(c) {
        if (!c) return '';
        return String(c).replace(/(市|地区|自治州|省|特别行政区|盟)$/g, '').trim() || c;
      }
      function slimYears(txt) {
        if (!txt) return '';
        return String(txt).replace(/从业/g, '').trim();
      }
      // 严格从 experienceYears 数字字段取值（禁止从价格/标签等任意字符串扫数字，避免把 1280 误当成年份"1"）
      function getYearsNum(w) {
        var n = Number(w.experienceYears);
        if (Number.isFinite(n) && n >= 0) return Math.max(1, n);
        if (w.technician && Number.isFinite(Number(w.technician.experienceYears)) && Number(w.technician.experienceYears) >= 0) {
          return Math.max(1, Number(w.technician.experienceYears));
        }
        // 只在 experienceText 严格匹配"数字+年"时使用（避免误扫到价格）
        if (typeof w.experienceText === 'string') {
          var m = w.experienceText.match(/(\d+)\s*年/);
          if (m) return Math.max(1, Number(m[1]));
        }
        if (w.technician && typeof w.technician.experienceText === 'string') {
          var m2 = w.technician.experienceText.match(/(\d+)\s*年/);
          if (m2) return Math.max(1, Number(m2[1]));
        }
        return 1;
      }
      function yearsStr(num) { return num + '年'; }

      // 优先使用 normalizeWork 统一输出的 artistMetaText → 再做作品卡层面的精简
      var expertise;
      if (work.artistMetaText) {
        expertise = work.artistMetaText
          .replace(/([\u4e00-\u9fa5A-Za-z0-9]+)(市|地区|自治州|省|特别行政区|盟)(\s*·)/g, function (m, name, suffix, sep) {
            return slimCity(name + suffix) + sep;
          })
          .replace(/(市|地区|自治州|省|特别行政区|盟)(\s*·)/g, function (m, suffix, sep) {
            return sep;
          })
          .replace(/从业(\d+)/g, '$1');
        // 末尾城市去市（如果后面没跟 · 的情况，比如单独一段）
        expertise = expertise.replace(/(市|地区|自治州|省|特别行政区|盟)$/g, '');
      } else {
        var years = yearsStr(getYearsNum(work));
        var specialty = work.specialty || work.specialtiesText || (Array.isArray(work.specialties) ? work.specialties.slice(0,3).join(' / ') : '');
        // 不要从 expertiseText 拆 pop，防止把价格/乱字符串当专长
        specialty = String(specialty || '').replace(/多年|\d+年|美甲经验|从业|经验|美甲师/g, '').trim();
        if (!specialty) specialty = '';
        var cityRaw = work.technicianCity || work.city || (work.technician && (work.technician.cityText || work.technician.city)) || '';
        var city = slimCity(cityRaw);
        var parts = [city, years, specialty].filter(Boolean);
        expertise = parts.length ? parts.join(' · ') : (years + (specialty ? ' · ' + specialty : ''));
      }
      // grid 模式 pill 下方短 meta：城市（去市）· X年（去从业）
      var gridMeta = '';
      var cityPartRaw = work.technicianCity || (work.technician && (work.technician.cityText || work.technician.city)) || (work.city || '');
      var num = getYearsNum(work);
      var gridParts = [slimCity(cityPartRaw), yearsStr(num)].filter(Boolean);
      gridMeta = gridParts.join(' · ');

      this.setData({
        compactExpertise: expertise,
        gridArtistMeta: gridMeta,
        localLiked: !!work.isLiked,
        localFavorited: !!work.isFavorited,
        localLikeCount: work.likeCount || 0,
        localFavoriteCount: work.favoriteCount || 0,
        localCommentCount: work.commentCount || 0
      });
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('cardtap', { id: this.data.work && this.data.work.id });
    },
    onArtistTap() {
      const work = this.data.work || {};
      const technicianId = work.technicianId || (work.technician && work.technician.id);
      this.triggerEvent('artisttap', { id: technicianId });
    },
    async onLikeTap() {
      const work = this.data.work || {};
      if (!work.id || this.data.socialLoading) return;
      this.setData({ socialLoading: true });
      try {
        const role = wx.getStorageSync('role') === 'technician' ? 'technician' : 'client';
        const res = await api[role].works.like(work.id);
        const liked = typeof res.liked === 'boolean' ? res.liked : !this.data.localLiked;
        const likeCount = Math.max(0, this.data.localLikeCount + (liked ? 1 : -1));
        this.setData({ localLiked: liked, localLikeCount: likeCount });
        wx.showToast({ title: liked ? '点赞成功' : '去掉点赞成功', icon: 'none' });
        this.triggerEvent('socialchange', { id: work.id, isLiked: liked, likeCount });
      } catch (err) {
        wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
      } finally {
        this.setData({ socialLoading: false });
      }
    },
    async onFavoriteTap() {
      const work = this.data.work || {};
      if (!work.id || this.data.socialLoading) return;
      this.setData({ socialLoading: true });
      try {
        const role = wx.getStorageSync('role') === 'technician' ? 'technician' : 'client';
        const res = await api[role].works.favorite(work.id);
        const favorited = typeof res.favorited === 'boolean' ? res.favorited : !this.data.localFavorited;
        const favoriteCount = Math.max(0, this.data.localFavoriteCount + (favorited ? 1 : -1));
        this.setData({ localFavorited: favorited, localFavoriteCount: favoriteCount });
        wx.showToast({ title: favorited ? '收藏成功' : '取消收藏成功', icon: 'none' });
        this.triggerEvent('socialchange', { id: work.id, isFavorited: favorited, favoriteCount });
      } catch (err) {
        wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
      } finally {
        this.setData({ socialLoading: false });
      }
    },
    onCommentTap() {
      const work = this.data.work || {};
      if (!work.id) return;
      const role = wx.getStorageSync('role') === 'technician' ? 'technician' : 'client';
      wx.navigateTo({ url: `/pages/${role}/work-detail/index?id=${work.id}&focus=comments` });
    },
    onActionTap() {
      const work = this.data.work || {};
      this.triggerEvent('actiontap', { id: work.id, visible: work.isVisible, pinned: work.isPinned, featured: work.isFeatured });
    }
  }
});
