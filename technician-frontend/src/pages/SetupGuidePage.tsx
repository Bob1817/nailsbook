import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * 首次登录强制配置引导：开启接单前的配置清单。
 * 设计要求步骤：服务类型（上门 / 店铺）→ 服务管理 → 服务时间 → 名片。
 * 解锁条件（与后端 bookingReady 一致）：至少开启一种服务类型；
 * 未解锁前邀请码 / 邀请链接与客户预约均锁定，由 ProtectedRoute 守卫强制停留。
 */
const SetupGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const { technician } = useAuth();

  const homeOn = !!technician?.homeService;
  const shopOn = !!technician?.shopService;
  const ready = homeOn || shopOn;

  const steps: Array<{ n: string; title: string; subtitle: string; done: boolean; path: string }> = [
    { n: '1', title: '服务类型 · 上门设置', subtitle: '开启上门美甲服务', done: homeOn, path: '/home-service-settings' },
    { n: '1', title: '服务类型 · 店铺设置', subtitle: '开启到店美甲服务', done: shopOn, path: '/shops' },
    { n: '2', title: '服务管理', subtitle: '添加你提供的服务项目', done: false, path: '/services' },
    { n: '3', title: '服务时间', subtitle: '设置可预约的服务时段', done: false, path: '/schedule' },
    { n: '4', title: '名片配置', subtitle: '完善公开名片信息', done: false, path: '/profile-settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-5 pb-28 pt-6">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900">开启接单前配置</h1>
        <p className="mt-1.5 text-sm leading-6 text-gray-500">
          至少开启「上门」或「到店」服务，才能邀请客户、生成邀请链接并接单。
        </p>

        <div className="mt-5 space-y-3">
          {steps.map((s, i) => (
            <button
              key={`${s.title}-${i}`}
              type="button"
              onClick={() => navigate(s.path)}
              className="flex w-full items-center gap-3.5 rounded-2xl border bg-white p-4 text-left transition-colors active:bg-gray-50"
              style={{ borderColor: s.done ? 'rgba(34,197,94,0.45)' : 'rgba(0,0,0,0.06)' }}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  s.done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {s.done ? '✓' : s.n}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-gray-900">{s.title}</span>
                <span className="mt-0.5 block text-xs text-gray-400">{s.subtitle}</span>
              </span>
              <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-100 bg-white px-5 py-3">
        <div className="mx-auto w-full max-w-sm">
          <button
            type="button"
            disabled={!ready}
            onClick={() => navigate('/', { replace: true })}
            className="w-full min-h-[48px] rounded-xl bg-[#FF5A66] text-sm font-medium text-white disabled:opacity-50"
          >
            {ready ? '完成，进入工作台' : '请先开启一种服务类型'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupGuidePage;
