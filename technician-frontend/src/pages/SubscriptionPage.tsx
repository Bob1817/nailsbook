import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/base/Card';
import {
  PLAN_DEFINITIONS,
  getCurrentPlan,
  isTrialActive,
  getTrialDaysRemaining,
  getSubscriptionStatusLabel,
  TRIAL_DURATION_DAYS,
  type PlanDefinition,
} from '../services/subscription';

function formatPrice(price: number) {
  if (price === 0) return '免费';
  return `¥${price}`;
}

function PlanCard({
  plan,
  isCurrent,
  onSelect,
}: {
  plan: PlanDefinition;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const isPopular = plan.code === 'pro';

  return (
    <div
      className={`relative rounded-[24px] p-5 transition-all ${
        isCurrent
          ? 'bg-gradient-to-br from-[#FFF1F6] to-[#FFF8FA] ring-2 ring-[#FF5E93]'
          : 'bg-white ring-1 ring-[#f2e6ec]'
      } shadow-[0_12px_28px_rgba(36,27,41,0.06)]`}
    >
      {isPopular && (
        <span className="absolute -top-2.5 right-5 rounded-full bg-[#FF5E93] px-3 py-1 text-[11px] font-semibold text-white shadow-[0_4px_12px_rgba(255,94,147,0.3)]">
          最受欢迎
        </span>
      )}
      {isCurrent && (
        <span className="absolute -top-2.5 left-5 rounded-full bg-[#31B46C] px-3 py-1 text-[11px] font-semibold text-white">
          当前套餐
        </span>
      )}

      <div className="mt-2 mb-4">
        <h3 className="text-[18px] font-bold text-[#1f2230]">{plan.name}</h3>
        <div className="mt-2 flex items-end gap-1">
          <span className="text-[2.2rem] font-bold tracking-[-0.04em] text-[#1f2230]">
            {formatPrice(plan.price)}
          </span>
          {plan.price > 0 && (
            <span className="pb-1.5 text-[14px] text-[#7f7681]">/月</span>
          )}
        </div>
        {plan.maxCustomers !== null && (
          <p className="mt-1 text-[13px] text-[#a09aa2]">
            客户上限 {plan.maxCustomers} · 月单上限 {plan.maxMonthlyBookings}
          </p>
        )}
        {plan.maxCustomers === null && (
          <p className="mt-1 text-[13px] text-[#31B46C] font-medium">不限客户数和预约量</p>
        )}
      </div>

      <div className="space-y-2.5 mb-5">
        {plan.highlights.map((highlight) => (
          <div key={highlight} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EEF9F1]">
              <svg className="h-3 w-3 text-[#31B46C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span className="text-[13px] text-[#3c3440]">{highlight}</span>
          </div>
        ))}
      </div>

      {!isCurrent && (
        <button
          type="button"
          onClick={onSelect}
          className={`w-full min-h-[48px] rounded-[16px] text-[14px] font-semibold transition-all active:scale-[0.98] ${
            isPopular
              ? 'bg-[#FF5E93] text-white shadow-[0_8px_20px_rgba(255,94,147,0.25)]'
              : 'bg-[#FFF1F6] text-[#FF5E93] ring-1 ring-[#FFD9E6]'
          }`}
        >
          {plan.price === 0 ? '切换到免费版' : '立即订阅'}
        </button>
      )}
      {isCurrent && (
        <div className="w-full min-h-[48px] rounded-[16px] bg-[#EEF9F1] text-center text-[14px] font-semibold text-[#31B46C] flex items-center justify-center">
          当前使用中
        </div>
      )}
    </div>
  );
}

export const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const { technician } = useAuth();
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanDefinition | null>(null);

  const subscription = technician?.subscription;
  const currentPlan = getCurrentPlan(subscription);
  const trialActive = isTrialActive(subscription);
  const trialDaysLeft = getTrialDaysRemaining(subscription);
  const statusLabel = getSubscriptionStatusLabel(subscription);

  function handleSelectPlan(plan: PlanDefinition) {
    setSelectedPlan(plan);
    setShowContactModal(true);
  }

  return (
    <div className="min-h-full bg-[#fff9f8] pb-8">
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[#f2e6ec]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f3f5] transition-colors active:bg-[#eee5e9]"
        >
          <svg className="h-5 w-5 text-[#3c3440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-[#1f2230]">我的订阅</h1>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {/* Current subscription status card */}
        <Card className="p-0 overflow-hidden shadow-[0_14px_32px_rgba(29,35,53,0.08)]">
          <div className="bg-gradient-to-r from-[#FF5E93] to-[#FF8AA0] px-5 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] text-white/70">当前套餐</p>
                <p className="mt-1 text-[22px] font-bold">{currentPlan.name}</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/15 backdrop-blur">
                <span className="text-[26px]">
                  {currentPlan.code === 'studio_plus' ? '👑' : currentPlan.code === 'pro' ? '💎' : '✨'}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                trialActive
                  ? 'bg-white/20 text-white'
                  : currentPlan.code === 'free'
                    ? 'bg-white/15 text-white/80'
                    : 'bg-white/20 text-white'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  trialActive ? 'bg-[#FFE066]' : currentPlan.code !== 'free' ? 'bg-[#7DFFB3]' : 'bg-white/60'
                }`} />
                {statusLabel}
              </span>
            </div>
          </div>

          {trialActive && (
            <div className="px-5 py-3.5 bg-[#FFF8E6] border-t border-[#FFE8B3]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-[#8B6914]">免费试用期</p>
                  <p className="text-[12px] text-[#A08030] mt-0.5">
                    试用期 {TRIAL_DURATION_DAYS} 天，到期后自动降级为免费版
                  </p>
                </div>
                <span className="text-[20px] font-bold text-[#C9860A]">
                  {trialDaysLeft}<span className="text-[12px] font-medium ml-0.5">天</span>
                </span>
              </div>
              <div className="mt-2.5 h-1.5 rounded-full bg-[#FFE8B3] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FFB84D] to-[#FF9500]"
                  style={{ width: `${Math.max(5, ((TRIAL_DURATION_DAYS - trialDaysLeft) / TRIAL_DURATION_DAYS) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {!trialActive && subscription?.expiredAt && currentPlan.code !== 'free' && (
            <div className="px-5 py-3 bg-[#FFF1F6] border-t border-[#FFD9E6]">
              <div className="flex items-center gap-2">
                <span className="text-[14px]">📅</span>
                <p className="text-[13px] text-[#8B3060]">
                  有效期至 {new Date(subscription.expiredAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Contact admin for subscription */}
        <Card className="p-4 shadow-[0_12px_28px_rgba(36,27,41,0.05)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#E8F5E9]">
              <span className="text-[22px]">💬</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#1f2230]">订阅或续费</p>
              <p className="mt-0.5 text-[12px] text-[#7f7681]">
                添加管理员微信，咨询套餐详情并完成订阅
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="shrink-0 min-h-[40px] rounded-[14px] bg-[#31B46C] px-4 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(49,180,108,0.25)] active:scale-[0.97]"
            >
              联系管理员
            </button>
          </div>
        </Card>

        {/* Plan comparison */}
        <div>
          <h2 className="text-[16px] font-semibold text-[#1f2230] mb-3">套餐对比</h2>
          <div className="space-y-4">
            {PLAN_DEFINITIONS.map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                isCurrent={currentPlan.code === plan.code}
                onSelect={() => handleSelectPlan(plan)}
              />
            ))}
          </div>
        </div>

        {/* FAQ */}
        <Card className="p-5 shadow-[0_12px_28px_rgba(36,27,41,0.05)]">
          <h3 className="text-[15px] font-semibold text-[#1f2230] mb-3">常见问题</h3>
          <div className="space-y-3">
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between py-2 text-[13px] font-medium text-[#3c3440]">
                新用户有免费试用吗？
                <svg className="h-4 w-4 text-[#a09aa2] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="pb-2 text-[12px] text-[#7f7681] leading-relaxed">
                是的，每位新注册的美甲师自动获得 {TRIAL_DURATION_DAYS} 天 Studio Plus 免费试用期，享受最高套餐全部功能。试用到期后自动降级为免费版。
              </p>
            </details>
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between py-2 text-[13px] font-medium text-[#3c3440]">
                如何订阅或续费？
                <svg className="h-4 w-4 text-[#a09aa2] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="pb-2 text-[12px] text-[#7f7681] leading-relaxed">
                目前暂不支持在线支付，请点击"联系管理员"添加微信，由管理员协助您完成订阅或续费。
              </p>
            </details>
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between py-2 text-[13px] font-medium text-[#3c3440]">
                到期后数据会丢失吗？
                <svg className="h-4 w-4 text-[#a09aa2] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="pb-2 text-[12px] text-[#7f7681] leading-relaxed">
                不会。降级后您的客户数据、订单记录等均会保留，只是部分高级功能将受限。升级套餐后即可恢复全部功能。
              </p>
            </details>
          </div>
        </Card>
      </div>

      {/* Contact admin modal */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-[28px] bg-white px-6 pb-8 pt-5 shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-[#1f2230]">联系管理员</h3>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f0f3] active:bg-[#e5e2e6]"
              >
                <svg className="h-4 w-4 text-[#6d6570]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedPlan && (
              <div className="mb-4 rounded-[18px] bg-[#FFF8FA] px-4 py-3 ring-1 ring-[#f2e6ec]">
                <p className="text-[13px] text-[#7f7681]">
                  咨询套餐：<span className="font-semibold text-[#FF5E93]">{selectedPlan.name}</span>
                  {selectedPlan.price > 0 && <span className="text-[#7f7681]"> · ¥{selectedPlan.price}/月</span>}
                </p>
              </div>
            )}

            <div className="rounded-[18px] bg-[#f7f9fc] p-4 mb-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#07C160]">
                  <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.295.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .246-.11.246-.245 0-.06-.024-.12-.04-.178l-.325-1.233a.49.49 0 01.177-.554C23.017 18.512 24 16.708 24 14.652c0-3.32-2.76-5.792-7.062-5.792v-.002z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#1f2230]">官方微信</p>
                  <p className="text-[12px] text-[#7f7681]">NailBook 管理员</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-[14px] bg-white px-4 py-3 ring-1 ring-[#e5e2e6]">
                <span className="text-[15px] font-mono font-semibold text-[#1f2230] tracking-wide">NailBook_Admin</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('NailBook_Admin');
                  }}
                  className="min-h-[36px] rounded-[10px] bg-[#FFF1F6] px-3 text-[12px] font-semibold text-[#FF5E93] active:bg-[#FFE4EE]"
                >
                  复制
                </button>
              </div>
            </div>

            <p className="text-center text-[12px] text-[#a09aa2] leading-relaxed">
              添加微信后请发送"订阅咨询"，管理员将在工作时间为您服务
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
