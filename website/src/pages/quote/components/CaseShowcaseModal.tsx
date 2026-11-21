import React, { useState } from 'react';
import { X, Check, MapPin, Clock, ShieldCheck, Sparkles, Store } from 'lucide-react';
import type { QuoteServiceItem, TechnicianProfile } from '../quoteTypes';

export interface StylistCase {
  id: string;
  name: string;
  title: string;
  avatarText: string;
  badge: string;
  slogan: string;
  shopName: string;
  location: string;
  businessHours: string;
  serviceType: string;
  depositPolicy: string;
  warranty: string;
  works: {
    title: string;
    image: string;
    tag: string;
  }[];
  customPricingHighlight: {
    name: string;
    price: number;
    unit: string;
  }[];
  catalogOverrides: Partial<QuoteServiceItem>[];
  profileOverrides: Partial<TechnicianProfile>;
}

export const STYLIST_CASES: StylistCase[] = [
  {
    id: 'case_anna',
    name: 'Anna 敏敏',
    title: '日式健甲与本甲建构独立主理人',
    avatarText: 'A',
    badge: '日式极简 · 预约制',
    slogan: '一人一客沉浸式服务，专注自然甲平整建构与清透裸色',
    shopName: 'ANNA Atelier 裸肌美甲室',
    location: '上海 · 静安区常德路（静安寺地铁直达）',
    businessHours: '10:30 - 20:30 (周一店休)',
    serviceType: '实体独立工作室 · 单人单间',
    depositPolicy: '预约需预付 ¥50 诚意定金（结账时全额抵扣服务费）',
    warranty: '7天自然脱落免费修补 · 免费提供卸甲与指缘精华',
    works: [
      { title: '水光月光猫眼', image: '/portfolio/work1.jpg', tag: '日系晶石' },
      { title: '裸粉法式渐变', image: '/portfolio/work2.jpg', tag: '手工勾边' },
    ],
    customPricingHighlight: [
      { name: '日式本甲精致建构', price: 188, unit: '手' },
      { name: '冰透腮红 / 单色渐变', price: 20, unit: '指' },
      { name: '极细双拼法式', price: 48, unit: '手' },
    ],
    catalogOverrides: [
      { id: 'base_natural', price: 188 },
      { id: 'style_gradient', price: 20 },
      { id: 'style_french', price: 48 },
    ],
    profileOverrides: {
      name: 'Anna 敏敏',
      shopName: 'ANNA Atelier 裸肌美甲室',
      title: '日式健甲与本甲建构主理人',
      phone: '138****6688',
      wechat: 'anna_atelier_sh',
    },
  },
  {
    id: 'case_mori',
    name: 'Mori 茉莉',
    title: '先锋手绘与未来液态金属艺术家',
    avatarText: 'M',
    badge: '原创手绘 · 独立上门',
    slogan: '指尖的微型当代艺术画廊，不随波逐流的暗黑与高光质感',
    shopName: 'MORI NAILS 先锋视觉工作室',
    location: '北京 · 朝阳/海淀/东城（全城上门预约专线）',
    businessHours: '13:00 - 23:00 (支持夜间专属档期)',
    serviceType: '上门服务 · 携带全套消毒医用工具箱',
    depositPolicy: '预约需预付 ¥100 锁单定金（3公里内免路费）',
    warranty: '复杂手绘质保14天 · 支持来图 1:1 纯手工还原',
    works: [
      { title: '未来极光镀层短甲', image: '/portfolio/work4.jpg', tag: '银镜微光' },
      { title: '异形立体微雕', image: '/portfolio/work5.jpg', tag: '先锋暗黑' },
    ],
    customPricingHighlight: [
      { name: '全贴半贴定制延长', price: 268, unit: '手' },
      { name: '艺术微雕 / 复杂插画', price: 35, unit: '指' },
      { name: '镜面银粉 / 极光镀层', price: 40, unit: '手' },
    ],
    catalogOverrides: [
      { id: 'base_tips', price: 268 },
      { id: 'style_art_hand', price: 35 },
      { id: 'style_chrome', price: 40 },
    ],
    profileOverrides: {
      name: 'Mori 茉莉',
      shopName: 'MORI NAILS 先锋视觉',
      title: '独立上门手绘美甲艺术家',
      phone: '139****9911',
      wechat: 'mori_nails_art',
    },
  },
  {
    id: 'case_luna',
    name: 'Luna 露娜',
    title: '高定新娘与施华洛世奇奢华珠宝沙龙',
    avatarText: 'L',
    badge: '奢华婚甲 · 珠宝沙龙',
    slogan: '专为高定婚典、晚宴打造闪耀指尖，每一颗均严选奥地利水晶',
    shopName: 'LUNA HAUTE COUTURE 珠宝美甲沙龙',
    location: '杭州 · 滨江区星光大道高端会所',
    businessHours: '10:00 - 21:30 (一对一定制)',
    serviceType: '高端沙龙会所 · 专享下午茶与手部 SPA',
    depositPolicy: '婚甲定制需提前两周预约，预付 30% 档期预留金',
    warranty: '全包边封层 30 天质保 · 脱钻掉落终身免费修补',
    works: [
      { title: '施华洛世奇异形微雕', image: '/portfolio/work3.jpg', tag: '珠宝切面' },
      { title: '巴洛克重工满钻', image: '/portfolio/work7.jpg', tag: '高定新娘' },
    ],
    customPricingHighlight: [
      { name: '光疗纸托水晶延长', price: 368, unit: '手' },
      { name: '异形锆石 / 金属配件', price: 20, unit: '颗' },
      { name: '单指密集璀璨堆钻', price: 48, unit: '指' },
    ],
    catalogOverrides: [
      { id: 'base_sculpt', price: 368 },
      { id: 'acc_charm', price: 20 },
      { id: 'acc_full_gem', price: 48 },
    ],
    profileOverrides: {
      name: 'Luna 露娜',
      shopName: 'LUNA HAUTE 珠宝美甲',
      title: '高定婚典美甲主理人',
      phone: '137****3322',
      wechat: 'luna_haute_nail',
    },
  },
];

interface CaseShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (
    catalogUpdates: Partial<QuoteServiceItem>[],
    profileUpdates: Partial<TechnicianProfile>,
  ) => void;
}

export const CaseShowcaseModal: React.FC<CaseShowcaseModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('case_anna');
  const currentCase =
    STYLIST_CASES.find((c) => c.id === selectedCaseId) || STYLIST_CASES[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl border border-[var(--nb-line)] overflow-hidden">
        {/* 1. 顶部 Header */}
        <div className="px-5 py-4 border-b border-[var(--nb-line)] flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#F4C95D] uppercase tracking-wider mb-0.5">
              <Sparkles size={13} />
              <span>CASE SHOWCASE · 专属主页案例</span>
            </div>
            <h3 className="text-base font-black text-[var(--nb-ink)]">
              不同美甲师的专属主页与报价体系
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="w-8 h-8 rounded-full border border-[var(--nb-line)] flex items-center justify-center text-[var(--nb-secondary)] hover:bg-[var(--nb-pressed)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2. 美甲师切换 Tab */}
        <div className="px-5 pt-3 pb-2 bg-[var(--nb-page)] border-b border-[var(--nb-line)] flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {STYLIST_CASES.map((item) => {
            const isSelected = item.id === selectedCaseId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedCaseId(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? 'bg-[var(--nb-ink)] text-white shadow-xs'
                    : 'bg-white border border-[var(--nb-line)] text-[var(--nb-secondary)] hover:bg-[var(--nb-pressed)]'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-[#F4C95D] text-[var(--nb-ink)] flex items-center justify-center text-[10px] font-black">
                  {item.avatarText}
                </span>
                <span>{item.name}</span>
                <span className="text-[10px] font-normal opacity-80">· {item.badge.split('·')[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* 3. 案例专属页面详情区 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white">
          {/* 美甲师与店铺核心看板 (模拟客户看到的专属微主页头部) */}
          <div className="p-4 rounded-2xl bg-[var(--nb-page)] border border-[var(--nb-line)] relative overflow-hidden">
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 rounded-2xl bg-[var(--nb-ink)] text-[#F4C95D] flex items-center justify-center text-xl font-black shadow-xs shrink-0">
                  {currentCase.avatarText}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-base text-[var(--nb-ink)]">
                      {currentCase.shopName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--nb-ink)] text-[#F4C95D]">
                      {currentCase.badge}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--nb-secondary)] font-medium mt-0.5">
                    主理人：{currentCase.name} · {currentCase.title}
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-[var(--nb-muted)] leading-relaxed italic border-t border-[var(--nb-line)]/80 pt-2.5">
              “{currentCase.slogan}”
            </p>
          </div>

          {/* 店铺与服务专属信息 */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-[var(--nb-ink)] flex items-center gap-1.5">
              <Store size={14} className="text-[#F4C95D]" />
              <span>店铺专属信息与预约规则</span>
            </h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-white border border-[var(--nb-line)] flex items-start gap-2.5">
                <MapPin size={15} className="text-[var(--nb-secondary)] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[var(--nb-ink)]">服务坐标与方式：</span>
                  <span className="text-[var(--nb-secondary)] ml-1">{currentCase.location} ({currentCase.serviceType})</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[var(--nb-line)] flex items-start gap-2.5">
                <Clock size={15} className="text-[var(--nb-secondary)] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[var(--nb-ink)]">营业时间：</span>
                  <span className="text-[var(--nb-secondary)] ml-1">{currentCase.businessHours}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[var(--nb-line)] flex items-start gap-2.5">
                <ShieldCheck size={15} className="text-[var(--nb-secondary)] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[var(--nb-ink)]">定金与质保：</span>
                  <span className="text-[var(--nb-secondary)] ml-1">{currentCase.depositPolicy} · {currentCase.warranty}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 专属真实作品精选 */}
          <div>
            <h4 className="text-xs font-bold text-[var(--nb-ink)] mb-2.5 flex items-center justify-between">
              <span>主理人代表作实拍</span>
              <span className="text-[10px] text-[var(--nb-muted)]">真实作品画廊</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {currentCase.works.map((w, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[var(--nb-line)] overflow-hidden bg-[var(--nb-page)]"
                >
                  <div className="aspect-4/3 w-full overflow-hidden">
                    <img
                      src={w.image}
                      alt={w.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2.5 bg-white flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--nb-ink)] truncate">
                      {w.title}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-[var(--nb-page)] text-[var(--nb-secondary)] shrink-0 border border-[var(--nb-line)]">
                      {w.tag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 专属报价体系特色 */}
          <div>
            <h4 className="text-xs font-bold text-[var(--nb-ink)] mb-2.5 flex items-center justify-between">
              <span>专属工序与特色配价</span>
              <span className="text-[10px] text-[var(--nb-muted)]">美甲师专属标准</span>
            </h4>
            <div className="p-3 rounded-2xl bg-[var(--nb-page)] border border-[var(--nb-line)] space-y-2">
              {currentCase.customPricingHighlight.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1 border-b border-[var(--nb-line)]/60 last:border-0"
                >
                  <span className="text-[var(--nb-ink)] font-medium">{item.name}</span>
                  <div className="font-bold text-[var(--nb-ink)] tabular-nums">
                    <span className="text-sm font-black text-[#F4C95D]">¥{item.price}</span>
                    <span className="text-[10px] text-[var(--nb-muted)] font-normal ml-0.5">/{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. 底部操作栏 */}
        <div className="p-4 border-t border-[var(--nb-line)] bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="text-left">
            <div className="text-xs font-bold text-[var(--nb-ink)]">
              觉得这套定价适合您？
            </div>
            <div className="text-[10px] text-[var(--nb-muted)]">
              一键套用美甲师专属价目到您的工作台
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onApplyTemplate(currentCase.catalogOverrides, currentCase.profileOverrides);
              onClose();
            }}
            className="h-10 px-4 rounded-xl bg-[var(--nb-action)] text-white text-xs font-bold hover:bg-[var(--nb-action-pressed)] active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <Check size={14} />
            <span>套用此主理人模板</span>
          </button>
        </div>
      </div>
    </div>
  );
};
