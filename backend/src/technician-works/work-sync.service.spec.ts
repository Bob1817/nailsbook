import { noteUrl, parseNote, WorkSyncService } from './work-sync.service';

describe('work sync', () => {
  it('accepts shared text and rejects untrusted URLs', () => {
    expect(noteUrl('分享 https://xhslink.com/a/abc')).toBe('https://xhslink.com/a/abc');
    for (const link of ['https://evil.com/a', 'https://xiaohongshu.com.evil.com/a', 'https://u:p@xiaohongshu.com/a', 'https://xiaohongshu.com:99/a']) expect(() => noteUrl(link)).toThrow();
  });
  it('extracts only the requested note, in image order', () => {
    const html = '<script>window.__INITIAL_STATE__=' + JSON.stringify({ note: { noteDetailMap: { abc: { note: { title: '美甲', desc: '描述', imageList: [{ urlDefault: 'https://a.xhscdn.com/1' }, { urlDefault: 'https://a.xhscdn.com/2' }] } } } } }) + '</script>';
    expect(parseNote(html, 'note', 'abc')?.images).toHaveLength(2);
    expect(parseNote(html, 'note', 'wrong')).toBeNull();
  });
  it('marks summary as partial and rejects login pages', () => {
    const html = '<meta content="美甲 &amp; 春天" property="og:title"><meta property="og:image" content="https://a.xhscdn.com/1">';
    expect(parseNote(html, 'summary', 'abc')).toMatchObject({ title: '美甲 & 春天', partial: true });
    expect(parseNote(html.replace('美甲 &amp; 春天', '登录小红书'), 'summary', 'abc')).toBeNull();
  });
  it('never evaluates remote JavaScript', () => {
    expect(() => parseNote('<script>window.__INITIAL_STATE__=process.exit()</script>', 'note', 'abc')).toThrow();
  });
  it('blocks arbitrary media hosts before fetching', async () => {
    const service = new WorkSyncService({} as any);
    await expect(service.download('https://127.0.0.1/a', true)).rejects.toThrow();
    await expect(service.download('http://a.xhscdn.com/a', true)).rejects.toThrow();
  });
});
