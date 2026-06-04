import React from 'react';
import { useParams } from 'react-router-dom';
import SubHeader from '../components/SubHeader';

const DOCS: Record<string, { title: string; body: string }> = {
  terms: { title: '用户协议', body: '使用本应用即表示你同意遵守相关法律法规与平台规则。平台仅提供预约与沟通工具，不参与线上支付与交易。' },
  privacy: { title: '隐私政策', body: '我们仅收集为提供服务所必需的信息（账号、预约与联系信息），用于预约管理与通知，不会向无关第三方出售你的个人信息。' },
};

const LegalDoc: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const doc = DOCS[type || 'terms'] || DOCS.terms;
  return (
    <div className="flex h-[100dvh] flex-col bg-[linear-gradient(180deg,#FFFDFD_0%,#F7F3F6_48%,#F2F6FB_100%)]">
      <SubHeader title={doc.title} />
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-28">
        <section className="rounded-[24px] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
          <p className="text-sm leading-7 text-gray-600 whitespace-pre-line">{doc.body}</p>
        </section>
      </div>
    </div>
  );
};
export default LegalDoc;
