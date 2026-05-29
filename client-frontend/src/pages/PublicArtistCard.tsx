import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ToastProvider';
import ArtistCardView from '../components/ArtistCardView';
import { publicArtistService, type PublicArtistCard as PublicArtistCardData } from '../services/publicArtist';

const PublicArtistCard: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, technicians } = useAuth();
  const [data, setData] = useState<PublicArtistCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) {
      setError(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    publicArtistService
      .getCard(code)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF6B8A] border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-8 text-center">
        <p className="text-base font-medium text-[var(--color-text,#1f2230)]">名片不存在或已失效</p>
        <p className="text-sm text-[var(--color-text-muted,#8d8590)]">请向美甲师确认后重新打开链接</p>
      </div>
    );
  }

  const { artist, works } = data;
  const inviteLink = `${window.location.origin}/invite?invite_code=${encodeURIComponent(artist.invitationCode)}`;
  const isBound = isAuthenticated && technicians.some((t) => t.id === artist.id);

  const handlePrimary = () => {
    if (isBound) {
      // 已登录且已绑定 -> 直接发起预约
      navigate(`/orders/create?tech_id=${artist.id}`);
    } else {
      // 未登录或未绑定 -> 联系美甲师（进入邀请注册/绑定流程）
      window.location.href = inviteLink;
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareText = `推荐美甲师「${artist.name}」${artist.city ? ` · ${artist.city}` : ''}，点击查看名片并预约：`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `美甲师 ${artist.name}`, text: shareText, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('当前环境不支持分享，名片链接已复制');
      }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('名片链接已复制');
      } catch {
        toast.error('分享失败，请重试');
      }
    }
  };

  const handleWorkClick = (workId: number) => {
    // 已绑定用户可进入可交互的作品详情；其余进入公开只读详情
    navigate(isBound ? `/works/${workId}` : `/w/${workId}`);
  };

  return (
    <ArtistCardView
      name={artist.name}
      avatarUrl={artist.avatarUrl}
      city={artist.city}
      serviceArea={artist.serviceArea}
      homeService={artist.homeService}
      shopService={artist.shopService}
      status={artist.status}
      socialMedia={artist.socialMedia}
      works={works}
      loadingWorks={false}
      primaryLabel={isBound ? '预约该美甲师' : '联系美甲师'}
      onPrimary={handlePrimary}
      onShare={handleShare}
      onWorkClick={handleWorkClick}
    />
  );
};

export default PublicArtistCard;
