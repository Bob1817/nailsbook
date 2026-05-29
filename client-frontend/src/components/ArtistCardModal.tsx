import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ToastProvider';
import ArtistCardView, { type ArtistCardWork } from './ArtistCardView';
import { worksService } from '../services/works';
import type { Technician } from '../services/auth';

interface ArtistCardModalProps {
  technician: Technician;
  onClose: () => void;
}

const ArtistCardModal: React.FC<ArtistCardModalProps> = ({ technician, onClose }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [works, setWorks] = useState<ArtistCardWork[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);

  const code = technician.invitationCode || '';
  const cardUrl = code ? `${window.location.origin}/artist/${encodeURIComponent(code)}` : '';

  useEffect(() => {
    let cancelled = false;
    setLoadingWorks(true);
    worksService
      .getWorks(technician.id)
      .then((data) => {
        if (!cancelled) setWorks(data);
      })
      .catch(() => {
        if (!cancelled) setWorks([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingWorks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [technician.id]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // 已登录且已绑定 -> 直接发起预约
  const handleBook = () => {
    onClose();
    navigate(`/orders/create?tech_id=${technician.id}`);
  };

  const handleShare = async () => {
    if (!cardUrl) {
      toast.warning('该美甲师暂无可用名片链接');
      return;
    }
    const shareText = `推荐美甲师「${technician.name}」${technician.city ? ` · ${technician.city}` : ''}，点击查看名片并预约：`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `美甲师 ${technician.name}`, text: shareText, url: cardUrl });
      } else {
        await navigator.clipboard.writeText(cardUrl);
        toast.success('当前环境不支持分享，名片链接已复制');
      }
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(cardUrl);
        toast.success('名片链接已复制');
      } catch {
        toast.error('分享失败，请重试');
      }
    }
  };

  return (
    <ArtistCardView
      name={technician.name}
      avatarUrl={technician.avatarUrl ?? null}
      city={technician.city}
      serviceArea={technician.serviceArea}
      homeService={technician.homeService}
      shopService={technician.shopService}
      status={technician.status}
      socialMedia={technician.socialMedia}
      works={works}
      loadingWorks={loadingWorks}
      primaryLabel="预约该美甲师"
      onPrimary={handleBook}
      onShare={handleShare}
      onWorkClick={(workId) => {
        onClose();
        navigate(`/works/${workId}`);
      }}
      onClose={onClose}
    />
  );
};

export default ArtistCardModal;
