import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService, type Technician } from '../services/auth';
import ArtistCardModal from '../components/ArtistCardModal';

const Profile: React.FC<{ managing?: boolean }> = ({ managing = false }) => {
  const navigate = useNavigate();
  const { user, technicians, logout, unbindTechnician, setDefaultTechnician, bindTechnician, refreshProfile } = useAuth();

  // 每次进入 Profile 拉一次最新数据（避免 localStorage 缓存导致字段缺失）
  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const [pending, setPending] = useState<Technician[]>([]);
  const [bindingsError, setBindingsError] = useState(false);
  const loadPending = async () => {
    try { const profile = await authService.getProfile(); setPending(profile.pendingTechnicians || []); setBindingsError(false); }
    catch { setBindingsError(true); }
  };
  useEffect(() => { void loadPending(); }, [managing]);
  const ordered = technicians.slice().sort((a,b) => Number(b.isDefault) - Number(a.isDefault) || (b.boundAt || '').localeCompare(a.boundAt || ''));
  const visibleTechnicians = managing ? ordered : ordered.slice(0,2);
  const full = technicians.length + pending.length >= 5;
  const openBinding = () => { if (!managing) navigate('/profile/technicians'); else if (!full) setShowBindModal(true); };
  const cancelApplication = async (id: number) => {
    try { await authService.cancelBindingApplication(id); await loadPending(); }
    catch { alert('取消申请失败，请重试'); }
  };

  const [showBindModal, setShowBindModal] = useState(false);
  const [cardTech, setCardTech] = useState<Technician | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [bindNote, setBindNote] = useState('');
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
      await bindTechnician(foundTechnician.id, inviteCode, false, bindNote);
      setShowBindModal(false);
      setInviteCode('');
      setBindNote('');
      setFoundTechnician(null);
      await loadPending();
      alert('绑定申请已提交，待美甲师通过后生效');
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || '申请失败，请重试');
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      label: '我的设计',
      onClick: () => navigate('/designs'),
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
    { icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>), label: '修改密码', onClick: () => navigate('/profile/password') },
    { icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>), label: '通知设置', onClick: () => navigate('/profile/notifications') },
    { icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>), label: '帮助与反馈', onClick: () => navigate('/profile/help') },
    { icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>), label: '用户协议', onClick: () => navigate('/profile/legal/terms') },
    { icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>), label: '隐私政策', onClick: () => navigate('/profile/legal/privacy') },
  ];

  return (
    <div className="min-h-full bg-[var(--nb-page)] pb-24">
      {/* Header */}
      {!managing && <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--nb-action)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.32),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_28%)]"></div>
        <div className="absolute -top-16 right-0 h-64 w-64 rounded-full bg-white/12 blur-3xl"></div>
        <div className="absolute -bottom-20 left-[-3rem] h-56 w-56 rounded-full bg-white/10 blur-3xl"></div>

        <div className="relative px-5 app-hero-safe pb-7 text-white">
          <div
            onClick={() => navigate('/profile/settings')}
            className="rounded-[28px] border border-white/18 bg-white/10 px-4 py-4 shadow-[0_18px_52px_rgba(0,0,0,0.24)] backdrop-blur-xl cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/20 ring-2 ring-white/30">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[20px] font-semibold text-white">
                  {user?.nickname || user?.phone || '用户'}
                </h1>
                <p className="mt-1 text-sm text-white/80">{user?.phone}</p>
              </div>
              <svg className="h-5 w-5 text-white/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      }
      {managing && <div className="p-5 flex items-center gap-4"><button className="min-h-11 px-4 rounded-lg active:bg-[var(--nb-pressed)] focus-visible:outline" onClick={() => navigate('/profile')}>返回</button><h1 className="text-lg font-semibold">我的美甲师</h1></div>}
      {/* My Technicians Section */}
      <div className="px-5 -mt-4">
        <div className="rounded-[32px] bg-white/88 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">我的美甲师 · {technicians.length} 位</h3>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{managing ? `名额 ${technicians.length + pending.length}/5，含待确认申请` : '查看与管理已绑定美甲师'}</p>
            </div>
            <button
              onClick={openBinding}
              className="shrink-0 rounded-full bg-[var(--color-primary-soft)] px-4 py-2 text-sm font-medium text-[var(--color-primary)]"
            >
              {managing ? (full ? '绑定名额已满' : '绑定新美甲师') : '管理 ›'}
            </button>
          </div>

          {technicians.length > 0 ? (
            <div className="space-y-3">
              {visibleTechnicians.map((tech) => {
                return (
                  <div
                    key={tech.id}
                    className={`rounded-[24px] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.06)] ring-1 ${
                      tech.isDefault
                        ? 'bg-[var(--nb-page)] ring-[var(--nb-control)]/10'
                        : 'bg-white/78 ring-black/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[var(--nb-page)]">
                          {tech.avatarUrl ? (
                            <img src={tech.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg font-semibold text-[var(--nb-ink)]">
                              {tech.name.slice(0, 1)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-base font-semibold text-[var(--color-text)]">{tech.name}</p>
                            {tech.isDefault && (
                              <span className="shrink-0 whitespace-nowrap rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-medium text-white">默认</span>
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
                              <span className="rounded-full bg-[var(--nb-page)] px-2 py-0.5 text-[11px] font-medium text-[var(--nb-ink)]">
                                可上门
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                tech.status === 'active'
                                  ? 'bg-[var(--nb-page)] text-[var(--nb-secondary)]'
                                  : 'bg-[var(--nb-page)] text-[var(--color-text-muted)]'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${tech.status === 'active' ? 'bg-[var(--nb-action)]' : 'bg-[var(--nb-action)]'}`} />
                              {tech.status === 'active' ? '接单中' : '休息中'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <button
                          onClick={() => setCardTech(tech)}
                          aria-label="查看美甲师名片"
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--nb-page)] text-[var(--color-primary)] active:bg-[var(--nb-page)]"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        {managing && !tech.isDefault && (
                          <button
                            onClick={() => handleSetDefault(tech.id)}
                            className="rounded-full border border-[var(--color-primary)] bg-white min-h-11 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)]"
                          >
                            设为默认
                          </button>
                        )}
                        {managing && <button
                          onClick={() => handleUnbind(tech.id, tech.name)}
                          className="rounded-full bg-[var(--nb-page)] min-h-11 px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)]"
                        >
                          解除
                        </button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] bg-[var(--nb-page)] px-5 py-8 text-center">
              <p className="text-sm font-medium text-[var(--color-text)] mb-2">暂无绑定的美甲师</p>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">输入邀请码后，即可添加新的专属美甲师</p>
              <button
                onClick={openBinding}
                className="rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white"
              >
                立即绑定
              </button>
            </div>
          )}
        </div>
      </div>

      {bindingsError && <button className="min-h-11 mx-5 text-sm" onClick={loadPending}>绑定信息加载失败，点击重试</button>}
      {!managing && pending.length > 0 && <button className="min-h-11 px-5 text-sm text-[var(--nb-link)]" onClick={() => navigate('/profile/technicians')}>待确认 {pending.length} 位 · 查看申请 ›</button>}
      {!managing && technicians.length > 2 && <button className="min-h-11 px-5 text-sm text-[var(--nb-link)]" onClick={() => navigate('/profile/technicians')}>查看全部 {technicians.length} 位 ›</button>}
      {managing && pending.map(tech => <div key={tech.id} className="mx-5 mt-4 p-4 rounded-xl bg-[var(--nb-surface)]"><p className="text-sm break-words">{tech.name} · 待确认</p><button className="min-h-11 px-4 text-sm rounded-lg active:bg-[var(--nb-pressed)] focus-visible:outline" onClick={() => cancelApplication(tech.id)}>取消申请</button></div>)}
      {!managing && <>
      {/* Menu Items */}
      <div className="px-5 mt-6">
        <div className="rounded-[32px] bg-white/88 p-2 shadow-[0_24px_64px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="px-3 pb-2 pt-1">
            <h3 className="text-lg font-semibold text-[var(--color-text)]">我的服务</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">管理地址、预约、设计与服务沟通</p>
          </div>
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between rounded-[24px] px-4 py-4 active:bg-[var(--nb-page)] transition-colors ${
                index !== menuItems.length - 1 ? 'mb-1' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--nb-page)] text-[var(--color-text-secondary)]">
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
        <div className="rounded-[32px] bg-white/88 p-2 shadow-[0_24px_64px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="px-3 pb-2 pt-1">
            <h3 className="text-lg font-semibold text-[var(--color-text)]">更多</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">账号设置、协议与版本信息</p>
          </div>
          {settingItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between rounded-[24px] px-4 py-4 active:bg-[var(--nb-page)] transition-colors ${
                index !== settingItems.length - 1 ? 'mb-1' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--nb-page)] text-[var(--color-text-secondary)]">
                  {item.icon}
                </span>
                <span className="text-body text-[var(--color-text)]">{item.label}</span>
              </div>
              <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
          <div className="flex items-center justify-between rounded-[24px] px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--nb-page)] text-[var(--color-text-secondary)]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </span>
              <span className="text-body text-[var(--color-text)]">版本</span>
            </div>
            <span className="text-sm text-[var(--color-text-muted)]">1.0.0</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="px-5 mt-6">
        <button
          onClick={handleLogout}
          className="w-full rounded-[28px] bg-white/92 py-4 text-base font-medium text-[var(--color-error)] shadow-[0_18px_50px_rgba(0,0,0,0.08)] ring-1 ring-black/5 active:scale-95 transition-transform backdrop-blur"
        >
          退出登录
        </button>
      </div>

      </>}
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
                className="w-8 h-8 rounded-full bg-[var(--nb-page)] flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-[var(--nb-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    className="w-full px-4 py-3 bg-[var(--nb-page)] rounded-xl text-body text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                  {checkingInviteCode && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
                <p className="mt-2 text-caption text-[var(--color-text-muted)]">
                  输入美甲师邀请码，提交绑定申请，待美甲师通过后生效
                </p>
              </div>

              {foundTechnician && (
                <>
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

                  <div>
                    <label className="block text-body-sm text-[var(--color-text-secondary)] mb-2">备注（可选）</label>
                    <textarea
                      value={bindNote}
                      onChange={(e) => setBindNote(e.target.value)}
                      placeholder="给美甲师留言，如：我是老顾客小红"
                      rows={2}
                      className="w-full px-4 py-3 bg-[var(--nb-page)] rounded-xl text-body text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-none"
                    />
                  </div>
                </>
              )}

              <button
                onClick={handleBindTechnician}
                disabled={!foundTechnician || bindingLoading || full || bindingsError}
                className="w-full py-4 bg-[var(--nb-action)] text-white rounded-full text-body font-medium shadow-lg shadow-black/5 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bindingLoading ? '申请中...' : '申请绑定'}
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
