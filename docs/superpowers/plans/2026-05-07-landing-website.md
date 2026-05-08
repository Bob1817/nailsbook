# NailBook Landing Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the landing site's broken styling, expand it into a mobile-first official website with role-based login guidance, and add role switching links on the technician and client login pages.

**Architecture:** Keep `landing-frontend` as a small route-driven React/Vite app with page-level components instead of introducing new abstractions. Use static content for the new marketing pages, preserve explicit cross-app URL jumps for role-based login, and make the login-page changes as narrow UI additions inside the existing page files.

**Tech Stack:** React, TypeScript, Vite, React Router, Tailwind CSS 4, Lucide React

---

## File Map

- Modify: `landing-frontend/src/App.tsx`
- Modify: `landing-frontend/src/index.css`
- Modify: `landing-frontend/src/pages/LandingPage.tsx`
- Modify: `landing-frontend/src/pages/RoleSelectPage.tsx`
- Create: `landing-frontend/src/pages/ArtistJoinPage.tsx`
- Create: `landing-frontend/src/pages/ShowcasePage.tsx`
- Modify: `technician-frontend/src/pages/Login.tsx`
- Modify: `client-frontend/src/pages/Login.tsx`

## Task 1: Repair the landing styling foundation

**Files:**
- Modify: `landing-frontend/src/index.css`
- Verify: `landing-frontend/src/main.tsx`
- Verify: `landing-frontend/vite.config.ts`

- [ ] **Step 1: Reproduce the styling problem in the landing app**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/landing-frontend
npm run dev
```

Expected: the page loads, but one or more Tailwind-driven sections render with missing utility styling or inconsistent custom global styles.

- [ ] **Step 2: Confirm the CSS entrypoint and plugin wiring are already present**

Inspect:

```tsx
// landing-frontend/src/main.tsx
import App from './App.tsx'
import './index.css'
```

```ts
// landing-frontend/vite.config.ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

Expected: no change needed here unless the import order or plugin registration was accidentally altered.

- [ ] **Step 3: Rewrite the landing global stylesheet into a stable Tailwind 4 + custom-token base**

Replace the current stylesheet with a version that keeps `@import "tailwindcss";`, defines a small token set, and only adds global classes actually consumed by the landing pages.

```css
@import "tailwindcss";

@theme {
  --color-brand-ink: #17161f;
  --color-brand-rose: #ff6b8a;
  --color-brand-rose-soft: #fff1f4;
  --color-brand-rose-deep: #e85b7b;
  --color-brand-cream: #fffaf8;
  --color-brand-sand: #fff4ef;
  --color-brand-muted: #6b6674;
  --color-brand-border: rgba(23, 22, 31, 0.08);
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body,
#root {
  margin: 0;
  min-height: 100vh;
  min-height: 100dvh;
}

body {
  font-family: "SF Pro Display", "SF Pro Text", "PingFang SC", "Helvetica Neue", sans-serif;
  background:
    radial-gradient(circle at top right, rgba(255, 182, 198, 0.28), transparent 28rem),
    linear-gradient(180deg, #fffaf8 0%, #fff4f6 42%, #fffdfc 100%);
  color: #17161f;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a,
button,
input,
textarea,
select {
  -webkit-tap-highlight-color: transparent;
}

.landing-shell {
  position: relative;
  isolation: isolate;
}

.landing-shell::before,
.landing-shell::after {
  content: "";
  position: fixed;
  inset: auto;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(80px);
  z-index: -1;
}

.landing-shell::before {
  top: 4rem;
  right: -5rem;
  width: 18rem;
  height: 18rem;
  background: rgba(255, 166, 188, 0.28);
}

.landing-shell::after {
  bottom: 2rem;
  left: -4rem;
  width: 14rem;
  height: 14rem;
  background: rgba(255, 214, 196, 0.32);
}

.glass-panel {
  background: rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}

.editorial-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(23, 22, 31, 0.06);
  box-shadow: 0 24px 60px rgba(34, 24, 32, 0.08);
}

.touch-target {
  min-height: 44px;
}
```

- [ ] **Step 4: Build the landing app to confirm the stylesheet still compiles**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/landing-frontend
npm run build
```

Expected:

```text
vite v8.x building client environment for production...
✓ built in ...
```

- [ ] **Step 5: Commit**

If this workspace is attached to a valid git root, commit:

```bash
git add landing-frontend/src/index.css
git commit -m "fix: restore landing frontend style foundation"
```

## Task 2: Add the official-website routes and page shells

**Files:**
- Modify: `landing-frontend/src/App.tsx`
- Create: `landing-frontend/src/pages/ArtistJoinPage.tsx`
- Create: `landing-frontend/src/pages/ShowcasePage.tsx`

- [ ] **Step 1: Update the landing router to include the new marketing routes**

Change `landing-frontend/src/App.tsx` to register all four pages.

```tsx
import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import RoleSelectPage from './pages/RoleSelectPage'
import ArtistJoinPage from './pages/ArtistJoinPage'
import ShowcasePage from './pages/ShowcasePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/role-select" element={<RoleSelectPage />} />
      <Route path="/artist-join" element={<ArtistJoinPage />} />
      <Route path="/showcase" element={<ShowcasePage />} />
    </Routes>
  )
}
```

- [ ] **Step 2: Create the artist join page shell first**

Create `landing-frontend/src/pages/ArtistJoinPage.tsx` with a mobile-first page, a compact hero, and a submit-success local state.

```tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type JoinForm = {
  name: string
  phone: string
  city: string
  serviceMode: string
  experience: string
  style: string
  note: string
}

const initialForm: JoinForm = {
  name: '',
  phone: '',
  city: '',
  serviceMode: '',
  experience: '',
  style: '',
  note: '',
}

export default function ArtistJoinPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <main className="landing-shell min-h-screen px-4 pb-10 pt-4 sm:px-6">
      {/* header, intro copy, form card, success state, and back/login links */}
    </main>
  )
}
```

- [ ] **Step 3: Create the showcase page shell first**

Create `landing-frontend/src/pages/ShowcasePage.tsx` with static arrays for featured works, service tags, and two CTA blocks.

```tsx
import { Link } from 'react-router-dom'

const featuredWorks = [
  { title: '轻透腮红法式', tag: '通勤', note: '温柔裸粉系，适合日常复约' },
  { title: '镜面金属渐变', tag: '派对', note: '强调质感与拍照表现' },
  { title: '立体花卉雕饰', tag: '定制', note: '高客单作品，适合预约沟通' },
]

export default function ShowcasePage() {
  return (
    <main className="landing-shell min-h-screen px-4 pb-10 pt-4 sm:px-6">
      {/* header, tags, cards, process copy, login CTA, join CTA */}
    </main>
  )
}
```

- [ ] **Step 4: Build the landing app and verify the new routes compile**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/landing-frontend
npm run build
```

Expected: successful build with new page chunks referenced from the generated bundle.

- [ ] **Step 5: Commit**

```bash
git add landing-frontend/src/App.tsx landing-frontend/src/pages/ArtistJoinPage.tsx landing-frontend/src/pages/ShowcasePage.tsx
git commit -m "feat: add landing marketing routes"
```

## Task 3: Rebuild the homepage and refine the role-selection page

**Files:**
- Modify: `landing-frontend/src/pages/LandingPage.tsx`
- Modify: `landing-frontend/src/pages/RoleSelectPage.tsx`

- [ ] **Step 1: Replace the homepage with the approved information architecture**

Rewrite `landing-frontend/src/pages/LandingPage.tsx` around static section arrays and three explicit navigation handlers.

```tsx
const primaryFeatures = [
  {
    title: '预约与排期更清晰',
    desc: '把上门、到店、沟通与确认收进同一条服务链路。',
  },
  {
    title: '客户关系不断线',
    desc: '偏好、历史订单与作品沟通记录更容易沉淀。',
  },
  {
    title: '作品展示带来转化',
    desc: '让客户先看到审美与专业度，再进入预约与复约。',
  },
]

const audienceCards = [
  {
    eyebrow: 'FOR TECHNICIANS',
    title: '帮助美甲师经营得更轻、更稳',
    body: '管理预约、客户、收入与作品，让服务效率和专业感一起提升。',
  },
  {
    eyebrow: 'FOR CLIENTS',
    title: '让客户预约与沟通更顺畅',
    body: '更容易找到合适的风格、确认细节并沉淀长期服务关系。',
  },
]
```

Use this page structure:

```tsx
return (
  <main className="landing-shell">
    <nav>{/* logo, anchor buttons, login CTA */}</nav>
    <section id="hero">{/* hero copy, primary CTA, secondary CTA, proof stats */}</section>
    <section id="audiences">{/* dual audience cards */}</section>
    <section id="features">{/* feature grid */}</section>
    <section id="flow">{/* 3-step how it works */}</section>
    <section id="showcase-preview">{/* three preview cards + link to /showcase */}</section>
    <section id="join">{/* artist join CTA block */}</section>
    <section id="faq">{/* FAQ accordion or static cards */}</section>
    <footer>{/* links to login, join, showcase */}</footer>
  </main>
)
```

- [ ] **Step 2: Keep the homepage interactions explicit and minimal**

Use only direct route navigation and section scrolling; do not introduce context, reducers, or shared hook abstractions.

```tsx
const navigate = useNavigate()

const handleLogin = () => navigate('/role-select')
const handleJoin = () => navigate('/artist-join')
const handleShowcase = () => navigate('/showcase')

const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
```

- [ ] **Step 3: Refine the role-selection page to match the new brand direction**

Update `landing-frontend/src/pages/RoleSelectPage.tsx` so it uses the same soft editorial visual system, keeps the current cross-app URLs, and adds more obvious “return to official site” affordance.

```tsx
const handleSelectTechnician = () => {
  window.location.href = 'http://localhost:5175/login'
}

const handleSelectClient = () => {
  window.location.href = 'http://localhost:5173/login'
}

return (
  <main className="landing-shell min-h-screen px-4 pb-8 pt-4 sm:px-6">
    {/* compact header */}
    {/* intro copy */}
    {/* two role cards with role bullets */}
    {/* return-to-home link and agreement copy */}
  </main>
)
```

- [ ] **Step 4: Verify the homepage and role-select page in the browser**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/landing-frontend
npm run dev
```

Manual checks:

- `/` shows the new hero, feature, join, and FAQ sections with visible styling
- `/role-select` matches the softer brand direction
- tapping the login CTA opens `/role-select`
- tapping “美甲师入驻” opens `/artist-join`
- tapping “查看作品/服务” opens `/showcase`

- [ ] **Step 5: Commit**

```bash
git add landing-frontend/src/pages/LandingPage.tsx landing-frontend/src/pages/RoleSelectPage.tsx
git commit -m "feat: redesign landing homepage and role selector"
```

## Task 4: Finish the artist-join and showcase pages

**Files:**
- Modify: `landing-frontend/src/pages/ArtistJoinPage.tsx`
- Modify: `landing-frontend/src/pages/ShowcasePage.tsx`

- [ ] **Step 1: Flesh out the artist join page with the approved fields and success state**

Implement the full form card in `landing-frontend/src/pages/ArtistJoinPage.tsx`.

```tsx
<form onSubmit={handleSubmit} className="editorial-card rounded-[28px] p-5 sm:p-7">
  <div className="grid gap-3">
    <input name="name" placeholder="请输入姓名" className="touch-target rounded-2xl border px-4 py-3" />
    <input name="phone" placeholder="请输入手机号" className="touch-target rounded-2xl border px-4 py-3" />
    <input name="city" placeholder="所在城市" className="touch-target rounded-2xl border px-4 py-3" />
    <select name="serviceMode" className="touch-target rounded-2xl border px-4 py-3">
      <option value="">请选择服务方式</option>
      <option value="home">上门服务</option>
      <option value="studio">到店服务</option>
      <option value="both">都支持</option>
    </select>
    <input name="experience" placeholder="从业年限" className="touch-target rounded-2xl border px-4 py-3" />
    <input name="style" placeholder="擅长风格" className="touch-target rounded-2xl border px-4 py-3" />
    <textarea name="note" placeholder="补充说明" className="min-h-28 rounded-2xl border px-4 py-3" />
  </div>
  <button type="submit" className="mt-4 touch-target w-full rounded-full bg-[#17161f] px-5 py-3 text-white">
    提交入驻申请
  </button>
</form>
```

Use a local success view like:

```tsx
if (submitted) {
  return (
    <main className="landing-shell min-h-screen px-4 pb-10 pt-6">
      <section className="editorial-card mx-auto max-w-xl rounded-[28px] p-6 text-center">
        <h1 className="text-2xl font-semibold text-[#17161f]">申请已提交</h1>
        <p className="mt-3 text-sm text-[#6b6674]">我们会尽快联系您，协助您完成 NailBook 入驻。</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button onClick={() => navigate('/role-select')}>立即登录</button>
          <Link to="/">返回官网</Link>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Flesh out the showcase page with proof-oriented static content**

Implement `landing-frontend/src/pages/ShowcasePage.tsx` using a small set of static cards rather than generic placeholder boxes.

```tsx
const serviceHighlights = [
  '沟通款式细节并沉淀偏好',
  '确认预约时间、地址与服务方式',
  '通过作品展示提升首次下单信任',
]

const styleTags = ['通勤日常', '法式细闪', '镜面金属', '新娘定制', '节日限定']
```

Render:

```tsx
<section className="grid gap-4 md:grid-cols-3">
  {featuredWorks.map((work) => (
    <article key={work.title} className="editorial-card rounded-[26px] p-5">
      <span className="inline-flex rounded-full bg-[#fff1f4] px-3 py-1 text-xs text-[#e85b7b]">
        {work.tag}
      </span>
      <h2 className="mt-4 text-xl font-semibold text-[#17161f]">{work.title}</h2>
      <p className="mt-2 text-sm text-[#6b6674]">{work.note}</p>
    </article>
  ))}
</section>
```

- [ ] **Step 3: Rebuild and manually verify both marketing pages**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/landing-frontend
npm run build
```

Manual checks:

- `/artist-join` renders a complete form and a success state
- `/showcase` renders cards, tags, and both CTAs
- both pages keep the same visual language as the homepage

- [ ] **Step 4: Commit**

```bash
git add landing-frontend/src/pages/ArtistJoinPage.tsx landing-frontend/src/pages/ShowcasePage.tsx
git commit -m "feat: add landing join and showcase pages"
```

## Task 5: Add role switching on the technician and client login pages

**Files:**
- Modify: `technician-frontend/src/pages/Login.tsx`
- Modify: `client-frontend/src/pages/Login.tsx`

- [ ] **Step 1: Add the technician-side role switch as a secondary text action**

Insert a small switch block near the login form footer in `technician-frontend/src/pages/Login.tsx`.

```tsx
<div className="mt-4 text-center">
  <button
    type="button"
    onClick={() => {
      window.location.href = 'http://localhost:5173/login'
    }}
    className="text-[0.84rem] font-medium text-[#ff607b] underline-offset-4 transition hover:underline"
  >
    切换角色：我是美甲客户
  </button>
</div>
```

The block must be visually secondary to the main submit button and must not alter the existing login flow state.

- [ ] **Step 2: Add the client-side role switch so it remains visible in both login and registration states**

Insert a similar secondary action in `client-frontend/src/pages/Login.tsx` outside the conditional invite/new-user-only sections.

```tsx
<div className="pt-2 text-center">
  <button
    type="button"
    onClick={() => {
      window.location.href = 'http://localhost:5175/login'
    }}
    className="text-body-sm font-medium text-[var(--color-primary)] underline-offset-4 transition hover:underline"
  >
    切换角色：我是美甲师
  </button>
</div>
```

Place it in a stable area that renders for:

- normal login
- invite registration
- new-user registration

- [ ] **Step 3: Build both business-frontends after the narrow login-page changes**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/technician-frontend
npm run build

cd /Users/shibo/Documents/Codex/nailBook/client-frontend
npm run build
```

Expected: both builds complete without TypeScript or JSX placement errors.

- [ ] **Step 4: Manually verify cross-role navigation**

Manual checks:

- open `http://localhost:5175/login` and tap `切换角色：我是美甲客户`
- confirm navigation reaches `http://localhost:5173/login`
- open `http://localhost:5173/login` in normal login mode and in new-user mode
- confirm `切换角色：我是美甲师` remains visible and jumps to `http://localhost:5175/login`

- [ ] **Step 5: Commit**

```bash
git add technician-frontend/src/pages/Login.tsx client-frontend/src/pages/Login.tsx
git commit -m "feat: add role switching on login pages"
```

## Task 6: Final verification and regression pass

**Files:**
- Verify only

- [ ] **Step 1: Run all relevant builds one more time from clean terminals**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/landing-frontend && npm run build
cd /Users/shibo/Documents/Codex/nailBook/technician-frontend && npm run build
cd /Users/shibo/Documents/Codex/nailBook/client-frontend && npm run build
```

Expected: all three builds succeed.

- [ ] **Step 2: Run a browser smoke test across the full flow**

Manual checks:

- landing homepage styling is visibly applied
- homepage CTA order is `立即登录` first and `美甲师入驻` second
- role select page sends each user to the correct login page
- artist join page success state works
- showcase page is reachable from the homepage
- both login pages expose role-switch actions

- [ ] **Step 3: Summarize any residual risks**

Document the following if still present after implementation:

- whether the landing style bug only reproduced in dev mode or also in preview
- whether the join form remains local-only because no API was added
- whether the showcase content is static and intentionally non-transactional

- [ ] **Step 4: Commit**

```bash
git add landing-frontend/src/App.tsx landing-frontend/src/index.css landing-frontend/src/pages/LandingPage.tsx landing-frontend/src/pages/RoleSelectPage.tsx landing-frontend/src/pages/ArtistJoinPage.tsx landing-frontend/src/pages/ShowcasePage.tsx technician-frontend/src/pages/Login.tsx client-frontend/src/pages/Login.tsx
git commit -m "feat: launch revised landing website flow"
```
