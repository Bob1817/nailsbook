import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuickQuoteDetail } from '../../services/api';
import { PosterModal } from './components/PosterModal';
import type { QuoteDraft } from './quoteTypes';
import {
  ArrowLeft,
  Copy,
  Check,
  Share2,
  Clock,
  Phone,
  X,
  AlertTriangle,
  Image as ImageIcon,
  Heart,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

function formatCountdown(totalSeconds: number) {
  if (totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const THEME_OPTIONS = [
  { code: 'minimal-white', name: '极简黑白', accent: '#1D1D1F', symbol: '✦' },
  { code: 'morandi', name: '法式莫兰', accent: '#48484D', symbol: '❖' },
  { code: 'cherry-blossom', name: '日系柔粉', accent: '#B42332', symbol: '✿' },
  { code: 'vintage-emerald', name: '复古墨绿', accent: '#287A4B', symbol: '⚜' },
];

export const QuoteDetailPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [activeThemeCode, setActiveThemeCode] = useState<string>('minimal-white');
  const [countdownText, setCountdownText] = useState('02:00:00');
  const [copied, setCopied] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isPosterOpen, setIsPosterOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsExpired(true);
      setLoading(false);
      return;
    }

    let timer: any = null;

    getQuickQuoteDetail(token)
      .then((data) => {
        setQuote(data);
        if (data.themeCode) {
          setActiveThemeCode(data.themeCode);
        }
        setLoading(false);

        let remaining = data.remainingSeconds || 0;
        if (remaining <= 0) {
          setIsExpired(true);
          return;
        }

        setCountdownText(formatCountdown(remaining));

        timer = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            clearInterval(timer);
            setIsExpired(true);
            setCountdownText('00:00:00');
          } else {
            setCountdownText(formatCountdown(remaining));
          }
        }, 1000);
      })
      .catch(() => {
        setLoading(false);
        setIsExpired(true);
      });

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [token]);

  const handleCopySummary = () => {
    if (!quote) return;
    const lines = (quote.items || []).map(
      (item: any) => `• ${item.name}: ¥${(item.priceFen / 100).toFixed(2)}`,
    );

    if (quote.adjustmentType === 'OTHER') {
      lines.push(`• 其他附加: +¥${(quote.adjustmentFen / 100).toFixed(2)} (${quote.adjustmentNote || '差额'})`);
    } else if (quote.adjustmentType === 'DISCOUNT') {
      lines.push(`• 立减优惠: -¥${(quote.adjustmentFen / 100).toFixed(2)}`);
    }

    const text = [
      `💅【${quote.shopName || quote.technicianName || '美甲报价清单'}】`,
      ...lines,
      `💰 应付最终总额：¥${(quote.finalPriceFen / 100).toFixed(2)}`,
      `⏱️ 2小时限时有效凭单`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4 text-xs text-[#6E6E73]">
        正在加载美甲定制报价单…
      </div>
    );
  }

  if (isExpired || !quote) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center border border-[#E5E5EA] space-y-4">
          <div className="text-4xl">⌛</div>
          <h2 className="font-bold text-lg text-[#1D1D1F]">报价单已过期失效</h2>
          <p className="text-xs text-[#6E6E73] leading-relaxed">
            本报价单仅在生成后 2 小时内有效。目前已超过有效期限，请联系您的美甲师重新发送最新报价。
          </p>
          <button
            type="button"
            onClick={() => navigate('/quote')}
            className="w-full h-11 rounded-xl bg-[#1D1D1F] text-white text-xs font-bold hover:bg-[#343438] transition-all"
          >
            返回生成新报价
          </button>
        </div>
      </div>
    );
  }

  // 主题样式映射 (完全基于中性与语义色系的高定视觉系统)
  const themeConfig = {
    'minimal-white': {
      pageBg: 'bg-[#F5F5F7]',
      cardBg: 'bg-white',
      cardBorder: 'border-2 border-[#1D1D1F]',
      cardShadow: 'shadow-md',
      watermarkText: 'GALLERY RECEIPT',
      watermarkColor: 'text-[#F5F5F7]',
      topRibbonBg: 'bg-[#1D1D1F]',
      topRibbonText: 'text-white',
      topRibbonTitle: '✦ ATELIER MINIMALIST · 极简黑白画廊',
      headerTitleColor: 'text-[#1D1D1F]',
      headerSubtitleColor: 'text-[#6E6E73]',
      badgeBg: 'bg-[#1D1D1F]',
      badgeText: 'text-white',
      badgeBorder: 'border border-[#1D1D1F]',
      accentColor: '#1D1D1F',
      sealBg: 'bg-[#1D1D1F]',
      sealText: 'text-white',
      sealBorder: 'border border-[#1D1D1F]',
      sealSymbol: '✦',
      themeName: '极简黑白画廊',
      mottoTag: '现代先锋艺术',
      mottoBoxBg: 'bg-[#F5F5F7]',
      mottoBoxBorder: 'border-[#E5E5EA]',
      mottoTextColor: 'text-[#48484D]',
      mottoHeartColor: 'text-[#1D1D1F]',
      itemTitleColor: 'text-[#1D1D1F]',
      itemPriceColor: 'text-[#1D1D1F]',
      itemDurationColor: 'text-[#8A8A8F]',
      itemDividerColor: 'border-[#F5F5F7]',
      summaryLineColor: 'border-[#E5E5EA]',
      summaryLabelColor: 'text-[#6E6E73]',
      finalPriceColor: 'text-[#1D1D1F]',
      guaranteeBg: 'bg-[#F5F5F7]',
      guaranteeBorder: 'border-[#E5E5EA]',
      guaranteeTextColor: 'text-[#6E6E73]',
      guaranteeTitleColor: 'text-[#1D1D1F]',
      ticketHoleBg: 'bg-[#F5F5F7]',
      ticketHoleBorder: 'border-[#E5E5EA]',
      ticketDashColor: 'border-[#E5E5EA]',
    },
    morandi: {
      pageBg: 'bg-[#ECECEF]',
      cardBg: 'bg-[#FFFFFF]',
      cardBorder: 'border-2 border-[#8A8A8F]',
      cardShadow: 'shadow-md',
      watermarkText: 'SALON DE BEAUTÉ',
      watermarkColor: 'text-[#ECECEF]',
      topRibbonBg: 'bg-[#48484D]',
      topRibbonText: 'text-white',
      topRibbonTitle: '❖ SALON PRIVÉ · 法式艺术莫兰迪',
      headerTitleColor: 'text-[#1D1D1F]',
      headerSubtitleColor: 'text-[#6E6E73]',
      badgeBg: 'bg-[#ECECEF]',
      badgeText: 'text-[#48484D]',
      badgeBorder: 'border border-[#8A8A8F]',
      accentColor: '#48484D',
      sealBg: 'bg-[#48484D]',
      sealText: 'text-white',
      sealBorder: 'border border-[#48484D]',
      sealSymbol: '❖',
      themeName: '法式艺术莫兰迪',
      mottoTag: '法式静谧沙龙',
      mottoBoxBg: 'bg-[#ECECEF]',
      mottoBoxBorder: 'border-[#8A8A8F]/40',
      mottoTextColor: 'text-[#48484D]',
      mottoHeartColor: 'text-[#48484D]',
      itemTitleColor: 'text-[#1D1D1F]',
      itemPriceColor: 'text-[#48484D]',
      itemDurationColor: 'text-[#8A8A8F]',
      itemDividerColor: 'border-[#ECECEF]',
      summaryLineColor: 'border-[#8A8A8F]/30',
      summaryLabelColor: 'text-[#6E6E73]',
      finalPriceColor: 'text-[#1D1D1F]',
      guaranteeBg: 'bg-[#ECECEF]',
      guaranteeBorder: 'border-[#8A8A8F]/30',
      guaranteeTextColor: 'text-[#6E6E73]',
      guaranteeTitleColor: 'text-[#48484D]',
      ticketHoleBg: 'bg-[#ECECEF]',
      ticketHoleBorder: 'border-[#8A8A8F]',
      ticketDashColor: 'border-[#8A8A8F]/40',
    },
    'cherry-blossom': {
      pageBg: 'bg-[#FAECEE]',
      cardBg: 'bg-white',
      cardBorder: 'border-2 border-[#B42332]',
      cardShadow: 'shadow-lg shadow-[#FAECEE]',
      watermarkText: 'SAKURA BLOOM',
      watermarkColor: 'text-[#FAECEE]',
      topRibbonBg: 'bg-[#FAECEE]',
      topRibbonText: 'text-[#B42332]',
      topRibbonTitle: '✿ ATELIER JAPONAIS · 日系柔粉奶油',
      headerTitleColor: 'text-[#1D1D1F]',
      headerSubtitleColor: 'text-[#6E6E73]',
      badgeBg: 'bg-[#FAECEE]',
      badgeText: 'text-[#B42332]',
      badgeBorder: 'border border-[#B42332]/40',
      accentColor: '#B42332',
      sealBg: 'bg-[#FAECEE]',
      sealText: 'text-[#B42332]',
      sealBorder: 'border-2 border-[#B42332]',
      sealSymbol: '✿',
      themeName: '日系柔粉奶油',
      mottoTag: '日系治愈手作',
      mottoBoxBg: 'bg-[#FAECEE]',
      mottoBoxBorder: 'border-[#B42332]/30',
      mottoTextColor: 'text-[#B42332]',
      mottoHeartColor: 'text-[#B42332]',
      itemTitleColor: 'text-[#1D1D1F]',
      itemPriceColor: 'text-[#B42332]',
      itemDurationColor: 'text-[#8A8A8F]',
      itemDividerColor: 'border-[#FAECEE]',
      summaryLineColor: 'border-[#B42332]/25',
      summaryLabelColor: 'text-[#6E6E73]',
      finalPriceColor: 'text-[#B42332]',
      guaranteeBg: 'bg-[#FAECEE]',
      guaranteeBorder: 'border-[#B42332]/20',
      guaranteeTextColor: 'text-[#6E6E73]',
      guaranteeTitleColor: 'text-[#B42332]',
      ticketHoleBg: 'bg-[#FAECEE]',
      ticketHoleBorder: 'border-[#B42332]/30',
      ticketDashColor: 'border-[#B42332]/30',
    },
    'vintage-emerald': {
      pageBg: 'bg-[#EAF4EE]',
      cardBg: 'bg-[#1D1D1F]',
      cardBorder: 'border-2 border-[#D4A017]',
      cardShadow: 'shadow-xl shadow-black/40',
      watermarkText: 'HAUTE JOAILLERIE',
      watermarkColor: 'text-[#343438]',
      topRibbonBg: 'bg-[#287A4B]',
      topRibbonText: 'text-[#F4C95D]',
      topRibbonTitle: '⚜ HAUTE COUTURE · 复古墨绿金奢',
      headerTitleColor: 'text-white',
      headerSubtitleColor: 'text-[#8A8A8F]',
      badgeBg: 'bg-[#287A4B]',
      badgeText: 'text-[#F4C95D]',
      badgeBorder: 'border border-[#D4A017]',
      accentColor: '#D4A017',
      sealBg: 'bg-[#287A4B]',
      sealText: 'text-[#F4C95D]',
      sealBorder: 'border-2 border-[#D4A017]',
      sealSymbol: '⚜',
      themeName: '复古墨绿金奢',
      mottoTag: '尊享私定高定',
      mottoBoxBg: 'bg-[#343438]',
      mottoBoxBorder: 'border-[#D4A017]/40',
      mottoTextColor: 'text-[#F4C95D]',
      mottoHeartColor: 'text-[#D4A017]',
      itemTitleColor: 'text-white',
      itemPriceColor: 'text-[#F4C95D]',
      itemDurationColor: 'text-[#8A8A8F]',
      itemDividerColor: 'border-[#343438]',
      summaryLineColor: 'border-[#D4A017]/40',
      summaryLabelColor: 'text-[#8A8A8F]',
      finalPriceColor: 'text-[#F4C95D]',
      guaranteeBg: 'bg-[#343438]',
      guaranteeBorder: 'border-[#287A4B]',
      guaranteeTextColor: 'text-[#EAF4EE]',
      guaranteeTitleColor: 'text-[#F4C95D]',
      ticketHoleBg: 'bg-[#EAF4EE]',
      ticketHoleBorder: 'border-[#D4A017]',
      ticketDashColor: 'border-[#D4A017]/40',
    },
  }[activeThemeCode as string] || {
    pageBg: 'bg-[#F5F5F7]',
    cardBg: 'bg-white',
    cardBorder: 'border-[#E5E5EA]',
    cardShadow: 'shadow-xs',
    watermarkText: 'RECEIPT',
    watermarkColor: 'text-[#F5F5F7]',
    topRibbonBg: 'bg-[#1D1D1F]',
    topRibbonText: 'text-white',
    topRibbonTitle: '✦ 经典定制单据',
    headerTitleColor: 'text-[#1D1D1F]',
    headerSubtitleColor: 'text-[#6E6E73]',
    badgeBg: 'bg-[#1D1D1F]',
    badgeText: 'text-white',
    badgeBorder: 'border border-[#1D1D1F]',
    accentColor: '#1D1D1F',
    sealBg: 'bg-[#1D1D1F]',
    sealText: 'text-white',
    sealBorder: 'border border-[#1D1D1F]',
    sealSymbol: '✦',
    themeName: '经典定制单据',
    mottoTag: '专业美甲沙龙',
    mottoBoxBg: 'bg-[#F5F5F7]',
    mottoBoxBorder: 'border-[#E5E5EA]',
    mottoTextColor: 'text-[#48484D]',
    mottoHeartColor: 'text-[#1D1D1F]',
    itemTitleColor: 'text-[#1D1D1F]',
    itemPriceColor: 'text-[#1D1D1F]',
    itemDurationColor: 'text-[#8A8A8F]',
    itemDividerColor: 'border-[#F5F5F7]',
    summaryLineColor: 'border-[#E5E5EA]',
    summaryLabelColor: 'text-[#6E6E73]',
    finalPriceColor: 'text-[#1D1D1F]',
    guaranteeBg: 'bg-[#F5F5F7]',
    guaranteeBorder: 'border-[#E5E5EA]',
    guaranteeTextColor: 'text-[#6E6E73]',
    guaranteeTitleColor: 'text-[#1D1D1F]',
    ticketHoleBg: 'bg-[#F5F5F7]',
    ticketHoleBorder: 'border-[#E5E5EA]',
    ticketDashColor: 'border-[#E5E5EA]',
  };

  // 构造 Poster 渲染所需草稿对象
  const posterDraft: QuoteDraft = {
    id: quote.quoteNo || 'QUOTE',
    themeCode: activeThemeCode || 'minimal-white',
    technician: {
      name: quote.technicianName || '高定美甲师',
      title: '手作美甲创作者',
      shopName: quote.shopName || '私人订制美甲工作室',
      phone: quote.technicianPhone,
      tags: ['审美契合', '一客一消毒', '7天修补保障'],
      isRegistered: false,
    },
    items: (quote.items || []).map((it: any, idx: number) => ({
      id: String(idx),
      category: 'style',
      name: it.name,
      price: it.priceFen / 100,
      unit: '整手',
      count: 1,
      durationMinutes: it.durationMinutes || 30,
    })),
    customNote: '每一副指甲，都是指尖绽放的微型艺术。',
    createdAt: new Date(quote.createdAt).getTime(),
  };

  return (
    <div className={`min-h-screen ${themeConfig.pageBg} pb-36 text-[#1D1D1F] transition-colors duration-300`}>
      {/* 顶部轻量浮动条 */}
      <header className="sticky top-2 z-30 px-4 py-2">
        <nav className="max-w-md mx-auto flex items-center justify-between rounded-full border border-[#E5E5EA] bg-white/90 backdrop-blur-xl px-4 py-2.5 shadow-xs">
          <button
            type="button"
            onClick={() => navigate('/quote')}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F]"
          >
            <ArrowLeft size={16} />
            <span>返回出单器</span>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeConfig.accentColor }} />
            <span className="font-bold text-xs text-[#1D1D1F]">{themeConfig.themeName}</span>
          </div>
          <button
            type="button"
            onClick={handleCopySummary}
            className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1"
          >
            {copied ? <Check size={14} className="text-[#287A4B]" /> : <Share2 size={14} />}
            <span>{copied ? '已复制' : '分享'}</span>
          </button>
        </nav>
      </header>

      <main className="max-w-md mx-auto px-4 pt-3 space-y-4">
        {/* 实时主题切换栏 (支持随时切换4套高定皮肤预览) */}
        <div className="p-3 rounded-2xl bg-white border border-[#E5E5EA] shadow-2xs space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-bold text-[#1D1D1F] flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#1D1D1F]" />
              <span>实时换肤·艺术高定调性</span>
            </span>
            <span className="text-[10px] text-[#8A8A8F]">
              当前风格：{themeConfig.themeName}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {THEME_OPTIONS.map((t) => {
              const isSelected = activeThemeCode === t.code;
              const swatchConfigs = {
                'minimal-white': {
                  activeRing: 'border-[#1D1D1F] ring-2 ring-[#1D1D1F]',
                  previewBox: 'bg-white border-2 border-[#1D1D1F] text-[#1D1D1F]',
                  sub: '画廊黑白',
                },
                morandi: {
                  activeRing: 'border-[#48484D] ring-2 ring-[#48484D]',
                  previewBox: 'bg-[#ECECEF] border-2 border-[#8A8A8F] text-[#48484D]',
                  sub: '法式静谧',
                },
                'cherry-blossom': {
                  activeRing: 'border-[#B42332] ring-2 ring-[#B42332]',
                  previewBox: 'bg-[#FAECEE] border-2 border-[#B42332] text-[#B42332]',
                  sub: '日系柔粉',
                },
                'vintage-emerald': {
                  activeRing: 'border-[#D4A017] ring-2 ring-[#D4A017]',
                  previewBox: 'bg-[#1D1D1F] border-2 border-[#D4A017] text-[#F4C95D]',
                  sub: '墨绿金奢',
                },
              }[t.code as 'minimal-white' | 'morandi' | 'cherry-blossom' | 'vintage-emerald'];

              return (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => setActiveThemeCode(t.code)}
                  className={`relative py-2 px-1 rounded-2xl text-center transition-all flex flex-col items-center justify-between gap-1 border min-h-[56px] ${
                    isSelected
                      ? `bg-white ${swatchConfigs?.activeRing} shadow-sm`
                      : 'border-[#E5E5EA] bg-[#F5F5F7] text-[#6E6E73] hover:border-[#8A8A8F]'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shadow-2xs transition-transform ${
                      isSelected ? 'scale-105 font-bold' : ''
                    } ${swatchConfigs?.previewBox}`}
                  >
                    {t.symbol}
                  </div>
                  <div className="flex flex-col items-center leading-tight">
                    <span className={`text-[11px] font-bold ${isSelected ? 'text-[#1D1D1F]' : 'text-[#48484D]'}`}>
                      {t.name.slice(0, 4)}
                    </span>
                    <span className="text-[9px] text-[#8A8A8F]">
                      {swatchConfigs?.sub}
                    </span>
                  </div>
                  {isSelected && (
                    <div
                      className="absolute -top-1.5 -right-1 px-1 py-0.2 rounded-full text-[8px] font-black text-white shadow-2xs"
                      style={{ backgroundColor: t.accent }}
                    >
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2小时倒计时横幅 */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/80 border border-[#E5E5EA] shadow-xs text-xs">
          <div className="flex items-center gap-1.5 text-[#B42332] font-semibold">
            <Clock size={15} />
            <span>限时报价有效倒计时</span>
          </div>
          <div className="flex items-center gap-1 font-mono font-bold text-sm text-[#B42332] bg-[#FAECEE] px-2 py-0.5 rounded-lg">
            <span>{countdownText}</span>
          </div>
        </div>

        {/* 高定艺术凭单票据 (Ticket Receipt Card) */}
        <div className={`relative ${themeConfig.cardBg} rounded-3xl ${themeConfig.cardBorder} ${themeConfig.cardShadow} space-y-4 overflow-hidden transition-all duration-300`}>
          {/* 顶部高定风格缎带 / 艺术标识 */}
          <div className={`px-6 py-2.5 ${themeConfig.topRibbonBg} ${themeConfig.topRibbonText} flex items-center justify-between text-xs font-bold tracking-wider uppercase`}>
            <div className="flex items-center gap-1.5">
              <span>{themeConfig.sealSymbol}</span>
              <span>{themeConfig.topRibbonTitle}</span>
            </div>
            <span className="text-[10px] opacity-80 font-mono">NO. {quote.quoteNo?.slice(-6) || '8839'}</span>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* 单据防伪装饰水印 */}
            <div className={`absolute top-12 right-4 select-none pointer-events-none text-[44px] font-black ${themeConfig.watermarkColor} tracking-widest font-mono opacity-80`}>
              {themeConfig.watermarkText}
            </div>

            {/* 头部：主理人与徽章 */}
            <div className="relative flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-xs transition-colors ${themeConfig.sealBg} ${themeConfig.sealText} ${themeConfig.sealBorder}`}
                >
                  {themeConfig.sealSymbol}
                </div>
                <div>
                  <h1 className={`font-bold text-base tracking-tight ${themeConfig.headerTitleColor}`}>
                    {quote.shopName || quote.technicianName || '高定美甲主理人'}
                  </h1>
                  <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${themeConfig.headerSubtitleColor}`}>
                    <span>{quote.technicianName ? `主理人：${quote.technicianName}` : '艺术手作美甲沙龙'}</span>
                    <span className="w-1 h-1 rounded-full bg-[#8A8A8F]" />
                    <span className="text-[10px]">{themeConfig.mottoTag}</span>
                  </p>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${themeConfig.badgeBg} ${themeConfig.badgeText} ${themeConfig.badgeBorder}`}>
                专属凭单
              </span>
            </div>

            {/* 艺术手作理念寄语 */}
            <div className={`relative p-3.5 rounded-2xl border flex items-center gap-2.5 transition-colors ${themeConfig.mottoBoxBg} ${themeConfig.mottoBoxBorder}`}>
              <Heart size={15} className={`shrink-0 fill-current ${themeConfig.mottoHeartColor}`} />
              <span className={`text-xs italic leading-relaxed ${themeConfig.mottoTextColor}`}>
                “每一副指甲，都是指尖绽放的微型艺术。”
              </span>
            </div>

            {/* 票据打孔切线效果 (Perforated Ticket Divider) */}
            <div className="relative my-2">
              <div className={`absolute -left-9 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full ${themeConfig.ticketHoleBg} border-r-2 ${themeConfig.ticketHoleBorder}`} />
              <div className={`absolute -right-9 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full ${themeConfig.ticketHoleBg} border-l-2 ${themeConfig.ticketHoleBorder}`} />
              <div className={`border-t-2 border-dashed ${themeConfig.ticketDashColor} w-full`} />
            </div>

            {/* 明细列表 */}
            <div className="space-y-3">
              <div className={`flex justify-between items-center text-[11px] font-bold uppercase tracking-wider ${themeConfig.summaryLabelColor}`}>
                <span>高定服务项目明细</span>
                <span>单项金额</span>
              </div>

              {(quote.items || []).map((item: any, idx: number) => (
                <div key={idx} className={`flex items-center justify-between py-1.5 text-xs border-b ${themeConfig.itemDividerColor}`}>
                  <div className="space-y-0.5">
                    <div className={`font-semibold flex items-center gap-1.5 ${themeConfig.itemTitleColor}`}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeConfig.accentColor }} />
                      <span>{item.name}</span>
                    </div>
                    {item.durationMinutes && (
                      <div className={`text-[10px] pl-3 ${themeConfig.itemDurationColor}`}>预估耗时 {item.durationMinutes} 分钟</div>
                    )}
                  </div>
                  <span className={`font-bold tabular-nums text-sm ${themeConfig.itemPriceColor}`}>
                    ¥{(item.priceFen / 100).toFixed(2)}
                  </span>
                </div>
              ))}

              {/* 自动补平项：其他附加 */}
              {quote.adjustmentType === 'OTHER' && (
                <div className={`flex items-center justify-between p-2.5 rounded-xl text-xs ${activeThemeCode === 'vintage-emerald' ? 'bg-[#343438] text-[#F4C95D]' : 'bg-[#ECECEF] text-[#1D1D1F]'}`}>
                  <div>
                    <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#48484D] text-white mr-1.5">
                      其他附加
                    </span>
                    <span className="font-medium">{quote.adjustmentNote || '定制差额项'}</span>
                  </div>
                  <span className="font-bold tabular-nums">
                    +¥{(quote.adjustmentFen / 100).toFixed(2)}
                  </span>
                </div>
              )}

              {/* 自动补平项：立减优惠 */}
              {quote.adjustmentType === 'DISCOUNT' && (
                <div className={`flex items-center justify-between p-2.5 rounded-xl text-xs ${activeThemeCode === 'vintage-emerald' ? 'bg-[#287A4B] text-white' : 'bg-[#EAF4EE] text-[#287A4B]'}`}>
                  <div>
                    <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#287A4B] text-white mr-1.5">
                      立减优惠
                    </span>
                    <span className="font-medium">专属宠粉折扣</span>
                  </div>
                  <span className="font-bold tabular-nums">
                    -¥{(quote.adjustmentFen / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* 汇总金额区 */}
            <div className={`border-t pt-4 space-y-2 ${themeConfig.summaryLineColor}`}>
              <div className={`flex justify-between text-xs ${themeConfig.summaryLabelColor}`}>
                <span>组合项目原价</span>
                <span className="line-through tabular-nums">¥{(quote.sumPriceFen / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <div>
                  <span className={`font-bold text-sm block ${themeConfig.headerTitleColor}`}>本次专属实付最终价</span>
                  <span className={`text-[10px] ${themeConfig.headerSubtitleColor}`}>明细透明 · 无隐形附加消费</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-base font-bold ${themeConfig.finalPriceColor}`}>¥</span>
                  <span className={`text-3xl font-black tabular-nums tracking-tight ${themeConfig.finalPriceColor}`}>
                    {(quote.finalPriceFen / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* 美甲师专业手护保障承诺 */}
            <div className={`p-3.5 rounded-2xl border space-y-1.5 text-[11px] transition-colors ${themeConfig.guaranteeBg} ${themeConfig.guaranteeBorder} ${themeConfig.guaranteeTextColor}`}>
              <div className={`font-semibold flex items-center gap-1.5 ${themeConfig.guaranteeTitleColor}`}>
                <ShieldCheck size={15} className="text-[#287A4B]" />
                <span>美甲师专业手护与健康承诺</span>
              </div>
              <div className="pl-5 space-y-0.5">
                <div>• 全线采用进口健康环保树脂胶，温和无刺鼻气味</div>
                <div>• 打磨头与钢推医用级双重消毒，一客一消毒，安心无忧</div>
                <div>• 承诺非人为外力原因 7 天内免费修补呵护</div>
              </div>
            </div>

            {/* 单据底标 */}
            <div className={`pt-2 border-t ${themeConfig.itemDividerColor} flex justify-between items-center text-[10px] ${themeConfig.headerSubtitleColor}`}>
              <span className="font-mono">NO: {quote.quoteNo}</span>
              <span>2小时限时有效凭单</span>
            </div>
          </div>
        </div>

        {/* 免费版交互限制与功能权益引导卡片 */}
        <div className="bg-white rounded-3xl p-5 border border-[#E5E5EA] shadow-xs space-y-3.5">
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#ECECEF] text-xs text-[#48484D] leading-relaxed">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-[#6E6E73]" />
            <div>
              <span className="font-bold block text-[#1D1D1F] mb-0.5">单次报价单查阅须知</span>
              <span>
                本报价单为限时单据，暂不支持直接在线选档期与浏览作品集。如需锁定预约该方案，请长按下方海报或联系美甲师微信确认。
              </span>
            </div>
          </div>

          {/* 置灰预约按钮 */}
          <button
            type="button"
            onClick={() => setIsBookModalOpen(true)}
            className="w-full h-12 rounded-2xl bg-[#ECECEF] text-[#6E6E73] text-xs font-bold cursor-not-allowed hover:bg-[#E5E5EA] active:scale-[0.99] transition-all flex items-center justify-center gap-2 border border-[#E5E5EA]"
          >
            <Clock size={16} />
            <span>直接发起预约 (免费版未开启在线锁单)</span>
          </button>

          {/* 下载海报与联系美甲师 */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setIsPosterOpen(true)}
              className="flex-1 h-12 rounded-2xl border border-[#E5E5EA] bg-[#F5F5F7] text-[#1D1D1F] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#ECECEF] active:scale-[0.99] transition-all shadow-xs"
            >
              <ImageIcon size={16} />
              <span>保存高清海报图片</span>
            </button>

            {quote.technicianPhone && (
              <a
                href={`tel:${quote.technicianPhone}`}
                className="flex-1 h-12 rounded-2xl bg-[#1D1D1F] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#343438] active:scale-[0.99] transition-all shadow-xs"
              >
                <Phone size={15} />
                <span>联系美甲师</span>
              </a>
            )}
          </div>
        </div>

        {/* 宣传裂变抓手：吸引查看报价单的美甲师同行与潜在客户 */}
        <div className="p-4 rounded-3xl bg-white border border-[#E5E5EA] shadow-xs text-center space-y-2">
          <div className="text-xs font-bold text-[#1D1D1F]">
            你也是美甲师？告别聊天框纯打字报价格
          </div>
          <p className="text-[11px] text-[#6E6E73] leading-relaxed">
            无需注册，30秒免费生成属于你的艺术视觉报价单与高清长图海报
          </p>
          <button
            type="button"
            onClick={() => navigate('/quote')}
            className="w-full h-11 rounded-2xl bg-[#1D1D1F] text-white text-xs font-bold hover:bg-[#343438] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Sparkles size={14} className="text-[#F4C95D]" />
            <span>免费制作我的美甲高定报价单</span>
          </button>
        </div>

        {/* 底部品牌水印 */}
        <div className="text-center pt-1 pb-4">
          <span className="text-[11px] text-[#8A8A8F]">
            由 OnlyNail 美甲工作台提供高定设计支持
          </span>
        </div>
      </main>

      {/* 预约限制说明弹窗 */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 border border-[#E5E5EA] shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setIsBookModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#8A8A8F] hover:bg-[#ECECEF]"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#FAECEE] text-[#B42332] flex items-center justify-center">
                <AlertTriangle size={16} />
              </div>
              <h3 className="font-bold text-base text-[#1D1D1F]">简易报价单提示</h3>
            </div>

            <p className="text-xs text-[#48484D] leading-relaxed">
              当前为免费简易报价单，仅供查阅。客户无法直接查看美甲师主页与作品集，亦无法直接在线锁单付定金。
            </p>

            <div className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] space-y-1.5 text-xs">
              <div className="font-bold text-[#1D1D1F]">如何预约此方案？</div>
              <div className="text-[#48484D]">
                • 点击下方复制文字账单，微信发送给美甲师手工核对时间；
              </div>
              <div className="text-[#48484D]">
                • 美甲师获取密钥开通 OnlyNail 专业版后，即可开启<strong>客户直接发起预约、浏览作品瀑布流与主页</strong>！
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleCopySummary}
                className="w-full h-11 rounded-xl bg-[#1D1D1F] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#343438] transition-all"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? '已复制报价方案' : '一键复制文字账单'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBookModalOpen(false)}
                className="w-full py-2 text-xs text-[#6E6E73]"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 高清长图海报导出弹窗 */}
      <PosterModal
        isOpen={isPosterOpen}
        onClose={() => setIsPosterOpen(false)}
        draft={posterDraft}
      />
    </div>
  );
};
