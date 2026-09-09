import React, { useState, useEffect } from 'react';
import type { WorkTimeScheme } from '../contexts/authTypes';
import { DAY_KEYS, DAY_LABELS } from '../utils/workSchedule';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

interface SchemeEditorModalProps {
  open: boolean;
  scheme: WorkTimeScheme;
  onSave: (s: WorkTimeScheme) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const SchemeEditorModal: React.FC<SchemeEditorModalProps> = ({
  open,
  scheme,
  onSave,
  onDelete,
  onClose,
}) => {
  const [localScheme, setLocalScheme] = useState<WorkTimeScheme>(scheme);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setLocalScheme(scheme);
      setError('');
    }
  }, [open, scheme]);

  if (!open) return null;

  const handleSave = () => {
    setError('');

    if (localScheme.days.length === 0) {
      setError('请选择应用的工作日');
      return;
    }

    const startIndex = TIME_OPTIONS.indexOf(localScheme.startTime);
    const endIndex = TIME_OPTIONS.indexOf(localScheme.endTime);
    if (startIndex >= endIndex) {
      setError('结束时间需晚于开始时间');
      return;
    }

    onSave(localScheme);
  };

  const toggleDay = (dayKey: string) => {
    setLocalScheme((prev) => ({
      ...prev,
      days: prev.days.includes(dayKey)
        ? prev.days.filter((d) => d !== dayKey)
        : [...prev.days, dayKey],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-white sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--nb-line)]">
          <h2 className="text-lg font-bold text-[var(--nb-ink)]">工作时间方案</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-[var(--nb-page)] text-[var(--nb-secondary)] text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Time Range */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--nb-ink)]">
              工作时间
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-[var(--nb-secondary)] mb-1">开始</label>
                <select
                  value={localScheme.startTime}
                  onChange={(e) => setLocalScheme(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full min-h-[44px] rounded-xl border border-[var(--nb-line)] bg-white px-3 py-2 text-sm font-medium text-[var(--nb-ink)] focus:border-[var(--nb-control)] focus:outline-none"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <span className="text-[var(--nb-muted)] mt-6">—</span>
              <div className="flex-1">
                <label className="block text-xs text-[var(--nb-secondary)] mb-1">结束</label>
                <select
                  value={localScheme.endTime}
                  onChange={(e) => setLocalScheme(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full min-h-[44px] rounded-xl border border-[var(--nb-line)] bg-white px-3 py-2 text-sm font-medium text-[var(--nb-ink)] focus:border-[var(--nb-control)] focus:outline-none"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Days */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--nb-ink)]">
              应用范围
            </label>
            <div className="grid grid-cols-7 gap-2">
              {DAY_KEYS.map((dayKey) => (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => toggleDay(dayKey)}
                  className={`min-h-[44px] rounded-xl text-xs font-medium transition-colors ${
                    localScheme.days.includes(dayKey)
                      ? 'bg-[var(--nb-action)] text-white'
                      : 'bg-[var(--nb-page)] text-[var(--nb-secondary)] hover:bg-[var(--nb-pressed)]'
                  }`}
                >
                  {DAY_LABELS[dayKey]}
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--nb-ink)]">
              方案标签
            </label>
            <input
              type="text"
              value={localScheme.label}
              onChange={(e) => setLocalScheme(prev => ({ ...prev, label: e.target.value }))}
              placeholder="如：日常、周末"
              className="w-full min-h-[44px] rounded-xl border border-[var(--nb-line)] bg-white px-4 py-3 text-sm text-[var(--nb-ink)] placeholder-[var(--nb-muted)] focus:border-[var(--nb-control)] focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-[var(--nb-line)]">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onDelete}
              className="min-h-[44px] px-4 rounded-xl bg-[var(--nb-page)] text-[var(--nb-secondary)] text-sm font-medium hover:bg-[var(--nb-page)] active:bg-[var(--nb-pressed)]"
            >
              删除
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="min-h-[44px] px-6 rounded-xl bg-[var(--nb-page)] text-[var(--nb-ink)] text-sm font-medium hover:bg-[var(--nb-pressed)] active:bg-[var(--nb-pressed)]"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="min-h-[44px] px-6 rounded-xl bg-[var(--nb-action)] text-white text-sm font-medium hover:bg-[var(--nb-action)] active:bg-[var(--nb-action-pressed)]"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};