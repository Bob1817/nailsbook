import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Briefcase, Sparkles, User } from 'lucide-react'

const RoleSelectPage = () => {
  const navigate = useNavigate()
  const focusVisibleClass =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]'

  return (
    <div className="min-h-screen bg-transparent px-4 pb-10 pt-5 sm:px-6 sm:pt-6">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-5xl flex-col">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className={`glass flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-[var(--color-ink-muted)] transition active:scale-[0.98] active:bg-white/92 active:shadow-[0_10px_24px_rgba(192,136,148,0.14)] ${focusVisibleClass}`}
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </button>

          <div className="flex items-center gap-3 rounded-full bg-white/78 px-4 py-2 shadow-[0_12px_26px_rgba(192,136,148,0.08)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-soft))] text-white shadow-[0_12px_24px_rgba(255,107,138,0.22)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-[0.16em] text-[var(--color-ink)] uppercase">
              NailBook
            </span>
          </div>
        </header>

        <main className="flex flex-1 items-center py-8 sm:py-10">
          <div className="w-full">
            <section className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium tracking-[0.18em] text-[var(--color-brand)] uppercase">
                Select Role
              </p>
              <h1 className="mt-3 text-[2.2rem] leading-[1.08] font-semibold tracking-[-0.04em] text-[var(--color-ink)] sm:text-[3rem]">
                请选择你要进入的工作空间。
              </h1>
              <p className="mt-4 text-sm leading-7 text-[var(--color-ink-muted)] sm:text-base">
                入口保持明确，不做多余步骤。美甲师和客户将进入各自独立的应用登录页。
              </p>
            </section>

            <section className="mx-auto mt-8 grid max-w-5xl gap-4 lg:grid-cols-2">
              <a
                href={import.meta.env.VITE_TECHNICIAN_LOGIN_URL || '/login'}
                className={`relative block overflow-hidden rounded-[2rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,244,246,0.9))] p-6 text-left shadow-[0_28px_58px_rgba(192,136,148,0.12)] transition active:scale-[0.99] active:border-[rgba(255,107,138,0.26)] active:bg-[linear-gradient(180deg,rgba(255,248,249,0.98),rgba(255,236,240,0.96))] active:shadow-[0_16px_34px_rgba(192,136,148,0.18)] sm:p-8 ${focusVisibleClass}`}
              >
                <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(255,143,163,0.28),transparent_68%)]" />
                <div className="relative">
                  <span className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-soft))] text-white shadow-[0_16px_34px_rgba(255,107,138,0.24)]">
                    <Briefcase className="h-6 w-6" />
                  </span>
                  <div className="mt-6 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium tracking-[0.16em] text-[var(--color-brand)] uppercase">
                        For Technicians
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
                        我是美甲师
                      </h2>
                    </div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/88 text-[var(--color-brand)] shadow-[0_12px_24px_rgba(192,136,148,0.12)]">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-4 max-w-md text-sm leading-7 text-[var(--color-ink-muted)] sm:text-base">
                    进入美甲师端，继续处理客户、预约、作品与日程安排。
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2 text-xs text-[var(--color-ink-soft)] sm:text-sm">
                    <span className="rounded-full bg-white/82 px-3 py-2">客户资料</span>
                    <span className="rounded-full bg-white/82 px-3 py-2">预约排期</span>
                    <span className="rounded-full bg-white/82 px-3 py-2">作品经营</span>
                  </div>
                </div>
              </a>

              <a
                href={import.meta.env.VITE_CLIENT_LOGIN_URL || '/client-login'}
                className={`relative block overflow-hidden rounded-[2rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,248,249,0.9))] p-6 text-left shadow-[0_28px_58px_rgba(192,136,148,0.1)] transition active:scale-[0.99] active:border-[rgba(255,107,138,0.22)] active:bg-[linear-gradient(180deg,rgba(255,250,251,0.98),rgba(255,240,244,0.96))] active:shadow-[0_16px_34px_rgba(192,136,148,0.16)] sm:p-8 ${focusVisibleClass}`}
              >
                <div className="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(255,107,138,0.18),transparent_68%)]" />
                <div className="relative">
                  <span className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,#ff9fb3,#ffc2ce)] text-white shadow-[0_16px_34px_rgba(255,159,179,0.22)]">
                    <User className="h-6 w-6" />
                  </span>
                  <div className="mt-6 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium tracking-[0.16em] text-[var(--color-brand)] uppercase">
                        For Clients
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
                        我是美甲客户
                      </h2>
                    </div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/88 text-[var(--color-brand)] shadow-[0_12px_24px_rgba(192,136,148,0.12)]">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-4 max-w-md text-sm leading-7 text-[var(--color-ink-muted)] sm:text-base">
                    进入客户端，浏览作品、管理预约，并继续和喜欢的美甲师沟通。
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2 text-xs text-[var(--color-ink-soft)] sm:text-sm">
                    <span className="rounded-full bg-white/82 px-3 py-2">浏览作品</span>
                    <span className="rounded-full bg-white/82 px-3 py-2">在线预约</span>
                    <span className="rounded-full bg-white/82 px-3 py-2">服务跟进</span>
                  </div>
                </div>
              </a>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

export default RoleSelectPage
