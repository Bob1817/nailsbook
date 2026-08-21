import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { publicArtistService, type PublicArtistCard } from '../services/publicArtist';

const ArtistWorksPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PublicArtistCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (!code) {
      setError(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-8 text-center">
        <p className="text-base font-medium text-gray-900">页面不存在</p>
        <p className="text-sm text-gray-500">请检查链接是否正确</p>
      </div>
    );
  }

  const { artist, works } = data;

  // For now, show all works since we don't have style tags on works yet
  const filteredWorks = works;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors active:bg-gray-200"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-[17px] font-semibold text-gray-900">{artist.name}的作品集</h1>
              <p className="text-[12px] text-gray-500">{works.length}件作品</p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors active:bg-gray-200"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>

        {/* Filter Tags */}
        <div className="px-5 pb-3 flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            }`}
          >
            全部
          </button>
          {/* Add more filters when work style tags are available */}
        </div>
      </div>

      {/* Works Grid */}
      <div className="px-4 py-4">
        {filteredWorks.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredWorks.map((work) => (
              <button
                key={work.id}
                type="button"
                onClick={() => navigate(`/works/${work.id}`)}
                className="group overflow-hidden rounded-xl bg-gray-50 transition-transform active:scale-[0.98]"
              >
                <div className="aspect-square overflow-hidden">
                  {work.coverUrl || work.imageUrls?.[0] ? (
                    <img
                      src={work.coverUrl || work.imageUrls[0]}
                      alt={work.title || '美甲作品'}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100">
                      <svg className="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                {work.title && (
                  <div className="px-3 py-2.5">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{work.title}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="h-16 w-16 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[15px] font-medium text-gray-400">暂无作品</p>
            <p className="text-[13px] text-gray-400 mt-1">该美甲师还未发布作品</p>
          </div>
        )}
      </div>

      {/* Bottom safe area */}
      <div className="h-safe-bottom" />
    </div>
  );
};

export default ArtistWorksPage;
