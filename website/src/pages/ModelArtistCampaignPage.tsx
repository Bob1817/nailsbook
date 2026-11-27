import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  Settings,
  Headphones,
  Sparkles,
  ChevronRight,
  Eye,
  Check,
  X,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import ScanQrModal from '../components/ScanQrModal'
import { Meta } from '../components/Meta'
import { submitArtistApplication } from '../services/api'

const formSchema = z.object({
  name: z.string().trim().min(1, '请输入您的称呼或姓名').max(30, '姓名过长'),
  phone: z
    .string()
    .trim()
    .regex(/^1\d{10}$/, '请输入正确的11位手机号码'),
  wechat: z.string().trim().min(1, '请输入您的微信号便于对接').max(50, '微信号过长'),
  city: z.string().trim().min(1, '请输入所在城市').max(50, '城市过长'),
  shopName: z.string().trim().min(1, '请输入工作室或店铺名称/独立上门').max(50, '名称过长'),
  experience: z.string().trim().max(50, '年限过长').optional().or(z.literal('')),
  note: z.string().trim().max(300, '备注过长').optional().or(z.literal('')),
})

type FormData = z.infer<typeof formSchema>

export default function ModelArtistCampaignPage() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [activeCaseTab, setActiveCaseTab] = useState(0)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [scan, setScan] = useState<'try' | 'follow' | 'artist' | null>(null)
  // 活动申请前置：官网无法直接校验小程序注册状态，这里用显式确认门——
  // 未勾选“我已完成免费注册”时提交按钮不可用；点“去免费注册”打开扫码弹窗。
  const [registered, setRegistered] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      wechat: '',
      city: '',
      shopName: '',
      experience: '',
      note: '',
    },
  })

  const onSubmit = async (values: FormData) => {
    if (!registered) return
    if (submitting) return
    setSubmitting(true)
    setErrorMsg('')
    try {
      const combinedNote = [
        '【前期 1 对 1 指导活动申请】',
        `工作室/品牌: ${values.shopName}`,
        values.experience ? `从业年限: ${values.experience}` : null,
        values.note ? `申请理由/痛点: ${values.note}` : null,
      ]
        .filter(Boolean)
        .join(' | ')

      await submitArtistApplication({
        name: values.name,
        phone: values.phone,
        wechat: values.wechat || '',
        city: values.city,
        serviceMode: 'model_artist',
        experience: values.experience || undefined,
        specialty: values.shopName,
        note: combinedNote,
      })

      setSubmitted(true)
    } catch (err: unknown) {
      const errRes = err as { response?: { data?: { message?: string } } }
      const msg = errRes?.response?.data?.message || '提交失败，请稍后重试或直接联系客服微信'
      setErrorMsg(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const perks = [
    {
      icon: Settings,
      title: '官方 1 对 1 指导：全程协助配置账号',
      desc: '资深运营专员全程 1 对 1 手把手指导，协助录入服务价目表、作品主页、店铺导航与经营时间，为您定制最顺手的预约与报价流程，直接上手。',
      tag: '核心特权',
    },
    {
      icon: Sparkles,
      title: '微信接单与快捷报价实操带教',
      desc: '手把手指导如何 10 秒组合生成高逼格微信报价长图、如何引导熟客微信自助预约，减少反复沟通成本。',
      tag: '省心提效',
    },
    {
      icon: Gift,
      title: '赠首年高阶版（价值 ¥948/年）',
      desc: '入选即赠首年高阶版：智能预约排期、快捷报价单、客户档案记录、经营账本与数据分析全量开放，到期可按需续费或切回基础版。',
      tag: '高值扶持',
    },
    {
      icon: Headphones,
      title: '专属运营群与产品经理直通车',
      desc: '建立 1 对 1 专属指导服务群，配置交付后持续在线答疑，您在日常使用中提出的痛点需求，优先安排排期研发。',
      tag: '持续护航',
    },
  ]

  const showcaseCases = [
    {
      id: 'artist-home',
      tabName: '美甲师主页与作品',
      badge: '主页包装 · 精选作品',
      title: '专属品牌主页与精选作品集全套代录',
      desc: '官方协助美甲师拍摄或整理日常美甲作品，提炼专属主理人风格标签，精选 3 款主推设计进行视觉包装。客户打开即可大图查看看法式、猫眼、手绘等工艺细节，并直接一键预约同款。',
      images: [
        {
          src: '/images/campaign-cases/case-artist-home.webp',
          alt: '演示样板间主页',
          caption: '美甲师主页（主理人形象、工作室门头、推荐款式）',
        },
        {
          src: '/images/campaign-cases/case-work-detail.webp',
          alt: '作品详情与一键预约',
          caption: '作品详情（高清细节、明码标价、耗时预估、同款预约）',
        },
      ],
      highlights: [
        '主推作品精细化视觉包装，提升主理人专业形象',
        '服务时长与标准价格透明展示，减少微信反复咨询',
        '客户直达一键「预约同款」，成交转化率显著提升',
      ],
    },
    {
      id: 'services-shop',
      tabName: '服务价目与店铺指引',
      badge: '规范分类 · 到店指引',
      title: '标准化服务价目与工作室到店导航',
      desc: '专人 1 对 1 协助将美甲师的服务项目规范录入后台：从纯色、猫眼、建构延长到各类卸甲修型，时长与阶梯价格清晰明了。同时配置详细工作室环境照与图文到店指引。',
      images: [
        {
          src: '/images/campaign-cases/case-service-list.webp',
          alt: '服务价目管理',
          caption: '服务项目管理（清晰分类、服务时长、梯级定价）',
        },
        {
          src: '/images/campaign-cases/case-shop-home.webp',
          alt: '店铺主页与环境',
          caption: '店铺主页（真实环境照、营业时间、路线导航指引）',
        },
      ],
      highlights: [
        '全套服务品类与价格阶梯一键代录，省时省力',
        '支持到店与上门双轨服务形式灵活切换',
        '图文并茂的到店指引，客户不再迷路反复电话问路',
      ],
    },
    {
      id: 'quick-quote',
      tabName: '微信快捷报价单',
      badge: '成交神器 · 告别扯皮',
      title: '10秒出单：专业透明的微信快捷报价单',
      desc: '美甲师在微信与客户沟通时，最头疼“发图问价、反复算账”。使用 OnlyNail 快捷报价，几秒勾选款式、加固、彩绘、饰品与卸甲，一键生成极具质感的报价长图，微信直发。',
      images: [
        {
          src: '/images/campaign-cases/case-quick-quote.webp',
          alt: '快捷报价单预览',
          caption: '快捷报价单预览（明细清晰、定金核对、微信一键分享）',
        },
      ],
      highlights: [
        '10 秒快速组合计价，省去反复口头解释与计算',
        '生成带美甲师品牌的高清报价卡片长图',
        '客户查阅体验极佳，成交率与信任度翻倍',
      ],
    },
    {
      id: 'schedule-calendar',
      tabName: '智能预约日历',
      badge: '智能排期 · 杜绝撞单',
      title: '省心排期：自动化预约日历与接单看板',
      desc: '每日排期看板清晰罗列，空闲时段与已约档期一清二楚。新预约微信第一时间提醒，待办确认一目了然，智能锁定时间，彻底解决翻聊天记录撞单的尴尬。',
      images: [
        {
          src: '/images/campaign-cases/case-schedule-calendar.webp',
          alt: '预约日程看板',
          caption: '预约日程看板（每日档期时间轴、订单状态实时跟踪）',
        },
        {
          src: '/images/campaign-cases/case-booking-confirm.webp',
          alt: '预约确认',
          caption: '预约确认与定金核对（双向确认保障、预约不被鸽）',
        },
      ],
      highlights: [
        '自动识别档期冲突，杜绝同一时段重复预约',
        '临近预约微信自动提醒美甲师与客户双方',
        '支持灵活设置休息日与特定营业时间',
      ],
    },
    {
      id: 'customer-crm',
      tabName: '客户档案与代客记单',
      badge: '熟客维系 · 终身资产',
      title: '客户资产：档案沉淀与一键代客记单',
      desc: '针对习惯在微信直接约单的老客户，美甲师可直接手机 10 秒代客建单，自动记入系统排期。每次美甲记录指甲偏好、死皮情况、做过的款式，老客维系温暖贴心。',
      images: [
        {
          src: '/images/campaign-cases/case-customer-crm.webp',
          alt: '客户管理',
          caption: '客户管理（到店频次、偏好标签、消费美甲档案）',
        },
      ],
      highlights: [
        '熟客微信私聊时，美甲师 10 秒代客建单并锁定档期',
        '建立专属客户美甲档案，偏好习惯随手记',
        '客户画像长期沉淀，做美甲师自己的终身资产',
      ],
    },
  ]

  const requirements = [
    '具备独立执业能力的美甲师或美甲工作室主理人（到店或上门均可）；',
    '入选后请在首月内完成首次真实预约使用，指导围绕你的真实使用展开；',
    '日常有稳定的接单客流，愿意在日常接单排期与客户服务中真实使用 OnlyNail；',
    '愿意与产品团队保持沟通，分享真实的使用体验和改进建议。',
  ]

  return (
    <>
      <Meta
        title="官方 1 对 1 指导（前期活动）· OnlyNail"
        description="官方 1 对 1 指导是 OnlyNail 前期活动，为已注册美甲师提供一对一协助，名额有限；入选赠首年高阶版（价值 ¥948/年）。不参加活动不影响免费使用基础版。"
      />
      <NavBar />

      <main className="model-campaign-page">
        {/* Hero 区域 */}
        <section className="model-campaign-hero site-container">
          <div className="model-campaign-pill">
            <span className="pill-dot" />
            <span>前期活动 · 已注册美甲师可申请官方 1 对 1 指导 · 本批限 10 席</span>
          </div>

          <h1 className="model-campaign-title">
            官方 1 对 1 指导（前期活动）
            <br />
            <span>专人 1 对 1 手把手帮您理顺账号</span>
          </h1>

          <p className="model-campaign-subtitle">
            这是 OnlyNail 的前期活动：申请前请先完成免费注册；不参加活动也能正常免费使用基础版。
            <br />
            官方资深运营专员 1 对 1 手把手指导，协助梳理<strong>服务价目分类与作品包装</strong>，带教<strong>微信 10 秒快捷报价</strong>，赠<strong>首年高阶版（价值 ¥948/年）</strong>，到期可按需续费或切回基础版。
          </p>

          <div className="model-campaign-stats">
            <div className="stat-card">
              <span className="stat-num">1 对 1</span>
              <span className="stat-label">官方指导活动</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-card">
              <span className="stat-num">¥0</span>
              <span className="stat-label">首年高阶版 (省¥948)</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-card">
              <span className="stat-num">限 10 席</span>
              <span className="stat-label">本批名额有限</span>
            </div>
          </div>
        </section>

        {/* 权益卡片区域 */}
        <section className="model-campaign-perks site-container">
          <div className="section-head text-center">
            <p className="eyebrow">EXCLUSIVE PERKS</p>
            <h2>参加 1 对 1 指导活动，能得到哪些帮助？</h2>
            <p className="section-intro">除了系统本身，专人协助你把价目、作品与报价流程真正落地。</p>
          </div>

          <div className="perks-grid">
            {perks.map((p, idx) => {
              const Icon = p.icon
              return (
                <div key={idx} className="perk-card">
                  <div className="perk-card-header">
                    <div className="perk-icon-wrap">
                      <Icon size={24} />
                    </div>
                    <span className="perk-tag">{p.tag}</span>
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* 案例实景展示区域 */}
        <section className="model-campaign-showcase site-container">
          <div className="section-head text-center">
            <p className="eyebrow">REAL CONFIGURED CASES</p>
            <h2>指导效果示例 · 演示样板间已配置效果</h2>
            <p className="section-intro">
              以下为演示样板间的配置效果示例：价目、作品与预约流程都已理顺，免费注册后你也可以拥有自己的工作台。
            </p>
          </div>

          {/* 案例分类 Tabs */}
          <div className="showcase-tabs">
            {showcaseCases.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                className={`showcase-tab-btn ${activeCaseTab === idx ? 'active' : ''}`}
                onClick={() => setActiveCaseTab(idx)}
              >
                {c.tabName}
              </button>
            ))}
          </div>

          {/* 选中的案例卡片 */}
          {(() => {
            const currentCase = showcaseCases[activeCaseTab]
            return (
              <div className="showcase-card">
                <div className="showcase-info-col">
                  <div className="showcase-badge">
                    <Sparkles size={14} className="badge-sparkle" />
                    <span>{currentCase.badge}</span>
                  </div>
                  <h3>{currentCase.title}</h3>
                  <p className="showcase-desc">{currentCase.desc}</p>

                  <div className="showcase-highlights-list">
                    <h4>配置亮点与成效：</h4>
                    <ul>
                      {currentCase.highlights.map((hl, i) => (
                        <li key={i}>
                          <Check size={18} className="hl-check" />
                          <span>{hl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="showcase-cta-wrap">
                    <a href="#apply-form" className="site-button">
                      申请 1 对 1 指导
                      <ChevronRight size={16} />
                    </a>
                    <span className="showcase-cta-hint">申请前请先完成免费注册</span>
                  </div>
                </div>

                <div className="showcase-visuals-col">
                  <div className="mockups-container">
                    {currentCase.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="mockup-frame"
                        onClick={() => setPreviewImage(img.src)}
                        title="点击查看高清大图"
                      >
                        <div className="mockup-glass">
                          <img src={img.src} alt={img.alt} loading="lazy" />
                          <div className="mockup-overlay">
                            <span className="zoom-btn">
                              <Eye size={16} /> 点击放大查看
                            </span>
                          </div>
                        </div>
                        <span className="mockup-caption">{img.caption}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}
        </section>

        {/* 申请要求与流程 */}
        <section className="model-campaign-reqs site-container">
          <div className="reqs-wrapper">
            <div className="reqs-col">
              <p className="eyebrow">WHAT WE EXPECT</p>
              <h2>参与要求与日常活跃规则</h2>
              <p className="reqs-intro">
                不需要支付任何费用，我们看重的是您对美甲事业的热忱与真实的日常使用。
              </p>
              <ul className="reqs-list">
                {requirements.map((req, i) => (
                  <li key={i}>
                    <CheckCircle2 size={20} className="check-icon" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="steps-col">
              <p className="eyebrow">HOW IT WORKS</p>
              <h2>申请与指导流程</h2>
              <div className="steps-list">
                <div className="step-item">
                  <span className="step-index">01</span>
                  <div>
                    <h4>完成免费注册</h4>
                    <p>微信扫码免费注册，先开通自己的工作台（基础版永久免费）。</p>
                  </div>
                </div>
                <div className="step-item">
                  <span className="step-index">02</span>
                  <div>
                    <h4>提交活动申请</h4>
                    <p>填写下方简要信息，简述您的美甲经营情况。</p>
                  </div>
                </div>
                <div className="step-item">
                  <span className="step-index">03</span>
                  <div>
                    <h4>官方沟通确认</h4>
                    <p>运营人员将在 1 个工作日内与您取得联系，确认指导安排。</p>
                  </div>
                </div>
                <div className="step-item">
                  <span className="step-index">04</span>
                  <div>
                    <h4>开始 1 对 1 指导</h4>
                    <p>专人协助梳理价目与作品，带教微信快捷报价；入选即赠首年高阶版，物料随指导安排寄送。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 申请表单区域 */}
        <section id="apply-form" className="model-campaign-form-section site-container">
          <div className="form-card-container">
            <div className="form-card-header">
              <span className="form-badge">前期活动 · 本批限 10 席</span>
              <h2>申请官方 1 对 1 指导</h2>
              <p>申请前请先完成免费注册；注册后回到本页即可继续申请。名额有限（本批仅限 10 席），我们将按提交时间先后及匹配度安排 1 对 1 指导时间，入选即赠首年高阶版（价值 ¥948/年）。</p>
            </div>

            {/* 注册前置确认：活动只面向已注册美甲师 */}
            <div className="rounded-2xl border border-line bg-brand-bg p-4 sm:p-5 mb-5 text-left">
              <label className="flex items-start gap-2.5 text-sm font-bold text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={registered}
                  onChange={(e) => setRegistered(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                />
                <span>我已完成免费注册</span>
              </label>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                申请前请先完成免费注册；注册后回到本页即可继续申请。不参加活动也能正常免费使用基础版。
              </p>
              {!registered && (
                <button
                  type="button"
                  className="site-button small mt-3"
                  onClick={() => setScan('try')}
                >
                  还没注册？去免费注册
                </button>
              )}
            </div>

            {submitted ? (
              <div className="form-success-state">
                <div className="success-icon-wrap">
                  <CheckCircle2 size={48} />
                </div>
                <h3>活动申请已提交！</h3>
                <p>
                  专属运营将在 <strong>1 个工作日内</strong> 与您电话或微信取得联系，确认指导安排。
                  <br />
                  等待期间也可以直接使用工作台：基础版永久免费，不需要等确认结果。
                </p>
                <div className="success-actions">
                  <Link to="/demo" className="site-button">
                    先看看样板间
                  </Link>
                  <Link to="/" className="site-button secondary">
                    返回官网首页
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="model-campaign-form">
                {errorMsg && <div className="form-error-banner">{errorMsg}</div>}

                <div className="form-row two-col">
                  <div className="form-group">
                    <label>
                      称呼 / 姓名 <span className="req-star">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="如何称呼您，如：林苏 / 张美甲师"
                      {...register('name')}
                    />
                    {errors.name && <span className="field-error">{errors.name.message}</span>}
                  </div>

                  <div className="form-group">
                    <label>
                      联系手机号码 <span className="req-star">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="11位手机号（用于联系与确认指导安排）"
                      {...register('phone')}
                    />
                    {errors.phone && <span className="field-error">{errors.phone.message}</span>}
                  </div>
                </div>

                <div className="form-row two-col">
                  <div className="form-group">
                    <label>
                      所在城市 <span className="req-star">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="如：杭州市 西湖区"
                      {...register('city')}
                    />
                    {errors.city && <span className="field-error">{errors.city.message}</span>}
                  </div>

                  <div className="form-group">
                    <label>
                      微信号 <span className="req-star">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="便于专员加微信对接指导"
                      {...register('wechat')}
                    />
                    {errors.wechat && <span className="field-error">{errors.wechat.message}</span>}
                  </div>
                </div>

                <div className="form-row two-col">
                  <div className="form-group">
                    <label>
                      工作室/店铺名称或服务形式 <span className="req-star">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="如：你的工作室名称 / 个人独立上门"
                      {...register('shopName')}
                    />
                    {errors.shopName && (
                      <span className="field-error">{errors.shopName.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>从业年限（选填）</label>
                    <input
                      type="text"
                      placeholder="如：3年 / 5年以上"
                      {...register('experience')}
                    />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>现有预约方式 / 您期望解决的痛点（选填）</label>
                  <textarea
                    rows={3}
                    placeholder="如：目前全靠微信手动记录，经常撞档期，希望有系统自动排期和报价；或者您对系统的任何期待..."
                    {...register('note')}
                  />
                  {errors.note && <span className="field-error">{errors.note.message}</span>}
                </div>

                <div className="form-submit-wrap">
                  <button
                    type="submit"
                    disabled={!registered || submitting}
                    className="site-button submit-btn"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="spinner" />
                        正在提交申请...
                      </>
                    ) : (
                      <>
                        提交申请 · 申请官方 1 对 1 指导
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                  {!registered && (
                    <p className="privacy-hint">请先勾选“我已完成免费注册”再提交活动申请。</p>
                  )}
                  <p className="privacy-hint">
                    <ShieldCheck size={14} /> 您的个人隐私与联系信息受到严格保护，仅用于本次前期 1 对 1 指导活动对接。
                  </p>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* 图片放大查看 Lightbox */}
      {previewImage && (
        <div className="case-lightbox" onClick={() => setPreviewImage(null)}>
          <button
            type="button"
            className="lightbox-close-btn"
            onClick={() => setPreviewImage(null)}
            aria-label="关闭预览"
          >
            <X size={24} />
          </button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="全屏截图预览" />
          </div>
        </div>
      )}

      {scan && <ScanQrModal type={scan} onClose={() => setScan(null)} />}
      <SiteFooter />
    </>
  )
}
