import React, { useState } from 'react';
import { SubPageHeader } from '../components/SubPageHeader';

const APP_VERSION = '1.0.0';

const DOCS: { key: string; title: string; body: string }[] = [
  {
    key: 'terms',
    title: '用户协议',
    body: '欢迎使用本应用。你在使用过程中需遵守相关法律法规，对自己发布的作品、与客户的沟通及交易行为负责。平台仅提供预约管理与沟通工具，不参与线上支付与交易分成。继续使用即代表你同意本协议。',
  },
  {
    key: 'privacy',
    title: '隐私政策',
    body: '我们仅收集为提供服务所必需的信息（如账号、客户预约与联系信息），用于预约管理、消息通知与服务优化。我们不会向无关第三方出售你的个人信息。你可在「隐私设置」中控制对客户的展示方式。',
  },
];

const AboutPage: React.FC = () => {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="flex h-[100dvh] flex-col bg-[#fff9f8]">
      <SubPageHeader title="关于我们" />
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {/* 应用标识 */}
        <div className="flex flex-col items-center pt-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[linear-gradient(145deg,#FF6FA2_0%,#FF81A4_60%,#FFB387_100%)] text-4xl shadow-[0_16px_32px_rgba(255,95,134,0.25)]">
            💅
          </div>
          <h1 className="mt-4 text-[20px] font-semibold text-[#1f2230]">美甲师 Studio</h1>
          <p className="mt-1 text-xs text-[#a89ba3]">版本 {APP_VERSION}</p>
        </div>

        <p className="mt-6 px-2 text-center text-sm leading-6 text-[#716776]">
          专为独立上门美甲师打造的预约与客户管理工具，帮助你高效接单、管理行程与维护私域客户。
        </p>

        {/* 协议文档 */}
        <section className="mt-6 overflow-hidden rounded-[24px] bg-white shadow-[0_18px_36px_rgba(36,27,41,0.05)]">
          {DOCS.map((doc, index) => {
            const open = openKey === doc.key;
            return (
              <div key={doc.key} className={index === DOCS.length - 1 ? '' : 'border-b border-[#f6eef2]'}>
                <button
                  type="button"
                  onClick={() => setOpenKey(open ? null : doc.key)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left active:bg-[#fff7fa]"
                >
                  <span className="text-[15px] text-[#3c3440]">{doc.title}</span>
                  <svg
                    className={`h-4 w-4 shrink-0 text-[#c9bec6] transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {open && <p className="px-5 pb-4 text-sm leading-6 text-[#716776]">{doc.body}</p>}
              </div>
            );
          })}
        </section>

        <p className="mt-8 text-center text-xs text-[#c2b8c0]">© 2026 美甲师 Studio · 保留所有权利</p>
      </div>
    </div>
  );
};

export default AboutPage;
