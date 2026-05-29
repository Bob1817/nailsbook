import React, { useEffect, useState } from 'react';
import { useToast } from './ToastProvider';
import ArtistCardView, { type ArtistCardWork } from './ArtistCardView';
import { worksService } from '../services/works';
import type { Technician } from '../services/auth';

interface ArtistCardModalProps {
  technician: Technician;
  onClose: () => void;
}

const ArtistCardModal: React.FC<ArtistCardModalProps> = ({ technician, onClose }) => {
  const toast = useToast();
  const [works, setWorks] = useState<ArtistCardWork[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);

  const code = technician.invitationCode || '';
  const inviteLink = code ? `${window.location.origin}/invite?invite_code=${encodeURIComponent(code)}` : '';
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

  const handleBook = () => {
    if (!inviteLink) {
      toast.warning('该美甲师暂无可用邀请链接');
      return;
    }
    window.open(inviteLink, '_blank', 'noopener,noreferrer');
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
      homeService={technician.homeService}
      status={technician.status}
      works={works}
      loadingWorks={loadingWorks}
      onBook={handleBook}
      onShare={handleShare}
      onClose={onClose}
    />
  );
};

export default ArtistCardModal;
