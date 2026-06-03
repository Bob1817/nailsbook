import React, { useState, useEffect } from 'react';

interface RestDayCalendarProps {
  open: boolean;
  value: string[];
  onConfirm: (dates: string[]) => void;
  onClose: () => void;
}

export const RestDayCalendar: React.FC<RestDayCalendarProps> = ({
  open,
  value,
  onConfirm,
  onClose,
}) => {
  const [selected, setSelected] = useState<string[]>(value);
  const [viewMonth, setViewMonth] = useState(new Date());

  useEffect(() => {
    if (open) {
      setSelected(value);
    }
  }, [open, value]);

  if (!open) return null;

  const today = new Date();
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  // Get first day of month and how many days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

  const prevMonth = () => {
    setViewMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewMonth(new Date(year, month + 1, 1));
  };

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const toggleDate = (day: number) => {
    const date = new Date(year, month, day);
    const dateStr = formatDate(date);

    // Don't allow selecting past dates
    if (date < today && formatDate(date) !== formatDate(today)) {
      return;
    }

    setSelected(prev =>
      prev.includes(dateStr)
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  const monthName = `${year}年${month + 1}月`;
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // Create calendar grid
  const calendar = [];

  // Add empty cells for days before the first day of month
  for (let i = 0; i < startDayOfWeek; i++) {
    calendar.push(<div key={`empty-${i}`} className="h-11"></div>);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDate(date);
    const isSelected = selected.includes(dateStr);
    const isPast = date < today && formatDate(date) !== formatDate(today);

    calendar.push(
      <button
        key={day}
        type="button"
        disabled={isPast}
        onClick={() => toggleDate(day)}
        className={`h-11 w-11 rounded-lg text-sm font-medium transition-colors ${
          isPast
            ? 'text-gray-300 cursor-not-allowed'
            : isSelected
            ? 'bg-[#FF5E93] text-white'
            : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
        }`}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-white sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-gray-900">{monthName}</h2>
            <button
              onClick={nextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Week headers */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {weekDays.map((day) => (
              <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendar}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gray-100">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 min-h-[44px] rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 active:bg-gray-300"
            >
              取消
            </button>
            <button
              onClick={() => onConfirm(selected)}
              className="flex-1 min-h-[44px] rounded-xl bg-[#FF5E93] text-white text-sm font-medium hover:bg-[#e54e82] active:bg-[#d1457a]"
            >
              设置为休息日
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};