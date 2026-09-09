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
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--nb-ink)] border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-8 text-center">
        <p className="text-base font-medium text-[var(--nb-ink)]">名片不存在或已失效</p>
        <p className="text-sm text-[var(--nb-secondary)]">请向美甲师确认后重新打开链接</p>
      </div>
    );
  }

  const { artist, works, qualifications, featuredReviews } = data;
  const isBound = isAuthenticated && technicians.some((t) => t.id === artist.id);

  const handlePrimary = () => {
    if (!isAuthenticated) {
      // 未登录 -> 跳转登录/注册
      navigate(`/login?redirect=/artist/${encodeURIComponent(artist.invitationCode)}`);
      return;
    }
    if (isBound) {
      // 已登录且已绑定 -> 直接发起预约
      navigate(`/orders/create?tech_id=${artist.id}`);
    } else {
      // 已登录未绑定 -> 进入预约流程（自动绑定）
      navigate(`/orders/create?tech_id=${artist.id}`);
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
    // 作品详情页公开访问，无需登录
    navigate(`/works/${workId}`);
  };

  const handleLike = () => {
    if (!isAuthenticated) {
      toast.info('登录后即可点赞');
      return;
    }
    setIsLiked(!isLiked);
    toast.success(isLiked ? '已取消点赞' : '已点赞');
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      toast.info('登录后即可收藏');
      return;
    }
    setIsFavorited(!isFavorited);
    toast.success(isFavorited ? '已取消收藏' : '已收藏');
  };

  return (
    <ArtistCardView
      name={artist.name}
      avatarUrl={artist.avatarUrl}
      coverImageUrl={artist.coverImageUrl}
      city={artist.city}
      serviceArea={artist.serviceArea}
      bio={artist.bio}
      servicePhilosophy={artist.servicePhilosophy}
      bookingNotes={artist.bookingNotes}
      styleTags={artist.styleTags}
      isVerified={artist.isVerified}
      homeService={artist.homeService}
      shopService={artist.shopService}
      status={artist.status}
      stats={artist.stats}
      qualifications={qualifications}
      featuredReviews={featuredReviews}
      works={works}
      loadingWorks={false}
      primaryLabel={isBound ? '预约咨询' : '预约咨询'}
      onPrimary={handlePrimary}
      onShare={handleShare}
      onWorkClick={handleWorkClick}
      onShopClick={artist.shopAddresses?.length ? () => navigate(`/artist/${encodeURIComponent(artist.invitationCode)}/shops/0`) : undefined}
      onLike={handleLike}
      onFavorite={handleFavorite}
      isLiked={isLiked}
      isFavorited={isFavorited}
    />
  );
};

export default PublicArtistCard;
