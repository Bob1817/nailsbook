import React from "react";

const features = [
  {
    icon: "📅",
    title: "客户自助预约",
    desc: "客户从你的专属名片进入，选择服务、时间和上门地址，预约信息自动沉淀。",
  },
  {
    icon: "💬",
    title: "设计沟通与报价",
    desc: "客户发送灵感图或设计需求，美甲师快速报价，避免聊天记录里反复确认。",
  },
  {
    icon: "📍",
    title: "上门行程管理",
    desc: "按时间查看当日预约、地址和服务状态，让上门服务安排更从容。",
  },
  {
    icon: "👥",
    title: "私域客户档案",
    desc: "记录客户偏好、历史订单、常用地址和复购情况，把微信客户变成长期客户资产。",
  },
  {
    icon: "💳",
    title: "收入自动统计",
    desc: "预约完成后按报价金额计入收入，无需重复手动记账。",
  },
  {
    icon: "✨",
    title: "作品集展示",
    desc: "用更专业的作品页呈现风格、价格和服务能力，让客户更愿意预约。",
  },
];

const pains = ["微信聊天太散", "预约时间易冲突", "报价确认不清晰", "上门地址难管理", "收入统计靠手记"];
const steps = ["分享美甲师名片", "客户浏览作品", "提交预约/设计", "美甲师报价确认", "上门服务完成", "客户沉淀复购"];

const plans = [
  {
    name: "体验版",
    price: "¥0",
    note: "适合前期试用",
    items: ["基础名片", "作品展示", "预约表单", "基础客户列表"],
  },
  {
    name: "专业版",
    price: "¥39/月",
    note: "适合独立美甲师",
    hot: true,
    items: ["完整预约管理", "报价确认", "行程提醒", "客户档案", "收入统计"],
  },
  {
    name: "团队版",
    price: "¥99/月",
    note: "适合 2-5 人小团队",
    items: ["多美甲师账号", "团队订单视图", "客户分配", "经营数据看板"],
  },
];

function runLandingPageSmokeTests() {
  if (typeof console === "undefined") return;
  console.assert(features.length === 6, "features should contain 6 items");
  console.assert(steps.length === 6, "steps should contain 6 items");
  console.assert(plans.some((plan) => plan.hot), "one pricing plan should be marked as recommended");
  console.assert(plans.every((plan) => Array.isArray(plan.items) && plan.items.length > 0), "each plan should have feature items");
}

runLandingPageSmokeTests();

function IconBadge({ children, dark = false }) {
  return (
    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${dark ? "bg-white/15 text-white" : "bg-[#FFE8EC] text-[#EF7F98]"}`}>
      {children}
    </span>
  );
}

function AppPreview() {
  return (
    <div className="relative mx-auto w-[320px] rounded-[44px] border-[10px] border-[#2B2023] bg-[#FFF8F6] p-4 shadow-2xl">
      <div className="absolute left-1/2 top-2 h-6 w-24 -translate-x-1/2 rounded-full bg-[#2B2023]" />
      <div className="mt-6 rounded-[30px] bg-gradient-to-b from-[#FFE8EC] to-[#FFFDFB] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#A57972]">今日经营</p>
            <h3 className="mt-1 text-xl font-bold text-[#2B2023]">Hi，Anna</h3>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EF7F98] text-xl text-white">✨</div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="text-xs text-[#A57972]">今日预约</p>
            <p className="mt-2 text-2xl font-bold text-[#2B2023]">4</p>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="text-xs text-[#A57972]">本月收入</p>
            <p className="mt-2 text-2xl font-bold text-[#2B2023]">¥8.6k</p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl bg-[#2B2023] p-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-80">下一单</span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs">待出发</span>
          </div>
          <p className="mt-3 text-lg font-semibold">14:30 小鹿 · 法式晕染</p>
          <p className="mt-2 text-xs text-white/70">杭州滨江 · 预计服务 120 分钟</p>
        </div>

        <div className="mt-4 space-y-3">
          {["客户发来新设计需求", "待确认报价 ¥268", "明日还有 3 个预约"].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl bg-white p-3 text-sm text-[#4B3B3D] shadow-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFE8EC] text-xs text-[#EF7F98]">✓</span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NailBookLanding() {
  return (
    <main className="min-h-screen bg-[#FFF7F5] text-[#2B2023]">
      <section className="relative overflow-hidden px-5 py-5 md:px-10 lg:px-16">
        <div className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full bg-[#FFDDE5] blur-3xl" />
        <div className="absolute right-0 top-20 h-[420px] w-[420px] rounded-full bg-[#FFEACB] blur-3xl" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/80 bg-white/75 px-5 py-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EF7F98] text-xl text-white">✦</div>
            <div>
              <div className="text-lg font-black tracking-[0.18em]">NAILBOOK</div>
              <div className="text-xs text-[#A57972]">独立美甲师经营工具</div>
            </div>
          </div>

          <div className="hidden items-center gap-9 text-sm font-medium text-[#69565A] md:flex">
            <a href="#audience">适合谁</a>
            <a href="#features">核心功能</a>
            <a href="#flow">预约流程</a>
            <a href="#pricing">订阅价格</a>
          </div>

          <button className="rounded-full bg-[#EF7F98] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:-translate-y-0.5">
            立即登录
          </button>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-[fadeIn_0.6s_ease-out]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F6C6D0] bg-white/70 px-4 py-2 text-sm font-bold text-[#EF6F8B]">
              <span>✓</span> 不抽成 · 不强制线上支付 · 订阅制工具
            </div>

            <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[1.08] tracking-tight md:text-7xl">
              给独立上门美甲师的<span className="text-[#EF7F98]">客户预约</span>与私域经营系统
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-9 text-[#6D5C60]">
              从作品展示、客户预约、设计沟通、报价确认，到上门行程与收入统计，帮你把微信里的零散客户沉淀成长期客户资产。
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button className="group flex items-center gap-2 rounded-full bg-[#2B2023] px-7 py-4 text-base font-bold text-white shadow-xl transition hover:-translate-y-0.5">
                创建我的美甲师名片 <span className="transition group-hover:translate-x-1">→</span>
              </button>
              <button className="rounded-full border border-[#F1CDD1] bg-white/70 px-7 py-4 text-base font-bold text-[#2B2023]">
                查看功能演示
              </button>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
              {["预约不漏单", "报价有记录", "客户可复购"].map((item) => (
                <div key={item} className="rounded-2xl bg-white/70 p-4 text-center text-sm font-bold text-[#6D5C60] shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="animate-[fadeIn_0.8s_ease-out]">
            <AppPreview />
          </div>
        </div>
      </section>

      <section id="audience" className="px-5 py-12 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl rounded-[40px] bg-white p-8 shadow-sm md:p-12">
          <p className="text-sm font-black tracking-[0.28em] text-[#EF7F98]">WHY NAILBOOK</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight md:text-5xl">不是再做一个平台，而是帮美甲师管理自己的客户。</h2>

          <div className="mt-10 grid gap-5 md:grid-cols-5">
            {pains.map((pain) => (
              <div key={pain} className="rounded-3xl border border-[#F8DCE1] bg-[#FFF8F6] p-5">
                <IconBadge>☆</IconBadge>
                <p className="mt-4 font-bold text-[#4B3B3D]">{pain}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 md:px-10 lg:px-16" id="features">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black tracking-[0.28em] text-[#EF7F98]">FEATURES</p>
              <h2 className="mt-4 text-3xl font-black md:text-5xl">围绕上门美甲真实流程设计</h2>
            </div>
            <p className="max-w-xl text-base leading-8 text-[#6D5C60]">
              从接单前的门面建立，到收款后的复购沉淀，每个模块都服务于独立美甲师的日常经营。
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-[32px] border border-[#F7DCE0] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <IconBadge>{feature.icon}</IconBadge>
                <h3 className="mt-6 text-xl font-black">{feature.title}</h3>
                <p className="mt-3 leading-7 text-[#6D5C60]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="flow" className="px-5 py-12 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl rounded-[44px] bg-[#2B2023] p-8 text-white md:p-12">
          <p className="text-sm font-black tracking-[0.28em] text-[#FFB8C6]">FLOW</p>
          <h2 className="mt-4 text-3xl font-black md:text-5xl">从一次分享，到一次稳定复购</h2>

          <div className="mt-10 grid gap-4 md:grid-cols-6">
            {steps.map((step, index) => (
              <div key={step} className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EF7F98] text-sm font-black">{index + 1}</div>
                <p className="mt-5 text-sm font-bold leading-6 text-white/90">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-5 py-12 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-black tracking-[0.28em] text-[#EF7F98]">PRICING</p>
            <h2 className="mt-4 text-3xl font-black md:text-5xl">订阅制，不抽成</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-8 text-[#6D5C60]">
              前期不强制平台支付，客户定金与尾款可通过微信等线下方式完成，系统负责管理预约、报价、客户和收入记录。
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.name} className={`relative rounded-[34px] border bg-white p-7 shadow-sm ${plan.hot ? "border-[#EF7F98] ring-4 ring-[#FFE1E8]" : "border-[#F7DCE0]"}`}>
                {plan.hot && <div className="absolute right-6 top-6 rounded-full bg-[#EF7F98] px-3 py-1 text-xs font-bold text-white">推荐</div>}
                <h3 className="text-2xl font-black">{plan.name}</h3>
                <p className="mt-2 text-sm text-[#A57972]">{plan.note}</p>
                <div className="mt-6 text-4xl font-black">{plan.price}</div>

                <div className="mt-7 space-y-3">
                  {plan.items.map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-[#5D4B4E]">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFE8EC] text-xs text-[#EF7F98]">✓</span>
                      {item}
                    </div>
                  ))}
                </div>

                <button className={`mt-8 w-full rounded-full px-5 py-4 font-bold ${plan.hot ? "bg-[#EF7F98] text-white" : "bg-[#FFF1F4] text-[#2B2023]"}`}>
                  开始使用
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 pt-12 md:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 rounded-[44px] bg-gradient-to-r from-[#EF7F98] to-[#F5B16E] p-8 text-white md:flex-row md:p-12">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold opacity-90">📱 WebApp 优先，手机端体验优先</p>
            <h2 className="mt-4 text-3xl font-black md:text-5xl">现在开始，把客户经营变简单。</h2>
          </div>
          <button className="rounded-full bg-white px-7 py-4 font-black text-[#EF7F98] shadow-lg">立即创建名片</button>
        </div>
      </section>
    </main>
  );
}
