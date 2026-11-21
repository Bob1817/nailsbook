import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuickQuote } from '../../services/api';
import { PosterModal } from './components/PosterModal';
import type { QuoteDraft } from './quoteTypes';
import {
  Sparkles,
  Plus,
  Trash2,
  Share2,
  Check,
  ChevronRight,
  AlertCircle,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Heart,
  Eye,
  Clock,
  ShieldCheck,
  X,
} from 'lucide-react';

interface QuickItem {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  enabled: boolean;
}

const DEFAULT_ITEMS: QuickItem[] = [
  { id: '1', name: '基础纯色美甲', price: 180, durationMinutes: 60, enabled: true },
  { id: '2', name: '深度卸甲清洁', price: 60, durationMinutes: 30, enabled: false },
  { id: '3', name: '建构加固找平', price: 80, durationMinutes: 20, enabled: false },
  { id: '4', name: '日式晕染手绘款', price: 280, durationMinutes: 90, enabled: false },
];

const THEMES = [
  {
    code: 'minimal-white',
    name: '极简黑白画廊',
    desc: '冷调克制 现代艺术',
    bg: '#FFFFFF',
    accent: '#1D1D1F',
    symbol: '✦',
  },
  {
    code: 'morandi',
    name: '法式莫兰迪',
    desc: '低饱和度 静谧沙龙',
    bg: '#ECECEF',
    accent: '#48484D',
    symbol: '❖',
  },
  {
    code: 'cherry-blossom',
    name: '日系柔粉奶油',
    desc: '温润裸粉 治愈手作',
    bg: '#FAECEE',
    accent: '#B42332',
    symbol: '✿',
  },
  {
    code: 'vintage-emerald',
    name: '复古墨绿金奢',
    desc: '典雅墨绿 尊享私定',
    bg: '#EAF4EE',
    accent: '#287A4B',
    symbol: '⚜',
  },
];

const SCENARIO_PRESETS = [
  {
    name: '纯色建构款',
    items: [
      { name: '本甲单色美甲', price: 168, durationMinutes: 60 },
      { name: '建构平整找平', price: 60, durationMinutes: 20 },
    ],
  },
  {
    name: '日系冰透猫眼',
    items: [
      { name: '冰透裸色打底', price: 168, durationMinutes: 50 },
      { name: '宽光晶石猫眼', price: 60, durationMinutes: 20 },
      { name: '深层指皮修护', price: 50, durationMinutes: 20 },
    ],
  },
  {
    name: '法式气质延长',
    items: [
      { name: '高定甲片延长', price: 228, durationMinutes: 80 },
      { name: '极细手工法式', price: 80, durationMinutes: 30 },
    ],
  },
  {
    name: '重工手绘排钻',
    items: [
      { name: '纸托光疗延长', price: 288, durationMinutes: 90 },
      { name: '手绘晕染款式', price: 120, durationMinutes: 40 },
      { name: '异形轻奢排钻', price: 80, durationMinutes: 20 },
    ],
  },
];

export const QuoteCalculatorPage: React.FC = () => {
  const navigate = useNavigate();

  // 1. 服务明细（单次配置，不持久化专属库）
  const [items, setItems] = useState<QuickItem[]>(DEFAULT_ITEMS);

  // 2. 最终报价输入
  const [customFinalPrice, setCustomFinalPrice] = useState<string>('');
  const [adjustmentNote, setAdjustmentNote] = useState<string>('');

  // 3. 美甲师信息与情绪价值定制（选填）
  const [techName, setTechName] = useState<string>('');
  const [techPhone, setTechPhone] = useState<string>('');
  const [shopName, setShopName] = useState<string>('');
  const [moodMotto, setMoodMotto] = useState<string>('每一副指甲，都是指尖绽放的微型艺术。');

  // 4. 主题代码
  const [selectedTheme, setSelectedTheme] = useState<string>('minimal-white');

  // 状态
  const [submitting, setSubmitting] = useState(false);
  const [isPosterOpen, setIsPosterOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [resultModal, setResultModal] = useState<{
    token: string;
    quoteNo: string;
    finalPriceFen: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);

  // 计算组合原价
  const enabledItems = items.filter((i) => i.enabled);
  const sumPrice = enabledItems.reduce((acc, cur) => acc + (Number(cur.price) || 0), 0);
  const totalDuration = enabledItems.reduce(
    (acc, cur) => acc + (Number(cur.durationMinutes) || 0),
    0,
  );

  // 最终报价
  const finalPrice = customFinalPrice !== '' ? Number(customFinalPrice) : sumPrice;

  // 自动调平逻辑
  let adjustmentType: 'NONE' | 'OTHER' | 'DISCOUNT' = 'NONE';
  let adjustmentVal = 0;
  if (finalPrice > sumPrice) {
    adjustmentType = 'OTHER';
    adjustmentVal = finalPrice - sumPrice;
  } else if (finalPrice < sumPrice) {
    adjustmentType = 'DISCOUNT';
    adjustmentVal = sumPrice - finalPrice;
  }

  // 当前所选主题的高定设计参数映射 (深度贯穿凭单底色、边框、顶栏缎带、字体与价格色彩)
  const themeDetails = {
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
  }[selectedTheme] || {
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

  // 切换服务启用
  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
    );
  };

  const updateItemName = (id: string, name: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name } : item)),
    );
  };

  const updateItemPrice = (id: string, price: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, price } : item)),
    );
  };

  const addItem = () => {
    const newItem: QuickItem = {
      id: Date.now().toString(),
      name: '自定义美甲项目',
      price: 50,
      durationMinutes: 30,
      enabled: true,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const applyPreset = (preset: typeof SCENARIO_PRESETS[0]) => {
    setItems(
      preset.items.map((it, idx) => ({
        id: `${Date.now()}_${idx}`,
        name: it.name,
        price: it.price,
        durationMinutes: it.durationMinutes,
        enabled: true,
      })),
    );
    setCustomFinalPrice('');
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    if (enabledItems.length === 0) {
      alert('请至少勾选一项美甲服务');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        items: enabledItems.map((item) => ({
          name: item.name.trim() || '未命名服务',
          priceFen: Math.round(Number(item.price || 0) * 100),
          durationMinutes: item.durationMinutes || 30,
        })),
        finalPriceFen: Math.round(finalPrice * 100),
        themeCode: selectedTheme,
        technicianName: techName.trim() || undefined,
        technicianPhone: techPhone.trim() || undefined,
        shopName: shopName.trim() || undefined,
        adjustmentNote: adjustmentNote.trim() || undefined,
      };

      const res = await createQuickQuote(payload);
      setResultModal({
        token: res.publicToken,
        quoteNo: res.quoteNo,
        finalPriceFen: res.finalPriceFen,
      });
    } catch (err: any) {
      alert(err.message || '生成报价单失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!resultModal) return;
    const url = `${window.location.origin}/q/${resultModal.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 构造 Poster 渲染所需草稿对象
  const posterDraft: QuoteDraft = {
    id: resultModal?.quoteNo || 'DRAFT',
    technician: {
      name: techName.trim() || '高定美甲师',
      title: '手作美甲创作者',
      shopName: shopName.trim() || '私人订制美甲工作室',
      phone: techPhone.trim(),
      tags: ['审美契合', '一客一消毒', '7天修补保障'],
      isRegistered: false,
    },
    items: enabledItems.map((it) => ({
      id: it.id,
      category: 'style',
      name: it.name,
      price: it.price,
      unit: '整手',
      count: 1,
      durationMinutes: it.durationMinutes,
    })),
    customNote: moodMotto,
    themeCode: selectedTheme,
    createdAt: Date.now(),
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] pb-32">
      {/* 顶部情绪价值与审美导航 */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E5E5EA] px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-[#1D1D1F]">
              美甲定制报价凭单
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FAECEE] text-[#B42332]">
              免费出单
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowPromoModal(true)}
            className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] flex items-center gap-1"
          >
            <Sparkles size={13} className="text-[#F4C95D]" />
            <span>升级专业版</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* 审美宣言 Banner */}
        <div className="p-3.5 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-between shadow-xs">
          <div className="space-y-0.5">
            <div className="text-xs font-bold flex items-center gap-1">
              <Heart size={13} className="text-[#F4C95D] fill-[#F4C95D]" />
              <span>拒绝聊天冷冰冰报数字，用审美传递温度</span>
            </div>
            <div className="text-[11px] text-[#E5E5EA]">
              选择优雅主题，输出网页链接或高清图片发给客户
            </div>
          </div>
          <span className="text-[10px] text-[#8A8A8F] shrink-0 ml-2">限时只读</span>
        </div>

        {/* 1. 美甲师与个性化情绪寄语（选填） */}
        <section className="bg-white rounded-2xl p-4 border border-[#E5E5EA] shadow-xs space-y-3">
          <div>
            <h2 className="font-bold text-sm text-[#1D1D1F]">1. 美甲师身份与审美寄语 (选填)</h2>
            <p className="text-xs text-[#6E6E73] mt-0.5">赋予报价单专属的艺术识别度与仪式感</p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-[#E5E5EA]">
              <span className="text-[#48484D] w-24">美甲师称呼</span>
              <input
                type="text"
                value={techName}
                onChange={(e) => setTechName(e.target.value)}
                placeholder="如：Amy / 琪琪 (选填)"
                className="flex-1 text-right focus:outline-none text-[#1D1D1F]"
              />
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#E5E5EA]">
              <span className="text-[#48484D] w-24">联系电话/微信</span>
              <input
                type="text"
                value={techPhone}
                onChange={(e) => setTechPhone(e.target.value)}
                placeholder="客户联系方式 (选填)"
                className="flex-1 text-right focus:outline-none text-[#1D1D1F]"
              />
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#E5E5EA]">
              <span className="text-[#48484D] w-24">工作室名称</span>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="如：Amy日式美甲工作室 (选填)"
                className="flex-1 text-right focus:outline-none text-[#1D1D1F]"
              />
            </div>
            <div className="pt-1">
              <span className="text-[#48484D] block mb-1">手作寄语 (将印在报价单与海报上)</span>
              <input
                type="text"
                value={moodMotto}
                onChange={(e) => setMoodMotto(e.target.value)}
                placeholder="如：每一副指甲，都是指尖绽放的微型艺术。"
                className="w-full p-2 bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg text-xs text-[#1D1D1F] focus:outline-none"
              />
            </div>
          </div>

          {/* 升级专属主页引流卡片 */}
          <div
            onClick={() => setShowPromoModal(true)}
            className="p-3.5 rounded-xl bg-[#ECECEF] text-[#1D1D1F] cursor-pointer hover:bg-[#E5E5EA] transition-all flex items-center justify-between border border-[#E5E5EA]"
          >
            <div>
              <span className="inline-block px-1.5 py-0.5 rounded bg-[#1D1D1F] text-[#F4C95D] text-[10px] font-bold mb-1">
                PRO 升级专享
              </span>
              <div className="text-xs font-bold">永久存储个人信息、店铺空间与作品集？</div>
              <div className="text-[11px] text-[#6E6E73] mt-0.5">
                开通收费版即可持久化专属服务库，并在报价单内开启客户直接发起预约！
              </div>
            </div>
            <ChevronRight size={18} className="text-[#8A8A8F] shrink-0 ml-2" />
          </div>
        </section>

        {/* 2. 服务明细与调平 */}
        <section className="bg-white rounded-2xl p-4 border border-[#E5E5EA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-sm text-[#1D1D1F]">2. 本次美甲明细</h2>
            <span className="text-xs text-[#6E6E73]">共 {enabledItems.length} 项 · 约 {totalDuration} 分钟</span>
          </div>

          {/* 高频常见场景一键套用 */}
          <div className="mb-3">
            <div className="text-[11px] font-medium text-[#6E6E73] mb-1.5 flex items-center gap-1">
              <Sparkles size={12} className="text-[#F4C95D]" />
              <span>快速套用高频款式模板：</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SCENARIO_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2.5 py-1 rounded-full border border-[#E5E5EA] bg-[#F5F5F7] text-[11px] font-semibold text-[#1D1D1F] whitespace-nowrap hover:bg-[#ECECEF] active:scale-95 transition-all shadow-2xs"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-[#ECECEF] mb-3 text-[11px] text-[#48484D]">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-[#6E6E73]" />
            <span>免费版每次需手动配置服务与价格；开通收费系统可保存专属服务库一键调用。</span>
          </div>

          {/* 列表 */}
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                  item.enabled
                    ? 'bg-white border-[#E5E5EA]'
                    : 'bg-[#F5F5F7] border-[#E5E5EA] opacity-60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={`w-5 h-5 rounded flex items-center justify-center border text-xs font-bold transition-all ${
                    item.enabled
                      ? 'bg-[#1D1D1F] border-[#1D1D1F] text-white'
                      : 'border-[#8A8A8F] bg-white text-transparent'
                  }`}
                >
                  ✓
                </button>

                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItemName(item.id, e.target.value)}
                  className="flex-1 text-xs font-medium bg-transparent text-[#1D1D1F] focus:outline-none"
                  placeholder="项目名称"
                />

                <div className="flex items-center bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-2 py-1 w-20">
                  <span className="text-xs font-bold mr-0.5">¥</span>
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateItemPrice(item.id, Number(e.target.value))}
                    className="w-full text-xs font-bold text-right bg-transparent text-[#1D1D1F] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-1 text-[#8A8A8F] hover:text-[#B42332]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="w-full mt-3 py-2 border border-dashed border-[#8A8A8F] rounded-xl text-xs font-medium text-[#48484D] hover:bg-[#ECECEF] flex items-center justify-center gap-1 transition-all"
          >
            <Plus size={14} />
            <span>添加自定义项目</span>
          </button>

          <div className="mt-3 pt-3 border-t border-[#E5E5EA] flex items-center justify-between text-xs">
            <span className="text-[#48484D]">组合原价小计</span>
            <span className="font-bold text-[#1D1D1F] text-sm">¥{sumPrice.toFixed(2)}</span>
          </div>
        </section>

        {/* 3. 最终报价与自动调平 */}
        <section className="bg-white rounded-2xl p-4 border border-[#E5E5EA] shadow-xs">
          <div className="mb-2">
            <h2 className="font-bold text-sm text-[#1D1D1F]">3. 最终报价</h2>
            <p className="text-xs text-[#6E6E73] mt-0.5">
              默认为组合价。修改后系统自动补平【其他】溢价或【优惠】减免。
            </p>
          </div>

          <div className="flex items-center gap-2 border-2 border-[#1D1D1F] rounded-xl px-3 py-2 bg-white">
            <span className="text-xl font-black text-[#1D1D1F]">¥</span>
            <input
              type="number"
              value={customFinalPrice}
              onChange={(e) => setCustomFinalPrice(e.target.value)}
              placeholder={sumPrice.toString()}
              className="flex-1 text-2xl font-black text-[#1D1D1F] focus:outline-none"
            />
          </div>

          <div className="mt-3">
            {adjustmentType === 'OTHER' && (
              <div className="p-2.5 rounded-xl bg-[#ECECEF] border border-[#E5E5EA] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded bg-[#48484D]">
                    自动生成【其他】
                  </span>
                  <span className="text-xs font-bold text-[#1D1D1F]">
                    +¥{adjustmentVal.toFixed(2)} (溢价差额)
                  </span>
                </div>
                <input
                  type="text"
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  placeholder="可填写溢价备注（如：夜间加班费 / 特殊钻饰）"
                  className="w-full text-xs p-1.5 rounded-lg border border-[#E5E5EA] bg-white focus:outline-none text-[#1D1D1F]"
                />
              </div>
            )}

            {adjustmentType === 'DISCOUNT' && (
              <div className="p-2.5 rounded-xl bg-[#EAF4EE] border border-[#EAF4EE] flex items-center justify-between">
                <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded bg-[#287A4B]">
                  自动生成【优惠】
                </span>
                <span className="text-xs font-bold text-[#287A4B]">
                  -¥{adjustmentVal.toFixed(2)} (折扣减免)
                </span>
              </div>
            )}

            {adjustmentType === 'NONE' && (
              <div className="p-2 rounded-lg bg-[#F5F5F7] text-center text-xs text-[#6E6E73]">
                当前最终报价与组合原价一致，无需调平
              </div>
            )}
          </div>
        </section>

        {/* 4. 视觉主题选择器 */}
        <section className="bg-white rounded-2xl p-4 border border-[#E5E5EA] shadow-xs">
          <div className="mb-3">
            <h2 className="font-bold text-sm text-[#1D1D1F]">4. 选择视觉设计主题</h2>
            <p className="text-xs text-[#6E6E73] mt-0.5">选择契合您美甲艺术风格的配色调性</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {THEMES.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => setSelectedTheme(t.code)}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                  selectedTheme === t.code
                    ? 'border-[#1D1D1F] bg-[#ECECEF]/60 shadow-xs'
                    : 'border-[#E5E5EA] bg-white hover:border-[#8A8A8F]'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-xl border border-[#E5E5EA] flex items-center justify-center shrink-0 shadow-xs text-sm font-bold"
                  style={{ backgroundColor: t.bg, color: t.accent }}
                >
                  {t.symbol}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#1D1D1F] truncate">{t.name}</div>
                  <div className="text-[10px] text-[#6E6E73] mt-0.5 truncate">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* 实时效果小样卡片（点击直接全屏预览客户效果） */}
          <div
            onClick={() => setIsPreviewModalOpen(true)}
            className="mt-3.5 p-3 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] cursor-pointer hover:border-[#1D1D1F] transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#1D1D1F]">
                <Eye size={15} className="text-[#1D1D1F]" />
                <span>客户视角效果预览</span>
              </div>
              <span className="text-[10px] text-[#6E6E73] group-hover:text-[#1D1D1F] flex items-center gap-0.5">
                <span>点击全屏预览</span>
                <ChevronRight size={13} />
              </span>
            </div>

            {/* 拟物票据迷你缩略图 */}
            <div className={`p-3 rounded-xl ${themeDetails.cardBorder} ${themeDetails.cardBg} ${themeDetails.cardShadow} flex items-center justify-between transition-all`}>
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shadow-2xs ${themeDetails.sealBg} ${themeDetails.sealText} ${themeDetails.sealBorder}`}
                >
                  {themeDetails.sealSymbol}
                </div>
                <div>
                  <div className={`text-xs font-bold ${themeDetails.headerTitleColor}`}>
                    {shopName.trim() || techName.trim() || '高定美甲沙龙'}
                  </div>
                  <div className={`text-[10px] ${themeDetails.headerSubtitleColor}`}>
                    {themeDetails.themeName} · {enabledItems.length} 项定制服务
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-[10px] ${themeDetails.headerSubtitleColor}`}>最终应付</div>
                <div className={`text-sm font-black tabular-nums ${themeDetails.finalPriceColor}`}>¥{finalPrice.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 底部生成与预览操作栏 */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#E5E5EA] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2.5">
          <div>
            <div className="text-[10px] text-[#8A8A8F]">应付最终价</div>
            <div className="text-2xl font-black text-[#1D1D1F] tabular-nums">
              ¥{finalPrice.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={enabledItems.length === 0}
              onClick={() => setIsPreviewModalOpen(true)}
              className="h-11 px-3 rounded-xl border-2 border-[#1D1D1F] bg-white text-[#1D1D1F] text-xs font-bold hover:bg-[#F5F5F7] active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Eye size={15} />
              <span>预览效果</span>
            </button>

            <button
              type="button"
              disabled={enabledItems.length === 0}
              onClick={() => setIsPosterOpen(true)}
              className="h-11 px-2.5 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] text-[#1D1D1F] text-xs font-bold hover:bg-[#ECECEF] active:scale-[0.98] transition-all flex items-center gap-1"
            >
              <ImageIcon size={14} />
              <span>海报长图</span>
            </button>

            <button
              type="button"
              disabled={submitting || enabledItems.length === 0}
              onClick={handleSubmit}
              className="h-11 px-3.5 rounded-xl bg-[#1D1D1F] text-white text-xs font-bold hover:bg-[#343438] active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Share2 size={15} />
              <span>{submitting ? '出单中…' : '生成链接'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* 结果弹窗 */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center border border-[#E5E5EA] shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FAECEE] text-[#B42332] flex items-center justify-center text-2xl mx-auto">
              ✨
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#1D1D1F]">专属报价单已就绪</h3>
              <p className="text-xs text-[#B42332] mt-1 font-semibold">
                该单据仅供展示查看，2小时后将自动失效
              </p>
            </div>

            <div className="bg-[#F5F5F7] rounded-xl p-3 text-left text-xs space-y-1.5 text-[#48484D]">
              <div className="flex justify-between">
                <span>单据编号</span>
                <span className="font-mono text-[#1D1D1F] font-medium">
                  {resultModal.quoteNo}
                </span>
              </div>
              <div className="flex justify-between">
                <span>最终应付</span>
                <span className="font-bold text-[#1D1D1F]">
                  ¥{(resultModal.finalPriceFen / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>有效期限</span>
                <span className="font-semibold text-[#B42332]">2 小时内只读有效</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => navigate(`/q/${resultModal.token}`)}
                className="w-full h-11 rounded-xl bg-[#1D1D1F] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#343438] transition-all"
              >
                <ExternalLink size={15} />
                <span>立即打开客户视角网页</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full h-11 rounded-xl bg-[#ECECEF] text-[#1D1D1F] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#E5E5EA] transition-all"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                <span>{copied ? '已复制网页访问链接' : '复制网页访问链接发给客户'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setResultModal(null);
                  setIsPosterOpen(true);
                }}
                className="w-full h-11 rounded-xl border border-[#E5E5EA] text-[#1D1D1F] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#F5F5F7] transition-all"
              >
                <ImageIcon size={15} />
                <span>同时下载为高清海报图片</span>
              </button>

              <button
                type="button"
                onClick={() => setResultModal(null)}
                className="w-full py-2 text-xs text-[#6E6E73] hover:text-[#1D1D1F]"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 客户视角 1:1 真实预览弹窗 (所见即所得) */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto border border-[#E5E5EA] max-h-[92vh]">
            {/* 预览窗顶栏 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5EA] bg-white sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full transition-colors"
                  style={{ backgroundColor: themeDetails.accentColor }}
                />
                <div>
                  <div className="font-bold text-xs text-[#1D1D1F] flex items-center gap-1.5">
                    <span>客户视角 1:1 效果预览</span>
                    <span className="text-[10px] text-[#6E6E73] font-normal">({themeDetails.themeName})</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A8A8F] hover:bg-[#ECECEF] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* 预览窗口内实时主题切换栏 (4大高定主题即点即切) */}
            <div className="px-3.5 py-2.5 bg-white border-b border-[#E5E5EA] sticky top-[49px] z-20 shadow-2xs">
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="text-[11px] font-bold text-[#1D1D1F] flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[#1D1D1F]" />
                  <span>实时换肤·艺术高定调性</span>
                </span>
                <span className="text-[10px] text-[#8A8A8F]">
                  点击立即体验沉浸式视觉
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {THEMES.map((t) => {
                  const isSelected = selectedTheme === t.code;
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
                      onClick={() => setSelectedTheme(t.code)}
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

            {/* 模拟客户屏幕真实视图 */}
            <div className={`p-4 overflow-y-auto ${themeDetails.pageBg} space-y-3.5 transition-colors duration-300`}>
              {/* 倒计时小条 */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/80 border border-[#E5E5EA] shadow-2xs text-[11px]">
                <div className="flex items-center gap-1.5 text-[#B42332] font-semibold">
                  <Clock size={13} />
                  <span>限时报价有效倒计时</span>
                </div>
                <span className="font-bold text-xs text-[#B42332] font-mono bg-[#FAECEE] px-2 py-0.5 rounded-lg">
                  02:00:00
                </span>
              </div>

              {/* 拟物高定艺术凭单 */}
              <div className={`relative ${themeDetails.cardBg} rounded-3xl ${themeDetails.cardBorder} ${themeDetails.cardShadow} space-y-3.5 overflow-hidden transition-all duration-300`}>
                {/* 顶部高定风格缎带 / 艺术标识 */}
                <div className={`px-5 py-2 ${themeDetails.topRibbonBg} ${themeDetails.topRibbonText} flex items-center justify-between text-[11px] font-bold tracking-wider uppercase`}>
                  <div className="flex items-center gap-1.5">
                    <span>{themeDetails.sealSymbol}</span>
                    <span>{themeDetails.topRibbonTitle}</span>
                  </div>
                  <span className="text-[10px] opacity-80 font-mono">NO. 8839</span>
                </div>

                <div className="px-5 pb-5 space-y-4">
                  {/* 单据防伪装饰水印 */}
                  <div className={`absolute top-10 right-4 select-none pointer-events-none text-[34px] font-black ${themeDetails.watermarkColor} tracking-widest font-mono opacity-80`}>
                    {themeDetails.watermarkText}
                  </div>

                  {/* 头部信息 */}
                  <div className="relative flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold shadow-xs transition-colors ${themeDetails.sealBg} ${themeDetails.sealText} ${themeDetails.sealBorder}`}
                      >
                        {themeDetails.sealSymbol}
                      </div>
                      <div>
                        <div className={`font-bold text-sm tracking-tight ${themeDetails.headerTitleColor}`}>
                          {shopName.trim() || techName.trim() || '高定美甲沙龙'}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${themeDetails.headerSubtitleColor}`}>
                          {techName ? `主理人：${techName}` : '艺术手作美甲沙龙'} · {themeDetails.mottoTag}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${themeDetails.badgeBg} ${themeDetails.badgeText} ${themeDetails.badgeBorder}`}>
                      专属凭单
                    </span>
                  </div>

                  {/* 手作寄语 */}
                  <div className={`relative p-3 rounded-2xl border flex items-center gap-2.5 transition-colors ${themeDetails.mottoBoxBg} ${themeDetails.mottoBoxBorder}`}>
                    <Heart size={14} className={`shrink-0 fill-current ${themeDetails.mottoHeartColor}`} />
                    <span className={`text-[11px] italic leading-tight ${themeDetails.mottoTextColor}`}>
                      “{moodMotto.trim() || '每一副指甲，都是指尖绽放的微型艺术。'}”
                    </span>
                  </div>

                  {/* 打孔虚线切口 */}
                  <div className="relative my-1">
                    <div className={`absolute -left-9 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full ${themeDetails.ticketHoleBg} border-r-2 ${themeDetails.ticketHoleBorder}`} />
                    <div className={`absolute -right-9 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full ${themeDetails.ticketHoleBg} border-l-2 ${themeDetails.ticketHoleBorder}`} />
                    <div className={`border-t-2 border-dashed ${themeDetails.ticketDashColor} w-full`} />
                  </div>

                  {/* 明细清单 */}
                  <div className="space-y-2">
                    <div className={`flex justify-between text-[10px] font-bold uppercase tracking-wider ${themeDetails.summaryLabelColor}`}>
                      <span>定制项目明细 ({enabledItems.length}项)</span>
                      <span>金额</span>
                    </div>

                    {enabledItems.map((item) => (
                      <div key={item.id} className={`flex justify-between items-center py-1.5 text-xs border-b ${themeDetails.itemDividerColor}`}>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
                            style={{ backgroundColor: themeDetails.accentColor }}
                          />
                          <span className={`font-medium ${themeDetails.itemTitleColor}`}>{item.name}</span>
                          {item.durationMinutes && (
                            <span className={`text-[10px] ml-1 ${themeDetails.itemDurationColor}`}>{item.durationMinutes}m</span>
                          )}
                        </div>
                        <span className={`font-bold tabular-nums ${themeDetails.itemPriceColor}`}>¥{item.price.toFixed(2)}</span>
                      </div>
                    ))}

                    {/* 调平项 */}
                    {adjustmentType === 'OTHER' && (
                      <div className={`flex justify-between p-2 rounded-xl text-xs ${selectedTheme === 'vintage-emerald' ? 'bg-[#343438] text-[#F4C95D]' : 'bg-[#ECECEF] text-[#1D1D1F]'}`}>
                        <span className="font-medium">其他附加 ({adjustmentNote || '差额项'})</span>
                        <span className="font-bold">+¥{adjustmentVal.toFixed(2)}</span>
                      </div>
                    )}

                    {adjustmentType === 'DISCOUNT' && (
                      <div className={`flex justify-between p-2 rounded-xl text-xs ${selectedTheme === 'vintage-emerald' ? 'bg-[#287A4B] text-white' : 'bg-[#EAF4EE] text-[#287A4B]'}`}>
                        <span className="font-medium">立减优惠 (专属宠粉折扣)</span>
                        <span className="font-bold">-¥{adjustmentVal.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* 汇总 */}
                  <div className={`border-t pt-3 space-y-1.5 ${themeDetails.summaryLineColor}`}>
                    <div className={`flex justify-between text-xs ${themeDetails.summaryLabelColor}`}>
                      <span>组合原价</span>
                      <span className="line-through">¥{sumPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-0.5">
                      <span className={`font-bold text-sm ${themeDetails.headerTitleColor}`}>最终应付金额</span>
                      <span className={`text-2xl font-black tabular-nums ${themeDetails.finalPriceColor}`}>
                        ¥{finalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* 保障承诺 */}
                  <div className={`p-2.5 rounded-2xl border text-[10px] space-y-0.5 transition-colors ${themeDetails.guaranteeBg} ${themeDetails.guaranteeBorder} ${themeDetails.guaranteeTextColor}`}>
                    <div className={`font-semibold flex items-center gap-1 ${themeDetails.guaranteeTitleColor}`}>
                      <ShieldCheck size={12} className="text-[#287A4B]" />
                      <span>美甲师专业手护保障承诺</span>
                    </div>
                    <div>• 健康环保树脂胶 · 医用级一客一消毒 · 7天免费修补</div>
                  </div>
                </div>
              </div>

              {/* 模拟置灰预约按钮 */}
              <div className="p-3 rounded-2xl bg-white border border-[#E5E5EA] text-center space-y-1.5">
                <div className="text-[11px] text-[#8A8A8F]">客户视角预约按钮（免费版默认置灰不可点击）</div>
                <div className="h-10 rounded-xl bg-[#ECECEF] text-[#8A8A8F] text-xs font-bold flex items-center justify-center">
                  直接发起预约 (需开通付费版解锁)
                </div>
              </div>
            </div>

            {/* 预览窗底部：确认满意直接发送 */}
            <div className="p-4 border-t border-[#E5E5EA] bg-white space-y-2 sticky bottom-0 z-20">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setIsPosterOpen(true);
                  }}
                  className="flex-1 h-11 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] text-[#1D1D1F] text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#ECECEF] transition-all"
                >
                  <ImageIcon size={14} />
                  <span>生成海报图片</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    handleSubmit();
                  }}
                  className="flex-1 h-11 rounded-xl bg-[#1D1D1F] text-white text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#343438] transition-all shadow-xs"
                >
                  <Share2 size={14} />
                  <span>满意，生成网页链接</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="w-full py-1 text-center text-xs text-[#8A8A8F] hover:text-[#1D1D1F]"
              >
                继续调整内容
              </button>
            </div>
          </div>
        </div>
      )}
      <PosterModal
        isOpen={isPosterOpen}
        onClose={() => setIsPosterOpen(false)}
        draft={posterDraft}
      />

      {/* 升级专业版介绍弹窗 */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-[#E5E5EA] shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#ECECEF] text-[#1D1D1F] flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <h3 className="font-bold text-base text-[#1D1D1F]">解锁 OnlyNail 专业版系统</h3>
            </div>

            <p className="text-xs text-[#48484D] leading-relaxed">
              免费版仅供轻量出单。开通专业版，拥有属于您的私域数字化阵地：
            </p>

            <div className="space-y-2 text-xs text-[#1D1D1F]">
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#F4C95D]">✓</span>
                <span><strong>永久存储专属服务库</strong>：不再反复敲字，一秒调用个性化价目。</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#F4C95D]">✓</span>
                <span><strong>客户直接在线预约</strong>：客户在报价单上直接点选时段付定金锁单。</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#F4C95D]">✓</span>
                <span><strong>美甲师专属主页与作品集</strong>：全面展现您的履历资质与空间环境。</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#F4C95D]">✓</span>
                <span><strong>客户档案与档期冲突检测</strong>：告别手工记账与撞期风险。</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E5E5EA] space-y-2">
              <div className="text-center text-xs font-semibold text-[#1D1D1F]">
                获取专属密钥激活微信小程序【OnlyNail】
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPromoModal(false);
                  navigate('/apply');
                }}
                className="w-full h-11 rounded-xl bg-[#1D1D1F] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#343438] active:scale-[0.99] transition-all shadow-xs"
              >
                <Sparkles size={14} className="text-[#F4C95D]" />
                <span>立即申请开通入驻 / 获取密钥</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPromoModal(false)}
                className="w-full py-1.5 text-xs text-[#6E6E73] hover:text-[#1D1D1F]"
              >
                暂时关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
