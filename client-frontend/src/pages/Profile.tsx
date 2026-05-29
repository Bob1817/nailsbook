import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService, type Technician } from '../services/auth';
import ArtistCardModal from '../components/ArtistCardModal';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, technicians, logout, unbindTechnician, setDefaultTechnician, bindTechnician, refreshProfile } = useAuth();

  // 每次进入 Profile 拉一次最新数据（避免 localStorage 缓存导致字段缺失）
  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const [showBindModal, setShowBindModal] = useState(false);
  const [cardTech, setCardTech] = useState<Technician | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [foundTechnician, setFoundTechnician] = useState<{ id: number; name: string; avatarUrl?: string | null; city?: string | null; serviceArea?: string | null } | null>(null);
  const [checkingInviteCode, setCheckingInviteCode] = useState(false);
  const [bindingLoading, setBindingLoading] = useState(false);

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
      navigate('/login');
    }
  };

  const handleInviteCodeChange = async (value: string) => {
    setInviteCode(value);
    if (value.length >= 4) {
      setCheckingInviteCode(true);
      try {
        const tech = await authService.findTechnicianByInviteCode(value);
        setFoundTechnician(tech);
      } catch {
        setFoundTechnician(null);
      } finally {
        setCheckingInviteCode(false);
      }
    } else {
      setFoundTechnician(null);
    }
  };

  const handleBindTechnician = async () => {
    if (!foundTechnician) return;
    setBindingLoading(true);
    try {
      await bindTechnician(foundTechnician.id, inviteCode, false);
      setShowBindModal(false);
      setInviteCode('');
      setFoundTechnician(null);
    } catch {
      alert('绑定失败');
    } finally {
      setBindingLoading(false);
    }
  };

  const handleUnbind = async (techId: number, techName: string) => {
    if (!confirm(`确定要解除与"${techName}"的绑定吗？`)) return;
    try {
      await unbindTechnician(techId);
    } catch {
      alert('解除绑定失败');
    }
  };

  const handleSetDefault = async (techId: number) => {
    try {
      await setDefaultTechnician(techId);
    } catch {
      alert('设置失败');
    }
  };

  const menuItems = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: '地址管理',
      onClick: () => navigate('/profile/addresses'),
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
      label: '我的收藏',
      onClick: () => navigate('/favorites'),
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
        </svg>
      ),
      label: '我的点赞',
      onClick: () => navigate('/likes'),
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      label: '联系客服',
      onClick: () => navigate('/chat'),
    },
  ];

  const settingItems = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: '设置',
      onClick: () => {},
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: '帮助与反馈',
      onClick: () => {},
    },
  ];

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#FFFDFD_0%,#F7F3F6_48%,#F2F6FB_100%)] pb-24">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#FF6B8A_0%,#FF88A0_48%,#FFB0BE_100%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.32),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_28%)]"></div>
        <div className="absolute -top-16 right-0 h-64 w-64 rounded-full bg-white/12 blur-3xl"></div>
        <div className="absolute -bottom-20 left-[-3rem] h-56 w-56 rounded-full bg-white/10 blur-3xl"></div>

        <div className="relative px-5 app-hero-safe pb-10 text-white">
          <div
            onClick={() => navigate('/profile/edit')}
            className="rounded-[32px] border border-white/18 bg-white/10 px-5 py-5 shadow-[0_24px_70px_rgba(255,107,138,0.26)] backdrop-blur-xl cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full bg-white/20 ring-2 ring-white/30">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] uppercase tracking-[0.28em] text-white/70">PROFILE</span>
                <h1 className="mt-0.5 truncate text-[1.75rem] font-bold tracking-[-0.03em] text-white">
                  {user?.nickname || user?.phone || '用户'}
                </h1>
                <p className="mt-1 text-sm text-white/80">{user?.phone}</p>
                <p className="mt-1 text-xs text-white/70">点击编辑个人资料</p>
              </div>
              <svg className="h-5 w-5 text-white/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* My Technicians Section */}
      <div className="px-5 -mt-4">
        <div className="rounded-[32px] bg-white/88 p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">我的美甲师</h3>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">查看已绑定的专属美甲师并管理默认服务对象</p>
            </div>
            <button
              onClick={() => setShowBindModal(true)}
              className="shrink-0 rounded-full bg-[var(--color-primary-soft)] px-4 py-2 text-sm font-medium text-[var(--color-primary)]"
            >
              + 绑定新美甲师
            </button>
          </div>

          {technicians.length > 0 ? (
            <div className="space-y-3">
              {technicians.map((tech) => {
                return (
                  <div
                    key={tech.id}
                    className={`rounded-[24px] p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)] ring-1 ${
                      tech.isDefault
                        ? 'bg-[linear-gradient(135deg,#FFF0F5_0%,#FAFBFF_100%)] ring-[#FF6B8A]/10'
                        : 'bg-white/78 ring-black/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#FFE0EA_0%,#F4F7FB_100%)]">
                          {tech.avatarUrl ? (
                            <img src={tech.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg font-semibold text-[#FF6B8A]">
                              {tech.name.slice(0, 1)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-base font-semibold text-[var(--color-text)]">{tech.name}</p>
                            {tech.isDefault && (
                              <span className="rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-medium text-white">默认</span>
                            )}
                          </div>
                          {tech.city && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{tech.city}</span>
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {tech.homeService && (
                              <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-medium text-[#FF6B8A]">
                                可上门
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                tech.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-slate-100 text-[var(--color-text-muted)]'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${tech.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {tech.status === 'active' ? '接单中' : '休息中'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <button
                          onClick={() => setCardTech(tech)}
                          aria-label="查看美甲师名片"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-50 text-[var(--color-primary)] active:bg-pink-100"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        {!tech.isDefault && (
                          <button
                            onClick={() => handleSetDefault(tech.id)}
                            className="rounded-full border border-[var(--color-primary)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-primary)]"
                          >
                            设为默认
                          </button>
                        )}
                        <button
                          onClick={() => handleUnbind(tech.id, tech.name)}
                          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)]"
                        >
                          解除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] bg-slate-50 px-5 py-8 text-center">
              <p className="text-sm font-medium text-[var(--color-text)] mb-2">暂无绑定的美甲师</p>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">输入邀请码后，即可添加新的专属美甲师</p>
              <button
                onClick={() => setShowBindModal(true)}
                className="rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white"
              >
                立即绑定
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-5 mt-6">
        <div className="rounded-[32px] bg-white/88 p-2 shadow-[0_24px_64px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="px-3 pb-2 pt-1">
            <h3 className="text-lg font-semibold text-[var(--color-text)]">我的服务</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">管理地址、预约、设计与服务沟通</p>
          </div>
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between rounded-[24px] px-4 py-4 active:bg-slate-50 transition-colors ${
                index !== menuItems.length - 1 ? 'mb-1' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#FFF0F5_0%,#F4F7FB_100%)] text-[var(--color-text-secondary)]">
                  {item.icon}
                </span>
                <span className="text-body text-[var(--color-text)]">{item.label}</span>
              </div>
              <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="px-5 mt-4">
        <div className="rounded-[32px] bg-white/88 p-2 shadow-[0_24px_64px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="px-3 pb-2 pt-1">
            <h3 className="text-lg font-semibold text-[var(--color-text)]">更多</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">查看帮助、反馈问题与账号设置</p>
          </div>
          {settingItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between rounded-[24px] px-4 py-4 active:bg-slate-50 transition-colors ${
                index !== settingItems.length - 1 ? 'mb-1' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#FFF0F5_0%,#F4F7FB_100%)] text-[var(--color-text-secondary)]">
                  {item.icon}
                </span>
                <span className="text-body text-[var(--color-text)]">{item.label}</span>
              </div>
              <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="px-5 mt-6">
        <button
          onClick={handleLogout}
          className="w-full rounded-[28px] bg-white/92 py-4 text-base font-medium text-[var(--color-error)] shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-black/5 active:scale-95 transition-transform backdrop-blur"
        >
          退出登录
        </button>
      </div>

      {/* Version */}
      <p className="mt-6 text-center text-caption text-[var(--color-text-muted)]">版本 1.0.0</p>

      {/* Bind Technician Modal */}
      {showBindModal && (
        <div
          className="fixed inset-0 z-[80] bg-black/55 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => {
            setShowBindModal(false);
            setInviteCode('');
            setFoundTechnician(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-white/95 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom)+1rem)] animate-slide-up shadow-2xl ring-1 ring-black/5 backdrop-blur max-h-[min(78dvh,42rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-heading-2 text-[var(--color-text)]">绑定美甲师</h3>
              <button
                onClick={() => {
                  setShowBindModal(false);
                  setInviteCode('');
                  setFoundTechnician(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-body-sm text-[var(--color-text-secondary)] mb-2">邀请码</label>
                <div className="relative">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => handleInviteCodeChange(e.target.value.trim())}
                    placeholder="请输入美甲师提供的邀请码"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl text-body text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                  {checkingInviteCode && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
                <p className="mt-2 text-caption text-[var(--color-text-muted)]">
                  输入美甲师提供的邀请码后，即可完成绑定
                </p>
              </div>

              {foundTechnician && (
                <div className="p-4 bg-[var(--color-primary-soft)] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden">
                      {foundTechnician.avatarUrl ? (
                        <img src={foundTechnician.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-7 h-7 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-body font-medium text-[var(--color-text)]">{foundTechnician.name}</p>
                      <p className="text-caption text-[var(--color-text-muted)]">
                        {foundTechnician.city || '未知城市'} {foundTechnician.serviceArea ? `· ${foundTechnician.serviceArea}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleBindTechnician}
                disabled={!foundTechnician || bindingLoading}
                className="w-full py-4 bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] text-white rounded-full text-body font-medium shadow-lg shadow-pink-200 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bindingLoading ? '绑定中...' : '确认绑定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cardTech && (
        <ArtistCardModal technician={cardTech} onClose={() => setCardTech(null)} />
      )}
    </div>
  );
};

export default Profile;
