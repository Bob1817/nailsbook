import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { Card } from '../components/base/Card';
import type { CustomTag } from '../contexts/authTypes';
import { customersService } from '../services/customers';

const TAG_COLORS = [
  { bg: '#FFE9F0', text: '#FF5E93', name: '粉' },
  { bg: '#FFF1E5', text: '#C9792A', name: '橙' },
  { bg: '#EEF9F1', text: '#31B46C', name: '绿' },
  { bg: '#EBF4FF', text: '#3B82F6', name: '蓝' },
  { bg: '#F5F0FF', text: '#7C3AED', name: '紫' },
  { bg: '#FFF8E6', text: '#C9860A', name: '黄' },
  { bg: '#F2F0F3', text: '#6D6570', name: '灰' },
  { bg: '#FFE4E4', text: '#E53E3E', name: '红' },
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const TagManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { technician, updateTechnicianProfile } = useAuth();
  const toast = useToast();

  const [tags, setTags] = useState<CustomTag[]>(() => technician?.customTags ?? []);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerTagCounts, setCustomerTagCounts] = useState<Record<string, number>>({});

  useMemo(() => {
    customersService.getDistinctTags().then((existingTags) => {
      const counts: Record<string, number> = {};
      existingTags.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
      setCustomerTagCounts(counts);
    }).catch(() => {});
  }, []);

  const handleAdd = async () => {
    const name = newTagName.trim();
    if (!name) return;
    if (tags.some((t) => t.name === name)) {
      toast.error('标签名称已存在');
      return;
    }
    const newTag: CustomTag = { id: generateId(), name, color: newTagColor.text };
    const next = [...tags, newTag];
    setTags(next);
    setNewTagName('');
    setShowAdd(false);

    setSaving(true);
    try {
      await updateTechnicianProfile({ customTags: next });
      toast.success('标签已添加');
    } catch {
      toast.error('保存失败');
      setTags(tags);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const target = tags.find((t) => t.id === id);
    if (target && customerTagCounts[target.name]) {
      toast.error(`该标签正被 ${customerTagCounts[target.name]} 位客户使用，请先移除客户标签`);
      return;
    }
    const next = tags.filter((t) => t.id !== id);
    setTags(next);
    setSaving(true);
    try {
      await updateTechnicianProfile({ customTags: next });
      toast.success('标签已删除');
    } catch {
      toast.error('保存失败');
      setTags(tags);
    } finally {
      setSaving(false);
    }
  };

  const getColorMeta = (color: string) => {
    return TAG_COLORS.find((c) => c.text === color) ?? TAG_COLORS[0];
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-x-hidden bg-[#fff9f8]">
      <div className="shrink-0 flex items-center gap-3 bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[#f2e6ec]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f3f5] active:bg-[#eee5e9]"
        >
          <svg className="h-5 w-5 text-[#3c3440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-[#1f2230]">标签管理</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
      <div className="px-5 pt-5 space-y-4">
        <Card className="p-4 shadow-[0_12px_28px_rgba(36,27,41,0.05)]">
          <p className="text-[13px] text-[#7f7681] leading-relaxed">
            创建自定义标签，用于对客户进行分类管理。在客户详情中可为客户贴标签。
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-[#ffe9f0] px-2.5 py-1 text-[11px] font-semibold text-[#FF5E93]">
              共 {tags.length} 个标签
            </span>
          </div>
        </Card>

        {/* Add tag button / form */}
        {!showAdd ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="w-full min-h-[48px] rounded-[16px] bg-white text-[14px] font-semibold text-[#FF5E93] shadow-[0_8px_20px_rgba(36,27,41,0.05)] ring-1 ring-[#f2e6ec] active:bg-[#fff9f8] flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增标签
          </button>
        ) : (
          <Card className="p-4 shadow-[0_12px_28px_rgba(36,27,41,0.05)]">
            <p className="text-[13px] font-semibold text-[#1f2230] mb-3">新增标签</p>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="输入标签名称"
              maxLength={10}
              className="w-full rounded-[12px] border border-[#e5e2e6] bg-white px-3.5 py-2.5 text-[14px] text-[#1f2230] placeholder:text-[#b0aab4] min-h-[44px]"
            />
            <p className="mt-3 mb-2 text-[12px] text-[#7f7681]">选择颜色</p>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((color) => (
                <button
                  key={color.text}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                    newTagColor.text === color.text ? 'ring-2 ring-offset-2 ring-[#FF5E93] scale-110' : ''
                  }`}
                  style={{ backgroundColor: color.bg }}
                >
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color.text }} />
                </button>
              ))}
            </div>
            {newTagName.trim() && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[12px] text-[#7f7681]">预览</span>
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium"
                  style={{ backgroundColor: newTagColor.bg, color: newTagColor.text }}
                >
                  {newTagName.trim()}
                </span>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { setShowAdd(false); setNewTagName(''); }}
                className="flex-1 min-h-[40px] rounded-[12px] bg-[#f7f3f5] text-[13px] font-semibold text-[#6d6570] active:bg-[#ece8eb]"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!newTagName.trim() || saving}
                onClick={handleAdd}
                className="flex-1 min-h-[40px] rounded-[12px] bg-[#FF5E93] text-[13px] font-semibold text-white active:bg-[#e54e82] disabled:opacity-50"
              >
                添加
              </button>
            </div>
          </Card>
        )}

        {/* Tag list */}
        {tags.length > 0 ? (
          <Card className="p-0 overflow-hidden shadow-[0_12px_28px_rgba(36,27,41,0.05)]">
            {tags.map((tag, index) => {
              const colorMeta = getColorMeta(tag.color);
              const usageCount = customerTagCounts[tag.name] ?? 0;
              return (
                <div
                  key={tag.id}
                  className={`flex items-center justify-between px-4 py-3.5 ${
                    index < tags.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium shrink-0"
                      style={{ backgroundColor: colorMeta.bg, color: tag.color }}
                    >
                      {tag.name}
                    </span>
                    {usageCount > 0 && (
                      <span className="text-[11px] text-[#a09aa2]">{usageCount} 位客户</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(tag.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff0f0] active:bg-[#ffe0e0]"
                  >
                    <svg className="h-4 w-4 text-[#e53e3e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </Card>
        ) : (
          <div className="rounded-[22px] bg-white px-4 py-8 text-center shadow-[0_8px_20px_rgba(36,27,41,0.04)]">
            <p className="text-[28px] mb-2">🏷️</p>
            <p className="text-[14px] text-[#8d8590]">暂无自定义标签</p>
            <p className="mt-1 text-[12px] text-[#a09aa2]">点击上方"新增标签"开始创建</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
