import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { publicArtistService, type PublicArtistCard } from '../services/publicArtist';

const weekdays: Record<number, string> = { 0: '周日', 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六' };

const PublicShopDetail: React.FC = () => {
  const { code, index = '0' } = useParams<{ code: string; index: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PublicArtistCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    publicArtistService.getCard(code).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [code]);

  const shopIndex = Math.max(0, Number(index) || 0);
  const shop = data?.artist.shopAddresses?.[shopIndex];
  const fullAddress = shop && [shop.province, shop.city, shop.district, shop.detailAddress].filter(Boolean).join(' ');

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[var(--nb-page)]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--nb-ink)] border-t-transparent" /></div>;
  if (!shop || !data) return <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--nb-page)] px-8 text-center"><p className="font-medium text-[var(--nb-ink)]">店铺不存在或已暂停展示</p><button onClick={() => navigate(-1)} className="min-h-11 rounded-full bg-[var(--nb-action)] px-6 text-white">返回</button></div>;

  return (
    <div className="min-h-screen bg-[var(--nb-page)] pb-28">
      <header className="sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b border-[var(--nb-line)] bg-white/95 px-4 backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} aria-label="返回" className="flex h-11 w-11 items-center justify-center rounded-full active:bg-[var(--nb-pressed)]">←</button>
        <h1 className="text-[17px] font-semibold text-[var(--nb-ink)]">店铺详情</h1>
      </header>
      <main className="mx-auto max-w-md space-y-4 px-5 py-5">
        {!!shop.photos?.length && <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1">{shop.photos.map((photo, photoIndex) => <img key={photo} src={photo} alt={`${shop.name}环境照片 ${photoIndex + 1}`} className="aspect-[4/3] w-[86%] shrink-0 snap-center rounded-2xl object-cover" />)}</div>}
        <section className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-[var(--nb-ink)]">{shop.name}</h2><p className="mt-1 text-sm text-[var(--nb-secondary)]">{data.artist.name} 的店铺</p></div><span className="rounded-full bg-[var(--nb-page)] px-3 py-1.5 text-xs text-[var(--nb-secondary)]">营业中</span></div>{shop.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--nb-secondary)]">{shop.description}</p>}</section>
        {data.artist.shopAddresses.length > 1 && <section className="flex gap-2 overflow-x-auto">{data.artist.shopAddresses.map((item, itemIndex) => <button key={`${item.name}-${itemIndex}`} onClick={() => navigate(`/artist/${encodeURIComponent(code || '')}/shops/${itemIndex}`, { replace: true })} className={`min-h-11 shrink-0 rounded-full px-4 text-sm ${itemIndex === shopIndex ? 'bg-[var(--nb-action)] text-white' : 'bg-white text-[var(--nb-secondary)]'}`}>{item.name}</button>)}</section>}
        <section className="rounded-2xl bg-white p-5 shadow-sm"><h3 className="font-semibold text-[var(--nb-ink)]">地址与联系</h3><p className="mt-3 text-sm leading-6 text-[var(--nb-secondary)]">{fullAddress || '地址暂未完善'}</p>{shop.doorInfo && <p className="mt-1 text-sm text-[var(--nb-muted)]">到店提示：{shop.doorInfo}</p>}{shop.phone && <a href={`tel:${shop.phone}`} className="mt-3 flex min-h-11 items-center text-sm font-medium text-[var(--nb-link)]">联系电话：{shop.phone}</a>}</section>
        {!!shop.businessHours?.length && <section className="rounded-2xl bg-white p-5 shadow-sm"><h3 className="font-semibold text-[var(--nb-ink)]">营业时间</h3><div className="mt-3 space-y-2">{shop.businessHours.map((hour) => <div key={hour.weekday} className="flex justify-between text-sm"><span className="text-[var(--nb-secondary)]">{weekdays[hour.weekday]}</span><span className="text-[var(--nb-ink)]">{hour.closed ? '休息' : `${hour.start}–${hour.end}`}</span></div>)}</div></section>}
        {!!shop.qualifications?.length && <section className="rounded-2xl bg-white p-5 shadow-sm"><h3 className="font-semibold text-[var(--nb-ink)]">店铺资质</h3><div className="mt-4 grid grid-cols-2 gap-3">{shop.qualifications.map((item, itemIndex) => <div key={`${item.name}-${itemIndex}`} className="overflow-hidden rounded-xl bg-[var(--nb-page)]">{item.imageUrl && <img src={item.imageUrl} alt={item.name} className="aspect-[4/3] w-full object-cover" />}<p className="p-3 text-sm font-medium text-[var(--nb-ink)]">{item.name}</p></div>)}</div></section>}
      </main>
      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--nb-line)] bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><button onClick={() => navigate(`/orders/create?tech_id=${data.artist.id}`)} className="mx-auto block min-h-11 w-full max-w-md rounded-full bg-[var(--nb-action)] px-6 font-medium text-white active:bg-[var(--nb-action-pressed)]">预约咨询</button></div>
    </div>
  );
};

export default PublicShopDetail;
