import React, { useState } from 'react';
import { useToast } from '../components/feedback/ToastProvider';
import { SubPageHeader } from '../components/SubPageHeader';

const SUPPORT_PHONE = '400-800-1234';
const SUPPORT_WECHAT = 'nailbook-service';

const FAQS: { q: string; a: string }[] = [
  {
    q: '客户如何绑定我？',
    a: '在【我的】页面找到你的专属邀请码或分享链接，发送给客户。客户注册时填写邀请码，或直接通过链接进入即可自动绑定。',
  },
  {
    q: '预约的状态流转是怎样的？',
    a: '客户发起预约后为「待报价」，你报价后变为「待确认」，客户确认并线下支付定金后进入「待上门/待到店」，服务开始为「服务中」，完成后为「已完成」。',
  },
  {
    q: '定金是如何处理的？',
    a: '系统不内置线上支付，定金通过线下方式收取。客户支付后在订单中标记「定金已付」，仅作状态记录。',
  },
  {
    q: '如何让作品出现在客户首页推荐？',
    a: '在【作品管理】中将作品设为「精品」，精品作品会展示在客户端首页的推荐位。',
  },
  {
    q: '上门与到店服务如何设置？',
    a: '在【我的】-【服务类型设置】中开启上门或到店，并在【上门设置】「店铺管理」中完善服务区域与门店信息。',
  },
];

const HelpFeedbackPage: React.FC = () => {
  const toast = useToast();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const copyWechat = () => {
    void navigator.clipboard.writeText(SUPPORT_WECHAT).then(() => toast.success('客服微信号已复制'));
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[#fff9f8]">
      <SubPageHeader title="帮助与反馈" />
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* 常见问题 */}
        <h2 className="px-1 text-[15px] font-semibold text-[#1f2230]">常见问题</h2>
        <section className="mt-3 overflow-hidden rounded-[24px] bg-white shadow-[0_18px_36px_rgba(36,27,41,0.05)]">
          {FAQS.map((faq, index) => {
            const open = openIndex === index;
            return (
              <div key={faq.q} className={index === FAQS.length - 1 ? '' : 'border-b border-[#f6eef2]'}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left active:bg-[#fff7fa]"
                >
                  <span className="text-[15px] text-[#3c3440]">{faq.q}</span>
                  <svg
                    className={`h-4 w-4 shrink-0 text-[#c9bec6] transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {open && (
                  <p className="px-5 pb-4 text-sm leading-6 text-[#716776]">{faq.a}</p>
                )}
              </div>
            );
          })}
        </section>

        {/* 联系客服 */}
        <h2 className="mt-6 px-1 text-[15px] font-semibold text-[#1f2230]">联系客服</h2>
        <section className="mt-3 overflow-hidden rounded-[24px] bg-white shadow-[0_18px_36px_rgba(36,27,41,0.05)]">
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="flex items-center justify-between gap-3 border-b border-[#f6eef2] px-5 py-4 active:bg-[#fff7fa]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#fff1f6] text-lg">📞</span>
              <div>
                <p className="text-[15px] text-[#3c3440]">客服电话</p>
                <p className="mt-0.5 text-xs text-[#a89ba3]">{SUPPORT_PHONE}</p>
              </div>
            </div>
            <span className="text-xs font-medium text-[#FF5E93]">拨打</span>
          </a>
          <button
            type="button"
            onClick={copyWechat}
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left active:bg-[#fff7fa]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#fff1f6] text-lg">💬</span>
              <div>
                <p className="text-[15px] text-[#3c3440]">客服微信</p>
                <p className="mt-0.5 text-xs text-[#a89ba3]">{SUPPORT_WECHAT}</p>
              </div>
            </div>
            <span className="text-xs font-medium text-[#FF5E93]">复制</span>
          </button>
        </section>
        <p className="mt-3 px-1 text-xs leading-5 text-[#a89ba3]">客服工作时间：每日 9:00 - 21:00</p>
      </div>
    </div>
  );
};

export default HelpFeedbackPage;
