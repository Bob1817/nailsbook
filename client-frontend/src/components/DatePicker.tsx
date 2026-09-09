import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  minDate,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [selectedDay, setSelectedDay] = useState(dayjs().date());

  const years = Array.from({ length: 12 }, (_, i) => dayjs().year() + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = dayjs(`${selectedYear}-${selectedMonth}`).daysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => {
    if (value) {
      const date = dayjs(value);
      setSelectedYear(date.year());
      setSelectedMonth(date.month() + 1);
      setSelectedDay(date.date());
    }
  }, [value]);

  useEffect(() => {
    const maxDays = dayjs(`${selectedYear}-${selectedMonth}`).daysInMonth();
    if (selectedDay > maxDays) {
      requestAnimationFrame(() => setSelectedDay(maxDays));
    }
  }, [selectedYear, selectedMonth, selectedDay]);

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleConfirm = () => {
    const dateStr = formatDate(selectedYear, selectedMonth, selectedDay);
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (value) {
      const date = dayjs(value);
      setSelectedYear(date.year());
      setSelectedMonth(date.month() + 1);
      setSelectedDay(date.date());
    }
    setIsOpen(false);
  };

  const isDateDisabled = (year: number, month: number, day: number) => {
    const dateStr = formatDate(year, month, day);
    if (minDate && dayjs(dateStr).isBefore(dayjs(minDate), 'day')) {
      return true;
    }
    return false;
  };

  const displayValue = value ? dayjs(value).format('YYYY年MM月DD日') : '选择日期';

  const PickerContent = () => (
    <div className="w-full max-w-md rounded-t-3xl bg-white">
      <div className="flex items-center justify-between border-b border-[var(--nb-line)] px-5 py-4 safe-area-bottom">
        <button
          onClick={handleCancel}
          className="text-base font-medium text-[var(--nb-secondary)]"
        >
          取消
        </button>
        <span className="text-base font-semibold text-[var(--nb-ink)]">选择日期</span>
        <button
          onClick={handleConfirm}
          className="text-base font-semibold text-[var(--nb-ink)]"
        >
          确定
        </button>
      </div>

      <div className="flex h-56 justify-center overflow-hidden py-4">
        <div className="relative flex w-full items-center px-4">
          <div className="flex flex-1 flex-col items-center">
            <span className="mb-2 text-xs text-[var(--nb-muted)]">年</span>
            <div className="scrollbar-hide h-44 w-full overflow-y-auto">
              <div className="py-[60px]">
                {years.map((year) => (
                  <div
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`flex h-11 items-center justify-center text-base ${
                      selectedYear === year ? 'font-semibold text-[var(--nb-ink)]' : 'text-[var(--nb-muted)]'
                    }`}
                  >
                    {year}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 top-1/2 -translate-y-1/2">
            <div className="mx-auto h-11 w-full max-w-[80px] rounded-xl bg-[var(--nb-page)]/80" />
          </div>

          <div className="flex flex-1 flex-col items-center">
            <span className="mb-2 text-xs text-[var(--nb-muted)]">月</span>
            <div className="scrollbar-hide h-44 w-full overflow-y-auto">
              <div className="py-[60px]">
                {months.map((month) => (
                  <div
                    key={month}
                    onClick={() => setSelectedMonth(month)}
                    className={`flex h-11 items-center justify-center text-base ${
                      selectedMonth === month ? 'font-semibold text-[var(--nb-ink)]' : 'text-[var(--nb-muted)]'
                    }`}
                  >
                    {month}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center">
            <span className="mb-2 text-xs text-[var(--nb-muted)]">日</span>
            <div className="scrollbar-hide h-44 w-full overflow-y-auto">
              <div className="py-[60px]">
                {days.map((day) => {
                  const disabled = isDateDisabled(selectedYear, selectedMonth, day);
                  return (
                    <div
                      key={day}
                      onClick={() => !disabled && setSelectedDay(day)}
                      className={`flex h-11 items-center justify-center text-base ${
                        selectedDay === day && !disabled
                          ? 'font-semibold text-[var(--nb-ink)]'
                          : disabled
                          ? 'cursor-not-allowed text-[var(--nb-inverse)]'
                          : 'text-[var(--nb-muted)]'
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`w-full rounded-2xl bg-[var(--nb-page)] px-4 py-3 text-left text-[var(--nb-ink)] outline-none ring-1 ring-transparent focus:ring-[var(--nb-control)]/20 ${className}`}
      >
        {displayValue}
      </button>

      {isOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCancel();
            }
          }}
        >
          {PickerContent()}
        </div>,
        document.body
      )}
    </>
  );
};

export default DatePicker;
