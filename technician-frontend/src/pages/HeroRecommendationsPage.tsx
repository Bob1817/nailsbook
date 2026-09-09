import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { worksService, type Work } from '../services/works';

type HeroWork = Pick<Work, 'id' | 'title' | 'coverUrl'>;
const button = 'min-h-11 rounded-lg px-4 text-sm bg-[var(--nb-page)] text-[var(--nb-secondary)] active:bg-[var(--nb-pressed)] focus-visible:outline disabled:opacity-50';
const message = (error: unknown) => (error as { response?: { data?: { message?: string } } })?.response?.data?.message || '操作失败，请重试';

export default function HeroRecommendationsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const targetId = Number(params.get('workId'));
  const [all, setAll] = useState<Work[]>([]);
  const [selected, setSelected] = useState<HeroWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const load = async () => {
    setLoading(true); setError('');
    try {
      const [works, current] = await Promise.all([worksService.list(), api.get('/works/hero-recommendations')]);
      setAll(works.filter(w => w.isVisible && w.visibilityScope === 'public' && w.publicationStatus === 'approved' && !w.archivedAt && w.coverUrl));
      setSelected(current.data.works);
    } catch (e) { setError(message(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const save = async (ids: number[]) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const result = await api.put('/works/hero-recommendations', { workIds: ids, expectedWorkIds: selected.map(w => w.id) });
      setSelected(result.data.works); setReplaceIndex(null);
    } catch (e) {
      setError(message(e));
      try { const result = await api.get('/works/hero-recommendations'); setSelected(result.data.works); setReplaceIndex(null); } catch { /* Keep current selection until retry. */ }
    } finally { inFlight.current = false; setBusy(false); }
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= selected.length) return;
    const ids = selected.map(w => w.id); [ids[from], ids[to]] = [ids[to], ids[from]]; void save(ids);
  };
  const candidates = all.filter(w => !selected.some(s => s.id === w.id));
  candidates.sort((a,b) => Number(b.id === targetId) - Number(a.id === targetId));
  return <main className="min-h-screen bg-[var(--nb-page)] p-5 pb-[max(6rem,env(safe-area-inset-bottom))] text-[var(--nb-ink)]">
    <div className="mx-auto max-w-xl">
      <button className={button} onClick={() => navigate('/works')}>返回作品</button>
      <h1 className="mt-5 text-lg font-semibold">客户首页推荐 {selected.length}/3</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--nb-muted)]">客户首页会结合其绑定的美甲师分配展示，推荐不代表每次全部展示。顺序靠前的作品优先展示。</p>
      {error && <div role="alert" className="my-4 text-sm">{error}<button className={button} disabled={busy} onClick={load}>重新加载</button></div>}
      {loading ? <p className="py-8 text-sm">加载中…</p> : <>
        {!selected.length && <p className="py-6 text-sm text-[var(--nb-muted)]">尚未设置首页推荐</p>}
        {selected.map((work,index) => <section key={work.id} className="mt-4 rounded-xl bg-[var(--nb-surface)] p-4">
          <div className="flex items-center gap-4"><img src={work.coverUrl || ''} alt={work.title || '推荐作品'} className="h-20 w-20 shrink-0 rounded-lg object-cover"/><p className="min-w-0 break-words text-sm">{index + 1} · {work.title || '未命名作品'}</p></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className={button} disabled={busy} onClick={() => setReplaceIndex(index)}>替换</button>
            <button className={button} disabled={busy} onClick={() => { if (confirm('取消该作品的客户首页推荐？个人主页精选保持原有设置。')) void save(selected.filter(w => w.id !== work.id).map(w => w.id)); }}>取消推荐</button>
            <button className={button} disabled={busy || index === 0} onClick={() => move(index,index - 1)}>上移</button>
            <button className={button} disabled={busy || index === selected.length - 1} onClick={() => move(index,index + 1)}>下移</button>
          </div>
        </section>)}
        {selected.length < 3 && <button className={`${button} mt-4 w-full`} disabled={busy || !!error} onClick={() => setReplaceIndex(-1)}>添加推荐作品</button>}
        <p className="mt-4 text-xs leading-relaxed text-[var(--nb-muted)]">仅支持公开可见、审核通过、未归档且有封面的作品。隐藏、转为私密或重新提交审核后会移出推荐。</p>
      </>}
      {replaceIndex !== null && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={() => { if (!busy) setReplaceIndex(null); }}>
        <section role="dialog" aria-modal="true" aria-label="选择推荐作品" className="max-h-[80dvh] w-full max-w-xl overflow-y-auto rounded-xl bg-[var(--nb-surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold">{replaceIndex < 0 ? '添加推荐' : '选择替换作品'}</h2><button className={button} disabled={busy} onClick={() => setReplaceIndex(null)}>关闭</button></div>
          {!candidates.length && <p className="py-6 text-sm">暂无可选作品，请先发布作品并等待审核通过</p>}
          {candidates.map(work => <button key={work.id} disabled={busy} className="my-2 flex min-h-11 w-full items-center gap-4 rounded-lg p-2 text-left active:bg-[var(--nb-page)] focus-visible:outline" onClick={() => {
            if (!confirm(replaceIndex < 0 ? `推荐“${work.title || '未命名作品'}”到客户首页？` : `将“${selected[replaceIndex].title || '未命名作品'}”替换为“${work.title || '未命名作品'}”？`)) return;
            const ids = selected.map(w => w.id); if (replaceIndex < 0) ids.push(work.id); else ids[replaceIndex] = work.id; void save(ids);
          }}><img src={work.coverUrl || ''} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover"/><span className="min-w-0 break-words text-sm">{work.title || '未命名作品'}</span></button>)}
        </section>
      </div>}
    </div>
  </main>;
}
