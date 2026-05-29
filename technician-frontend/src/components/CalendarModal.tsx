import React, { useState } from 'react';

interface CalendarModalProps {
  /** 当前选中的日期 */
  selectedDate: Date;
  /** 有预约的日期键集合，格式 'YYYY-MM-DD' */
  markedDateKeys: Set<string>;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const toKey = (year: number, month: number, day: number) =>
  `${year}-${`${month + 1}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`;

const isSameYMD = (date: Date, y: number, m: number, d: number) =>
  date.getFullYear() === y && date.getMonth() === m && date.getDate() === d;

export const CalendarModal: React.FC<CalendarModalProps> = ({
  selectedDate,
  markedDateKeys,
  onSelect,
  onClose,
}) => {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const today = new Date();

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-[28px] bg-white px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-[0_-12px_40px_rgba(15,23,42,0.12)] animate-slide-up sm:max-w-sm sm:rounded-[28px] sm:pb-5"
      >
        {/* 头部：月份导航 */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={goPrevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f3f5] active:bg-[#eee5e9]"
          >
            <svg className="h-5 w-5 text-[#3c3440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-[17px] font-semibold text-[#1f2230]">
            {viewYear}年{viewMonth + 1}月
          </div>
          <button
            type="button"
            onClick={goNextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f3f5] active:bg-[#eee5e9]"
          >
            <svg className="h-5 w-5 text-[#3c3440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 星期表头 */}
        <div className="grid grid-cols-7 text-center">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 text-xs text-[#a89ba3]">{w}</div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, index) => {
            if (day === null) return <div key={`blank-${index}`} />;
            const isSelected = isSameYMD(selectedDate, viewYear, viewMonth, day);
            const isToday = isSameYMD(today, viewYear, viewMonth, day);
            const hasOrders = markedDateKeys.has(toKey(viewYear, viewMonth, day));

            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelect(new Date(viewYear, viewMonth, day))}
                className="flex flex-col items-center py-1"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors ${
                    isSelected
                      ? 'bg-[#FF5E93] font-semibold text-white'
                      : isToday
                        ? 'font-semibold text-[#FF5E93] ring-1 ring-[#FFC2D6]'
                        : 'text-[#3c3440] active:bg-[#fff1f6]'
                  }`}
                >
                  {day}
                </span>
                <span
                  className={`mt-0.5 h-1 w-1 rounded-full ${
                    hasOrders ? (isSelected ? 'bg-[#FF5E93]' : 'bg-[#22c55e]') : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* 底部操作 */}
        <div className="mt-3 flex items-center justify-between border-t border-[#f6eef2] pt-3">
          <span className="flex items-center gap-1.5 text-xs text-[#a89ba3]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            有预约
          </span>
          <button
            type="button"
            onClick={goToday}
            className="rounded-full bg-[#fff1f6] px-4 py-1.5 text-[13px] font-semibold text-[#FF5E93] active:bg-[#ffe4ee]"
          >
            回到今天
          </button>
        </div>
      </div>
    </div>
  );
};
