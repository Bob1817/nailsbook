import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SubHeader from '../components/SubHeader';

const FAQS: { q: string; a: string }[] = [
  { q: '如何绑定美甲师？', a: '通过美甲师分享的邀请链接进入并完成注册即可自动绑定；已注册用户可在【我的】页面点击「绑定新美甲师」，输入美甲师提供的邀请码完成绑定。' },
  { q: '如何发起预约？', a: '在【预约】页面新建预约，选择已绑定的美甲师、服务时间与地址后提交，等待美甲师报价确认即可。' },
  { q: '定金是如何处理的？', a: '平台不内置线上支付，定金通过线下方式支付。支付后在订单中标记「已付定金」，仅作状态记录。' },
  { q: '如何提交设计需求？', a: '在【设计】页面上传你喜欢的款式图片并填写描述，提交给美甲师报价，确认后可转为预约。' },
  { q: '可以绑定多个美甲师吗？', a: '可以。你可以绑定多位美甲师，并在【我的】页面设置默认美甲师，预约时也可选择不同的美甲师。' },
];

const cardClass = 'rounded-[24px] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5 overflow-hidden';

const HelpFeedback: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="flex h-[100dvh] flex-col bg-[linear-gradient(180deg,#FFFDFD_0%,#F7F3F6_48%,#F2F6FB_100%)]">
      <SubHeader title="帮助与反馈" />
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 pb-24">
        {/* 常见问题 */}
        <div>
          <h2 className="mb-3 px-1 text-[15px] font-semibold text-gray-900">常见问题</h2>
          <section className={cardClass}>
            {FAQS.map((faq, i) => {
              const expanded = open === i;
              return (
                <div key={faq.q} className={i < FAQS.length - 1 ? 'border-b border-gray-50' : ''}>
                  <button type="button" onClick={() => setOpen(expanded ? null : i)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left active:bg-gray-50">
                    <span className="text-[15px] text-gray-800">{faq.q}</span>
                    <svg className={`h-4 w-4 shrink-0 text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expanded && <p className="px-5 pb-4 text-sm leading-6 text-gray-500">{faq.a}</p>}
                </div>
              );
            })}
          </section>
        </div>

        {/* 反馈 / 联系 */}
        <div>
          <h2 className="mb-3 px-1 text-[15px] font-semibold text-gray-900">需要帮助？</h2>
          <section className={cardClass}>
            <button type="button" onClick={() => navigate('/chat')} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left active:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-[#FF6B8A]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </span>
                <div>
                  <p className="text-[15px] text-gray-800">联系我的美甲师</p>
                  <p className="mt-0.5 text-xs text-gray-400">预约、款式等问题可直接沟通</p>
                </div>
              </div>
              <svg className="h-5 w-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </section>
          <p className="mt-3 px-1 text-xs leading-5 text-gray-400">更多问题可在与美甲师的聊天中咨询，我们会持续完善帮助内容。</p>
        </div>
      </div>
    </div>
  );
};

export default HelpFeedback;
