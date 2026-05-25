import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { Card } from '../components/base/Card';
import type { DaySchedule, ServiceSchedule } from '../contexts/authTypes';

const DAY_LABELS: Record<string, string> = {
  mon: '周一',
  tue: '周二',
  wed: '周三',
  thu: '周四',
  fri: '周五',
  sat: '周六',
  sun: '周日',
};

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

function buildDefaultSchedule(): ServiceSchedule {
  const days: Record<string, DaySchedule> = {};
  for (const key of DAY_KEYS) {
    days[key] = { enabled: true, startTime: '10:00', endTime: '21:00' };
  }
  return { days };
}

function mergeSchedule(saved: ServiceSchedule | null | undefined): ServiceSchedule {
  const defaults = buildDefaultSchedule();
  if (!saved?.days) return defaults;
  const merged: Record<string, DaySchedule> = {};
  for (const key of DAY_KEYS) {
    merged[key] = saved.days[key] ?? defaults.days[key];
  }
  return { days: merged };
}

export const ServiceTimePage: React.FC = () => {
  const navigate = useNavigate();
  const { technician, updateTechnicianProfile } = useAuth();
  const toast = useToast();
  const [schedule, setSchedule] = useState<ServiceSchedule>(() =>
    mergeSchedule(technician?.serviceSchedule),
  );
  const [saving, setSaving] = useState(false);

  const toggleDay = useCallback((key: string) => {
    setSchedule((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [key]: { ...prev.days[key], enabled: !prev.days[key].enabled },
      },
    }));
  }, []);

  const updateTime = useCallback((key: string, field: 'startTime' | 'endTime', value: string) => {
    setSchedule((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [key]: { ...prev.days[key], [field]: value },
      },
    }));
  }, []);

  const enabledCount = DAY_KEYS.filter((k) => schedule.days[k].enabled).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTechnicianProfile({ serviceSchedule: schedule });
      toast.success('服务时间已保存');
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
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
        <h1 className="text-[17px] font-semibold text-[#1f2230]">服务时间</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
      <div className="px-5 pt-5 space-y-4">
        <Card className="p-4 shadow-[0_12px_28px_rgba(36,27,41,0.05)]">
          <p className="text-[13px] text-[#7f7681] leading-relaxed">
            设置每周可接单的时间段。关闭的日期将不会出现在客户预约可选时间中。
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-[#EEF9F1] px-2.5 py-1 text-[11px] font-semibold text-[#31B46C]">
              每周 {enabledCount} 天接单
            </span>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden shadow-[0_12px_28px_rgba(36,27,41,0.05)]">
          {DAY_KEYS.map((key, index) => {
            const day = schedule.days[key];
            return (
              <div
                key={key}
                className={`px-4 py-3.5 ${index < DAY_KEYS.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-[15px] font-semibold ${day.enabled ? 'text-[#1f2230]' : 'text-[#b0aab4]'}`}>
                      {DAY_LABELS[key]}
                    </span>
                    {!day.enabled && (
                      <span className="rounded-full bg-[#f2f0f3] px-2 py-0.5 text-[10px] text-[#8d8590]">休息</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleDay(key)}
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      day.enabled ? 'bg-[#31B46C]' : 'bg-[#ddd8de]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                        day.enabled ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {day.enabled && (
                  <div className="mt-3 flex items-center gap-2">
                    <label className="flex items-center gap-1.5">
                      <span className="text-[12px] text-[#7f7681]">开始</span>
                      <select
                        value={day.startTime}
                        onChange={(e) => updateTime(key, 'startTime', e.target.value)}
                        className="rounded-[10px] border border-[#e5e2e6] bg-white px-2.5 py-1.5 text-[13px] font-medium text-[#1f2230] min-h-[36px]"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <span className="text-[#b0aab4]">—</span>
                    <label className="flex items-center gap-1.5">
                      <span className="text-[12px] text-[#7f7681]">结束</span>
                      <select
                        value={day.endTime}
                        onChange={(e) => updateTime(key, 'endTime', e.target.value)}
                        className="rounded-[10px] border border-[#e5e2e6] bg-white px-2.5 py-1.5 text-[13px] font-medium text-[#1f2230] min-h-[36px]"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              const all: ServiceSchedule = { days: {} };
              for (const key of DAY_KEYS) {
                all.days[key] = { enabled: true, startTime: '10:00', endTime: '21:00' };
              }
              setSchedule(all);
            }}
            className="flex-1 min-h-[48px] rounded-[16px] bg-[#f7f3f5] text-[14px] font-semibold text-[#6d6570] active:bg-[#ece8eb]"
          >
            全部开启
          </button>
          <button
            type="button"
            onClick={() => {
              const none: ServiceSchedule = { days: {} };
              for (const key of DAY_KEYS) {
                none.days[key] = { enabled: false, startTime: '10:00', endTime: '21:00' };
              }
              setSchedule(none);
            }}
            className="flex-1 min-h-[48px] rounded-[16px] bg-[#f7f3f5] text-[14px] font-semibold text-[#6d6570] active:bg-[#ece8eb]"
          >
            全部关闭
          </button>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="w-full min-h-[52px] rounded-[18px] bg-[#FF5E93] text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(255,94,147,0.25)] active:bg-[#e54e82] disabled:opacity-60"
        >
          {saving ? '保存中...' : '保存服务时间'}
        </button>
      </div>
      </div>
    </div>
  );
};
