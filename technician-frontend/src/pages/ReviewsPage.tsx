import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/feedback/ToastProvider';
import { Card } from '../components/base/Card';

interface Review {
  id: number;
  content: string;
  rating: number;
  client: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
  isFeatured: boolean;
  createdAt: string;
}

const ReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    avgRating: 0,
    featuredCount: 0,
  });

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const token = localStorage.getItem('technician_token');
      const response = await fetch('/api/technician/reviews', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews);

        // Calculate stats
        const total = data.total;
        const avgRating = data.reviews.length > 0
          ? data.reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / data.reviews.length
          : 0;
        const featuredCount = data.reviews.filter((r: Review) => r.isFeatured).length;

        setStats({ total, avgRating: Math.round(avgRating * 10) / 10, featuredCount });
      }
    } catch {
      toast.error('加载评价失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeatured = async (reviewId: number, isFeatured: boolean) => {
    try {
      const token = localStorage.getItem('technician_token');
      const method = isFeatured ? 'DELETE' : 'POST';
      const response = await fetch(`/api/technician/reviews/${reviewId}/featured`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success(isFeatured ? '已取消精选' : '已设为精选');
        loadReviews();
      } else {
        toast.error('操作失败');
      }
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`h-3.5 w-3.5 ${i < rating ? 'text-yellow-400' : 'text-gray-200'}`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    ));
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[#fff9f8]">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[#f2e6ec]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f3f5] transition-colors active:bg-[#eee5e9]"
        >
          <svg className="h-5 w-5 text-[#3c3440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-[#1f2230]">评价管理</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Stats */}
        <div className="px-5 py-5">
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="mt-1 text-xs text-gray-500">总评价</p>
              </div>
              <div className="border-x border-gray-100">
                <p className="text-2xl font-bold text-yellow-500">{stats.avgRating || '-'}</p>
                <p className="mt-1 text-xs text-gray-500">平均分</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-500">{stats.featuredCount}</p>
                <p className="mt-1 text-xs text-gray-500">精选评价</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Reviews List */}
        <div className="px-5 pb-5">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-3">全部评价</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF5E93] border-t-transparent" />
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-[#f7f3f5]">
                        {review.client.avatarUrl ? (
                          <img src={review.client.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-medium text-[#FF5E93]">
                            {review.client.name.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-gray-900">{review.client.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.isFeatured && (
                        <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-medium text-[#FF5E93]">
                          精选
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(review.id, review.isFeatured)}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          review.isFeatured
                            ? 'bg-gray-100 text-gray-600 active:bg-gray-200'
                            : 'bg-[#ffe9f0] text-[#FF5E93] active:bg-[#ffd6e4]'
                        }`}
                      >
                        {review.isFeatured ? '取消精选' : '设为精选'}
                      </button>
                    </div>
                  </div>
                  <p className="text-[13px] text-gray-600 leading-relaxed">{review.content}</p>
                  <p className="mt-2 text-[11px] text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="h-16 w-16 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-[15px] font-medium text-gray-400">暂无评价</p>
              <p className="text-[13px] text-gray-400 mt-1">完成服务后客户可以留下评价</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewsPage;
