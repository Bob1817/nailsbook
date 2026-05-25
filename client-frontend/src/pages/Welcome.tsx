import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import nailLoginBg from '../assets/nail-login-bg.png';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nickname.trim()) {
      setError('请输入您的称呼');
      return;
    }

    if (nickname.trim().length < 2) {
      setError('称呼至少需要2个字符');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({ nickname: nickname.trim() });
      navigate('/home', { replace: true });
    } catch {
      setError('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Set default nickname based on phone
    const defaultNickname = user?.phone ? `用户${user.phone.slice(-4)}` : '用户';
    updateProfile({ nickname: defaultNickname }).then(() => {
      navigate('/home', { replace: true });
    });
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-[#FFF0F3] to-white flex flex-col">
      <div
        className="pointer-events-none absolute inset-y-0 right-[-24%] w-[90%] bg-contain bg-right-bottom bg-no-repeat opacity-90"
        style={{ backgroundImage: `url(${nailLoginBg})` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,247,249,0.98)_0%,rgba(255,247,249,0.94)_38%,rgba(255,247,249,0.8)_62%,rgba(255,247,249,0.28)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,246,248,0.96)_0%,rgba(255,246,248,0.74)_34%,rgba(255,246,248,0.7)_62%,rgba(255,246,248,0.94)_100%)]" />
      {/* Header */}
      <div className="relative z-10 px-6 app-hero-safe pb-8">
        <div className="flex items-center justify-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FF6B8A] to-[#FF8FA3] flex items-center justify-center shadow-xl shadow-pink-200">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-display text-[var(--color-text)] mb-3">欢迎使用 NailArt</h1>
          <p className="text-body text-[var(--color-text-secondary)]">
            让我们更好地了解您
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="relative z-10 flex-1 px-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-body-sm text-[var(--color-text-secondary)] mb-3">
              您希望如何被称呼？
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 20))}
              placeholder="请输入您的昵称"
              className="w-full px-5 py-4 bg-white rounded-2xl border border-[var(--color-border)] text-body text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 card-shadow"
              autoFocus
            />
            <p className="text-caption text-[var(--color-text-muted)] mt-2">
              美甲师将通过这个称呼来认识您
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-body-sm text-[var(--color-error)] text-center">{error}</div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] text-white rounded-full text-body font-medium shadow-lg shadow-pink-200 active:scale-[0.98] transition-transform disabled:opacity-70"
          >
            {loading ? '保存中...' : '开始使用'}
          </button>

          {/* Skip Button */}
          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-4 text-body text-[var(--color-text-muted)]"
          >
            跳过，使用默认称呼
          </button>
        </form>

        {/* Features */}
        <div className="mt-12 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-white/50 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-soft)] flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-body font-medium text-[var(--color-text)]">便捷预约</p>
              <p className="text-caption text-[var(--color-text-muted)]">随时随地预约美甲服务</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-white/50 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-soft)] flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-body font-medium text-[var(--color-text)]">个性设计</p>
              <p className="text-caption text-[var(--color-text-muted)]">定制专属美甲设计方案</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-white/50 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-soft)] flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="text-body font-medium text-[var(--color-text)]">实时沟通</p>
              <p className="text-caption text-[var(--color-text-muted)]">与美甲师即时交流需求</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
