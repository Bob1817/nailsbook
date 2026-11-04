const api = require('../../services/api');
const { buildThumbnail } = require('../../utils/cdn-image');
const { buildClientLoginUrl } = require('../../utils/artist-navigation');

// 统一作品卡片组件（发现 / 首页最新动态 / 作品 / 点赞 / 收藏 通用视觉）
Component({
  data: {
    compactExpertise: '1年 · -',
    gridArtistMeta: '',
    displayPrice: '',
    doneCountText: '',
    displayTitle: '',
    resolvedCoverUrl: '',
    resolvedAvatarUrl: '',
    imageLoaded: false,
    imageError: false,
    mediaStyle: '',
    displayTags: [],
    displayDesc: '',
    displayPromotionTitle: '',
    displayPromotionDiscount: '',
    hasPromotion: false,
    artistStatus: '',
    artistPlaceLine: '',
    showClientActions: false,
    showBookSame: false,
    localLiked: false,
    localFavorited: false,
    localLikeCount: 0,
    localFavoriteCount: 0,
    localCommentCount: 0,
    socialLoading: false
  },
  properties: {
    managementMinimal: { type: Boolean, value: false },
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
    },
    showArtist: {
      type: Boolean,
      value: true
    },
    label: {
      type: String,
      value: '预约同款来源'
    },
    promotion: {
      type: Object,
      value: null
    }
  },

  observers: {
    'work, manageable, promotion, variant, featured': function (work, manageable, promotion, variant, featured) {
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

      function formatCardPrice(w) {
        if (w.priceText) return w.priceText;
        var fen = Number(w.standardPriceFen || w.serviceSubtotalFen || w.priceCents || w._priceFen || 0);
        var value = fen > 0 ? fen / 100 : Number(w.price || 0);
        return value > 0 ? '¥' + value : '';
      }

      function publicationStatusText(w) {
        if (w.shareStatusText) return w.shareStatusText;
        var statusText = {
          draft: '草稿',
          pending: '待审核',
          rejected: '已驳回'
        }[w.publicationStatus];
        if (statusText) return statusText;
        if (w.publicationStatus === 'approved') return w.isVisible === false ? '已隐藏' : '已发布';
        return w.isVisible === false ? '已隐藏' : '待审核';
      }

      // 美甲师信息第二行：地址 · 店铺名（默认第一个启用店铺；无店铺则为空隐藏）
      var shopName = String(work.technicianShopName || '').trim();
      var shopAddress = String(work.technicianShopAddress || '').trim();
      var placeParts = [shopAddress, shopName].filter(Boolean);

      var cover = work.coverUrl || (Array.isArray(work.customImages) && work.customImages[0]) || (Array.isArray(work.imageUrls) && work.imageUrls[0]) || '';
      var rawAvatar = work.technicianAvatarUrl || (work.technician && work.technician.avatarUrl) || '';
      var thumbPreset = variant === 'compact-bar' ? 'avatar' : (featured ? 'cover' : 'thumb');
      var optimizedCover = work.coverThumbUrl || buildThumbnail(cover, thumbPreset);
      var optimizedAvatar = work.technicianAvatarThumbUrl || buildThumbnail(rawAvatar, 'avatar');
      var prevCover = this.data.resolvedCoverUrl;
      var shouldResetImage = !prevCover || prevCover !== optimizedCover;
      var title = work.title || work.customTitle || '美甲作品';

      // 提取标签（最多 2 个，保持瀑布流卡片精练）
      var rawTags = work.tags || work.tagList || [];
      if (typeof rawTags === 'string') rawTags = rawTags.split(/[,，、\s]+/);
      var tagsList = Array.isArray(rawTags) ? rawTags.map(function (t) { return String(t).trim(); }).filter(Boolean) : [];
      var displayTags = tagsList.slice(0, 2);
      var displayDesc = String(work.description || work.desc || work.intro || '').trim();

      // 封面真实宽高决定卡片图片高度，实现小红书错落瀑布流；无宽高时回退到默认比例
      var mediaStyle = '';
      var coverWidth = Number(work.coverWidth || work.imageWidth || (work.cover && work.cover.width));
      var coverHeight = Number(work.coverHeight || work.imageHeight || (work.cover && work.cover.height));
      if (coverWidth > 0 && coverHeight > 0) {
        var ratio = Math.min(1.45, Math.max(0.75, coverHeight / coverWidth));
        mediaStyle = 'padding-bottom:' + (ratio * 100).toFixed(2) + '%';
      }

      var promo = promotion || (work && work.promotion) || null;
      var hasPromo = !!promo;
      var promoTitle = promo && promo.title ? promo.title : (hasPromo ? '作品分享优惠' : '');
      var promoDiscount = (promo && Number(promo.discountAmountFen) > 0)
        ? ('报价时立减 ¥' + (Number(promo.discountAmountFen) / 100))
        : '';

      var completedBookingsCount = Number(
        work.completedBookingsCount ||
        work.doneCount ||
        work.completedCount ||
        (Array.isArray(work.completedOrders) ? work.completedOrders.length : 0) ||
        (Array.isArray(work.sourceOrders) ? work.sourceOrders.filter(function (o) { return o && (o.status === 'completed' || !o.status); }).length : 0) ||
        (work._count && (work._count.sourceOrders || work._count.completedOrders)) ||
        0
      );
      var doneCountText = work.doneCountText || (completedBookingsCount > 0 ? (completedBookingsCount + '人做过') : '');

      var updateData = {
        compactExpertise: expertise,
        gridArtistMeta: gridMeta,
        artistPlaceLine: placeParts.join(' · '),
        displayPrice: formatCardPrice(work),
        doneCountText: doneCountText,
        displayTitle: title,
        displayTags: displayTags,
        displayDesc: displayDesc,
        resolvedCoverUrl: optimizedCover,
        resolvedAvatarUrl: optimizedAvatar,
        mediaStyle: mediaStyle,
        displayPromotionTitle: promoTitle,
        displayPromotionDiscount: promoDiscount,
        hasPromotion: hasPromo,
        artistStatus: manageable
          ? publicationStatusText(work)
          : (work.nextAvailableText || work.availabilityText || expertise),
        showClientActions: !manageable,
        showBookSame: !manageable,
        localLiked: !!work.isLiked,
        localFavorited: !!work.isFavorited,
        localLikeCount: work.likeCount || 0,
        localFavoriteCount: work.favoriteCount || 0,
        localCommentCount: work.commentCount || 0
      };
      if (shouldResetImage) {
        updateData.imageLoaded = false;
        updateData.imageError = false;
      }
      this.setData(updateData);
      if (variant === 'minimal') {
        this.setData({ showArtist: false });
      }
    }
  },

  methods: {
    onImageLoad() {
      var e = arguments[0];
      var update = { imageLoaded: true };
      if (!this.data.mediaStyle && e && e.detail && e.detail.width && e.detail.height) {
        var w = Number(e.detail.width);
        var h = Number(e.detail.height);
        if (w > 0 && h > 0) {
          var ratio = Math.min(1.45, Math.max(0.75, h / w));
          update.mediaStyle = 'padding-bottom:' + (ratio * 100).toFixed(2) + '%';
        }
      }
      this.setData(update);
    },
    onImageError() {
      this.setData({ imageLoaded: true, imageError: true });
    },
    onTap() {
      this.triggerEvent('cardtap', { id: this.data.work && this.data.work.id });
    },
    onArtistTap() {
      const work = this.data.work || {};
      const technicianId = work.technicianId || (work.technician && (work.technician.id || work.technician.technicianId));
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
      this.triggerEvent('actiontap', { id: work.id, visible: work.isVisible, pinned: work.isPinned, featured: work.isFeatured, heroSlot: work.heroSlot || null });
    },
    async onBookTap() {
      const work = this.data.work || {};
      if (!work.id || this._bookingOpening) return;
      const app = getApp();
      const role = wx.getStorageSync('role') || (app && app.globalData && app.globalData.role);
      const token = wx.getStorageSync('client_token') || wx.getStorageSync('token') || (app && app.globalData && app.globalData.token);
      if (role === 'technician') {
        wx.showToast({ title: '美甲师账号不能以客户身份预约', icon: 'none' });
        return;
      }
      this._bookingOpening = true;
      try {
        const techId = work.technicianId || (work.technician && (work.technician.id || work.technician.technicianId));
        let inviteCode = work.invitationCode || (work.technician && work.technician.invitationCode) || '';
        if (!inviteCode && techId) {
          try {
            const artistRes = await api.public.artists.detail(String(techId));
            const artist = artistRes.artist || artistRes || {};
            inviteCode = artist.invitationCode || '';
          } catch (_) {}
        }
        const isPriced = Boolean(work.pricingReady || (Number(work.standardPriceFen) > 0) || (Number(work.serviceSubtotalFen) > 0) || (Number(work.price) > 0));
        const refQuery = isPriced ? '' : '&reference=1';
        const targetUrl = '/pages/client/create-order/index?workId=' + work.id + (techId ? '&techId=' + techId : '') + (inviteCode ? '&invite=' + encodeURIComponent(inviteCode) : '') + refQuery + '&source=work_card';

        if (!token || role !== 'client') {
          wx.navigateTo({
            url: buildClientLoginUrl(targetUrl, {
              source: 'work_card',
              inviteCode: inviteCode,
              quickBookingTechId: techId
            })
          });
          return;
        }

        if (techId && inviteCode) {
          const bindings = wx.getStorageSync('client_bindings') || [];
          const isBound = bindings.some(b => {
            const t = b.technician || b;
            return Number(t.id) === Number(techId);
          });
          if (!isBound) {
            try {
              wx.showLoading({ title: '正在关联美甲师', mask: true });
              await api.client.profile.bindQuickBooking(Number(techId), inviteCode);
              wx.hideLoading();
            } catch (_) {
              wx.hideLoading();
            }
          }
        }

        wx.navigateTo({ url: '/pages/client/create-order/index?workId=' + work.id + (techId ? '&techId=' + techId : '') + (inviteCode ? '&invite=' + encodeURIComponent(inviteCode) : '') + refQuery + '&source=work_card' });
      } finally {
        this._bookingOpening = false;
      }
    }
  }
});
