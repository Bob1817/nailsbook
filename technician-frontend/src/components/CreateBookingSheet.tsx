import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { ordersService } from '../services/orders';
import { normalizeSchedule, activeScheme } from '../utils/workSchedule';
import { detectOrderConflict, type TechnicianCustomerSummary, type TechnicianOrder } from '../services/technicianData';

interface CreateBookingSheetProps {
  open: boolean;
  customers: TechnicianCustomerSummary[];
  presetCustomerId?: number | string;
  onClose: () => void;
  onCreated: (order: { id: number; isLocalDraft?: boolean }) => void;
}

// Utility function copied from OrdersPage
function buildEndTime(date: string, startTime: string, durationMinutes: number) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const start = new Date(`${date}T${startTime}:00`);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(start.getTime())) {
    return '';
  }

  const end = new Date(start.getTime() + durationMinutes * 60000);
  return end.toISOString();
}

// Generate time slots from start to end time (30-minute intervals)
function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  let currentMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  while (currentMinutes < endTotalMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    slots.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    currentMinutes += 30;
  }

  return slots;
}

// Format date as YYYY-MM-DD
function formatDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Map JS weekday to dayKey (constant outside component)
const DAY_KEY_MAP = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const CreateBookingSheet: React.FC<CreateBookingSheetProps> = ({
  open,
  customers,
  presetCustomerId,
  onClose,
  onCreated,
}) => {
  const { technician } = useAuth();
  const toast = useToast();

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [startClock, setStartClock] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calendar state
  const [viewMonth, setViewMonth] = useState(new Date());
  const [dateHint, setDateHint] = useState('');

  // Orders for conflict detection
  const [orders, setOrders] = useState<TechnicianOrder[]>([]);

  // Initialize/reset form when sheet opens
  useEffect(() => {
    if (open) {
      setSelectedCustomerId(presetCustomerId ? String(presetCustomerId) : '');
      setServiceName('');
      setServiceDate('');
      setStartClock('');
      setDurationMinutes('90');
      setAddress('');
      setPrice('');
      setNote('');
      setFormError('');
      setIsSubmitting(false);
      setDateHint('');

      // Load technician's orders for conflict detection
      if (technician?.id) {
        ordersService.list({ technicianId: technician.id }).then(setOrders).catch(() => setOrders([]));
      }
    }
  }, [open, presetCustomerId, technician?.id]);

  // Prefill address when customer changes
  const selectedCustomer = useMemo(() =>
    customers.find(c => String(c.id) === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  useEffect(() => {
    if (selectedCustomer) {
      setAddress(current =>
        current || (selectedCustomer.address && selectedCustomer.address !== '未填写地址' ? selectedCustomer.address : '')
      );
    }
  }, [selectedCustomer]);

  // Work schedule computation
  const schedule = useMemo(() =>
    normalizeSchedule(technician?.serviceSchedule),
    [technician?.serviceSchedule]
  );
  const active = useMemo(() => activeScheme(schedule), [schedule]);
  const restDays = useMemo(() => schedule.restDays ?? [], [schedule.restDays]);

  // Calendar helpers
  const today = new Date();
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  const isDateDisabled = (day: number): boolean => {
    const date = new Date(year, month, day);
    const dateStr = formatDateStr(date);
    const weekdayKey = DAY_KEY_MAP[date.getDay()];

    // Disable if before today
    if (date < today && formatDateStr(date) !== formatDateStr(today)) {
      return true;
    }

    // Disable if rest day
    if (restDays.includes(dateStr)) {
      return true;
    }

    // Disable if weekday not in active scheme
    if (!active || !active.days.includes(weekdayKey)) {
      return true;
    }

    return false;
  };

  const selectDate = (day: number) => {
    const date = new Date(year, month, day);
    const dateStr = formatDateStr(date);

    if (isDateDisabled(day)) {
      setDateHint('该美甲师休息中');
      return;
    }

    setServiceDate(dateStr);
    setStartClock(''); // Clear selected time slot
    setDateHint('');
  };

  // Generate available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!serviceDate || !active) {
      return [];
    }

    const date = new Date(`${serviceDate}T00:00:00`);
    const weekdayKey = DAY_KEY_MAP[date.getDay()];

    // Check if this date is a work day
    if (!active.days.includes(weekdayKey) || restDays.includes(serviceDate)) {
      return [];
    }

    return generateTimeSlots(active.startTime, active.endTime);
  }, [serviceDate, active, restDays]);

  // Filter out conflicting time slots
  const nonConflictingSlots = useMemo(() => {
    if (!serviceDate) return availableTimeSlots;

    return availableTimeSlots.filter(slot => {
      const slotStartTime = `${serviceDate}T${slot}:00`;
      const slotEndTime = buildEndTime(serviceDate, slot, Number(durationMinutes) || 90);

      if (!slotEndTime) return true; // Include if can't compute end time

      return !detectOrderConflict(
        new Date(slotStartTime).toISOString(),
        slotEndTime,
        orders
      );
    });
  }, [availableTimeSlots, serviceDate, durationMinutes, orders]);

  // Submit handler
  const handleSubmit = async () => {
    setFormError('');

    if (!selectedCustomer || !serviceName || !serviceDate || !startClock || !address || !price) {
      setFormError('请填写客户、服务内容、时间、地址和价格');
      return;
    }

    const nextDurationMinutes = Number(durationMinutes);
    const nextPrice = Number(price);
    const startTime = new Date(`${serviceDate}T${startClock}:00`).toISOString();
    const endTime = buildEndTime(serviceDate, startClock, nextDurationMinutes);

    if (!endTime || Number.isNaN(nextDurationMinutes) || nextDurationMinutes <= 0 || Number.isNaN(nextPrice)) {
      setFormError('请检查服务时长和价格');
      return;
    }

    if (detectOrderConflict(startTime, endTime, orders)) {
      setFormError('该时间段已有预约，请调整开始时间或服务时长');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdOrder = await ordersService.createDraft({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        serviceName,
        address,
        startTime,
        endTime,
        price: nextPrice,
        note,
      });

      if (createdOrder.isLocalDraft) {
        toast.warning('后端暂不可用，已先保存为本地草稿，稍后可继续同步。');
      } else {
        toast.success('预约创建成功，已同步到预约、行程和客户记录。');
      }

      onCreated(createdOrder);
    } catch {
      setFormError('创建预约失败，请稍后重试');
      toast.error('创建预约失败，请检查网络或稍后再试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  // Calendar grid generation
  const calendar = [];

  // Empty cells before first day
  for (let i = 0; i < startDayOfWeek; i++) {
    calendar.push(<div key={`empty-${i}`} className="h-11"></div>);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateStr(new Date(year, month, day));
    const isSelected = serviceDate === dateStr;
    const isDisabled = isDateDisabled(day);

    calendar.push(
      <button
        key={day}
        type="button"
        disabled={isDisabled}
        onClick={() => selectDate(day)}
        className={`h-11 w-11 rounded-lg text-sm font-medium transition-colors ${
          isDisabled
            ? 'text-gray-300 cursor-not-allowed'
            : isSelected
            ? 'bg-[#FF5A66] text-white'
            : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
        }`}
      >
        {day}
      </button>
    );
  }

  const monthName = `${year}年${month + 1}月`;
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="fixed inset-0 z-[100] bg-black/30">
      <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white px-5 pb-8 pt-5 max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">新建预约</h2>
            <p className="text-xs text-gray-400">创建后会直接写入系统并同步到行程、首页和客户记录</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-gray-100 px-3 py-2 text-sm text-gray-600 min-h-[44px]"
          >
            关闭
          </button>
        </div>

        <div className="space-y-3">
          {/* Customer Selection */}
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            disabled={!!presetCustomerId}
            className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5A66] disabled:opacity-60"
          >
            <option value="">选择客户</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>

          {/* Service Name */}
          <input
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="服务内容"
            className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
          />

          {/* Calendar Section */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">选择日期</h3>

            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={prevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-200 active:bg-gray-300"
              >
                <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h4 className="text-sm font-medium text-gray-900">{monthName}</h4>
              <button
                onClick={nextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-200 active:bg-gray-300"
              >
                <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Week Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="h-6 flex items-center justify-center text-xs font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-3">
              {calendar}
            </div>

            {/* Date Hint */}
            {dateHint && <p className="text-xs text-orange-600 mb-2">{dateHint}</p>}

            {/* Time Slots */}
            {serviceDate && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">选择时间</h4>
                {nonConflictingSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {nonConflictingSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setStartClock(slot)}
                        className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                          startClock === slot
                            ? 'bg-[#FF5A66] text-white'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-2">该美甲师休息中</p>
                )}
              </div>
            )}
          </div>

          {/* Duration and Price */}
          <div className="grid grid-cols-2 gap-3">
            <input
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value.replace(/\D/g, ''))}
              placeholder="服务时长(分钟)"
              className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
            />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="价格"
              className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
            />
          </div>

          {/* Address */}
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="服务地址"
            className="h-12 w-full rounded-xl bg-gray-100 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
          />

          {/* Note */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="备注（可选）"
            className="min-h-[96px] w-full rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
          />

          {/* Error */}
          {formError && <p className="text-sm text-red-500">{formError}</p>}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#FF5A66] py-3 text-sm font-medium text-white min-h-[48px] disabled:opacity-60"
          >
            {isSubmitting ? '创建中...' : '创建预约'}
          </button>
        </div>
      </div>
    </div>
  );
};