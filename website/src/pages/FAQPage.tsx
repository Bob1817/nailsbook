import { useState } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { Meta } from '../components/Meta'

interface FAQItem {
  q: { zh: string; en: string }
  a: { zh: string; en: string }
}

const faqData: FAQItem[] = [
  {
    q: {
      zh: '贝美甲是什么？',
      en: 'What is BeiMeiJia?',
    },
    a: {
      zh: '贝美甲是一款专门为独立上门美甲师设计的客户预约与私域经营工具。它帮助你管理预约、作品展示、客户档案等，让你更专注于服务本身。',
      en: 'BeiMeiJia is a client booking and private domain management tool designed specifically for independent home service nail artists. It helps you manage bookings, showcase your work, and keep client records, allowing you to focus on your services.',
    },
  },
  {
    q: {
      zh: '如何申请成为贝美甲美甲师？',
      en: 'How do I become a BeiMeiJia artist?',
    },
    a: {
      zh: '你可以通过首页的「申请账号」按钮提交申请，我们会在 1-2 个工作日内审核并通过微信发送激活码。',
      en: 'You can submit an application via the "Apply Now" button on the homepage. We will review your application within 1-2 business days and send an activation code via WeChat.',
    },
  },
  {
    q: {
      zh: '贝美甲如何收费？',
      en: 'How much does BeiMeiJia cost?',
    },
    a: {
      zh: '贝美甲采用订阅制收费模式，不抽取任何交易佣金。具体价格方案将在产品正式发布时公布。',
      en: 'BeiMeiJia uses a subscription model and does not charge any transaction fees. Detailed pricing will be announced when the product officially launches.',
    },
  },
  {
    q: {
      zh: '我的客户数据安全吗？',
      en: 'Is my client data secure?',
    },
    a: {
      zh: '是的，你的所有数据都完全属于你。我们采用银行级加密技术保护你的数据安全。',
      en: 'Yes, all your data belongs to you. We use bank-level encryption to protect your data security.',
    },
  },
]

export default function FAQPage() {
  const { t, isZh } = useLang()
  const navigate = useNavigate()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <>
      <Meta title={t.faq.title} />
      <div className="min-h-screen bg-brand-bg">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4 md:px-10">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-ink-muted transition hover:text-brand active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight text-ink">{t.faq.title}</h1>
              <p className="text-[12px] text-ink-soft">{t.faq.subtitle}</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="mx-auto max-w-3xl px-5 py-8 md:px-10">
          <div className="space-y-3">
            {faqData.map((item, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-line bg-surface"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                  aria-expanded={openIndex === index}
                  aria-controls={`faq-content-${index}`}
                  id={`faq-button-${index}`}
                >
                  <span className="text-sm font-medium text-ink">
                    {isZh ? item.q.zh : item.q.en}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-ink-muted transition ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {openIndex === index && (
                  <div
                    id={`faq-content-${index}`}
                    role="region"
                    aria-labelledby={`faq-button-${index}`}
                    className="border-t border-line px-5 py-4"
                  >
                    <p className="text-sm text-ink-muted leading-relaxed">
                      {isZh ? item.a.zh : item.a.en}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
