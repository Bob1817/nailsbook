import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { Technician } from '../services/auth';
import { addressService, type ClientAddress } from '../services/address';
import { orderService } from '../services/order';
import { uploadService } from '../services/upload';
import { useTechnicianAvailability } from '../hooks/useTechnicianAvailability';
import { sameCity } from '../utils/sameCity';
import { shopHoursOptionForDate, isShopOpenOnDate } from '../utils/shopHours';
import DistrictSelect from './DistrictSelect';

interface BookingSheetProps {
  technician: Technician;
  prefill?: {
    title?: string;
    description?: string;
    images?: string[];
  };
  mode?: 'chat' | 'standalone';
  onClose: () => void;
  onCreated?: () => void;
}

const BookingSheet: React.FC<BookingSheetProps> = ({ technician, prefill, mode = 'standalone', onClose, onCreated }) => {
  const enabledShopAddresses = useMemo(
    () => (technician.shopAddresses || []).filter((s) => s.enabled !== false),
    [technician.shopAddresses],
  );

  const availableTypes = useMemo(() => {
    const types: string[] = [];
    if (technician.homeService) types.push('上门美甲');
    if (technician.shopService && enabledShopAddresses.length > 0) types.push('到店美甲');
    return types;
  }, [technician.homeService, technician.shopService, enabledShopAddresses]);

  const [serviceType, setServiceType] = useState<string>(availableTypes.length === 1 ? availableTypes[0] : '');
  const [addresses, setAddresses] = useState<ClientAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [showShopConfirm, setShowShopConfirm] = useState(false);
  const [serviceDate, setServiceDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [startTime, setStartTime] = useState('14:00');
  const [note, setNote] = useState(prefill?.description || prefill?.title || '');
  const [images, setImages] = useState<string[]>(prefill?.images || []);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const { isDateAvailable, getSlotStatuses, refresh } = useTechnicianAvailability(technician);
  const selectedShop = enabledShopAddresses[0] || null;
  const slotStatuses = useMemo(
    () =>
      getSlotStatuses(
        serviceDate,
        serviceType === '到店美甲'
          ? { shopMode: true, shopHours: shopHoursOptionForDate(selectedShop, serviceDate) }
          : undefined,
      ),
    [getSlotStatuses, serviceDate, serviceType, selectedShop],
  );

  useEffect(() => {
    let active = true;
    addressService
      .getAddresses()
      .then((list) => {
        if (!active) return;
        setAddresses(list);
        const candidates = list.filter((a) => sameCity(a, technician));
        const def = candidates.find((a) => a.isDefault) || candidates[0] || null;
        setSelectedAddressId(def ? def.id : null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isHome = serviceType === '上门美甲';
  const isShop = serviceType === '到店美甲';

  const lockedProvince = technician.province || '';
  const lockedCity = technician.city || '';

  const fullAddress = (a: ClientAddress) =>
    [a.province, a.city, a.district, a.detailAddress, a.doorInfo].filter(Boolean).join(' ');

  const canSubmit = (() => {
    if (!serviceType) return false;
    if (isHome) {
      if (showInlineForm) {
        const districtOk = lockedCity ? newDistrict.trim().length > 0 : true;
        return newName.trim().length > 0 && newAddr.trim().length > 0 && districtOk;
      }
      return selectedAddressId != null;
    }
    if (isShop) return enabledShopAddresses.length > 0;
    return true;
  })();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadService.uploadImage(file);
      setImages((prev) => [...prev, url]);
    } catch {
      alert('图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const shopForConfirm = enabledShopAddresses[0] || null;

  const doCreate = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      let addressId: number | undefined;
      if (isHome) {
        if (showInlineForm) {
          const districtOk = lockedCity ? newDistrict.trim().length > 0 : true;
          if (!newName.trim() || !newAddr.trim() || !districtOk) {
            setSubmitting(false);
            return;
          }
          const saved = await addressService.createAddress({
            contactName: newName.trim(),
            contactPhone: newPhone.trim() || undefined,
            detailAddress: newAddr.trim(),
            district: newDistrict || undefined,
            province: lockedProvince || undefined,
            city: lockedCity || undefined,
            isDefault: addresses.length === 0,
          });
          addressId = saved.id;
        } else {
          const chosen = addresses.find((a) => a.id === selectedAddressId);
          if (chosen && !sameCity(chosen, technician)) {
            alert('跨城美甲无法预约');
            setSubmitting(false);
            return;
          }
          addressId = selectedAddressId ?? undefined;
        }
      }

      await orderService.createOrder({
        techId: technician.id,
        serviceType,
        serviceDate,
        startTime,
        chatMode: mode === 'chat',
        addressId: isHome ? addressId : undefined,
        shopAddress: isShop ? enabledShopAddresses[0] : undefined,
        customDescription: note.trim() || undefined,
        customImages: images.length > 0 ? images : undefined,
      });
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      const text = Array.isArray(msg) ? msg[0] : msg;
      if (typeof text === 'string' && text.includes('该时间段已经被其他用户预约')) {
        alert('该时间段已经被其他用户预约，请重新选择预约时间');
        refresh();
        setStartTime('');
      } else {
        alert('发起预约失败：' + (text || (err as Error).message || '请稍后重试'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    if (isShop) {
      setShowShopConfirm(true);
      return;
    }
    await doCreate();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-[32px] bg-white shadow-[0_-20px_50px_rgba(15,23,42,0.18)] sm:rounded-[32px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h3 className="text-lg font-semibold text-slate-900">📅 发起预约</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"
          >
            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-2">
          {/* Service type */}
          {availableTypes.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              该美甲师暂未开启可预约的服务方式
            </p>
          ) : availableTypes.length === 1 ? (
            <div>
              <Label>服务方式</Label>
              <span className="inline-block rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
                {availableTypes[0]}
              </span>
            </div>
          ) : (
            <div>
              <Label>服务方式</Label>
              <div className="flex gap-2">
                {availableTypes.map((t) => {
                  const sel = serviceType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        setServiceType(t);
                        setShowInlineForm(false);
                      }}
                      className={`flex-1 rounded-xl py-3 text-sm font-medium ${
                        sel
                          ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30'
                          : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Address (home) */}
          {isHome && (
            <div>
              <Label>上门地址</Label>
              {showInlineForm ? (
                <div className="space-y-2">
                  {(lockedProvince || lockedCity) && (
                    <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
                      服务城市：{[lockedProvince, lockedCity].filter(Boolean).join(' ')}（仅支持同城上门）
                    </div>
                  )}
                  <Field value={newName} onChange={setNewName} placeholder="姓名" />
                  <Field value={newPhone} onChange={setNewPhone} placeholder="手机号（选填）" type="tel" />
                  <DistrictSelect city={lockedCity} value={newDistrict} onChange={setNewDistrict} />
                  <Field value={newAddr} onChange={setNewAddr} placeholder="街道、村、道路、小区、门牌等详细地址" />
                  {addresses.length > 0 && (
                    <button
                      onClick={() => setShowInlineForm(false)}
                      className="text-xs text-slate-400"
                    >
                      取消，使用已有地址
                    </button>
                  )}
                </div>
              ) : addresses.length === 0 ? (
                <button
                  onClick={() => setShowInlineForm(true)}
                  className="flex w-full items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20"
                >
                  + 添加上门地址
                </button>
              ) : addresses.length === 1 ? (
                !sameCity(addresses[0], technician) ? (
                  <div className="space-y-2">
                    <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      该地址非美甲师所在城市，不支持跨城上门
                    </p>
                    <button
                      onClick={() => setShowInlineForm(true)}
                      className="flex w-full items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20"
                    >
                      + 添加同城地址
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
                    <span className="flex-1 text-sm text-slate-900">{fullAddress(addresses[0])}</span>
                    <button
                      onClick={() => setShowInlineForm(true)}
                      className="text-xs text-[var(--color-primary)]"
                    >
                      更换
                    </button>
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedAddressId ?? ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const chosen = addresses.find((a) => a.id === id);
                      if (chosen && !sameCity(chosen, technician)) {
                        alert('跨城美甲无法预约');
                        return;
                      }
                      setSelectedAddressId(id);
                    }}
                    className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  >
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id} disabled={!sameCity(a, technician)}>
                        {fullAddress(a)}
                        {sameCity(a, technician) ? '' : '（跨城不可选）'}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setShowInlineForm(true);
                      setSelectedAddressId(null);
                    }}
                    className="text-xs text-[var(--color-primary)]"
                  >
                    + 新增地址
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Shop address (read-only) */}
          {isShop && enabledShopAddresses.length > 0 && (
            <div>
              <Label>门店地址</Label>
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-900">
                {[
                  enabledShopAddresses[0].province,
                  enabledShopAddresses[0].city,
                  enabledShopAddresses[0].district,
                  enabledShopAddresses[0].detailAddress,
                ]
                  .filter(Boolean)
                  .join(' ') || enabledShopAddresses[0].name}
              </div>
            </div>
          )}

          {/* Date — 自定义月历，置灰休息日/非工作日 */}
          <div>
            <Label>预约日期</Label>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <button type="button" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200">‹</button>
                <span className="text-sm font-medium text-slate-900">{calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月</span>
                <button type="button" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200">›</button>
              </div>
              <div className="mb-1 grid grid-cols-7 gap-1">
                {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
                  <div key={w} className="flex h-6 items-center justify-center text-[11px] text-slate-400">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const year = calendarMonth.getFullYear();
                  const month = calendarMonth.getMonth();
                  const firstWeekday = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const todayStr = dayjs().format('YYYY-MM-DD');
                  const cells: React.ReactNode[] = [];
                  for (let i = 0; i < firstWeekday; i++) cells.push(<div key={`e${i}`} className="h-9" />);
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = dayjs(new Date(year, month, day)).format('YYYY-MM-DD');
                    const dateOk = isShop
                      ? isShopOpenOnDate(selectedShop, dateStr)
                      : isDateAvailable(dateStr);
                    const disabled = dateStr < todayStr || !dateOk;
                    const selected = serviceDate === dateStr;
                    cells.push(
                      <button
                        key={day}
                        type="button"
                        disabled={disabled}
                        onClick={() => { setServiceDate(dateStr); setStartTime(''); }}
                        className={`h-9 rounded-lg text-[13px] font-medium transition ${
                          disabled ? 'cursor-not-allowed text-slate-300' : selected ? 'bg-[#FF6B8A] text-white' : 'text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {day}
                      </button>,
                    );
                  }
                  return cells;
                })()}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">灰色日期为休息日，不可预约</p>
            </div>
          </div>

          {/* Time — 只显工作时段，占用显示已预约 */}
          <div>
            <Label>预约时间</Label>
            {slotStatuses.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {slotStatuses.map(({ time, occupied }) => {
                  const sel = startTime === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={occupied}
                      onClick={() => !occupied && setStartTime(time)}
                      className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-[13px] font-medium ${
                        occupied
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                          : sel
                          ? 'bg-[linear-gradient(135deg,#FF6B8A_0%,#FF8FA3_100%)] text-white shadow-[0_8px_18px_rgba(255,107,138,0.3)]'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span className={occupied ? 'text-xs leading-none line-through' : ''}>{time}</span>
                      {occupied && <span className="mt-0.5 text-[10px] leading-none">已预约</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="py-2 text-sm text-slate-400">该美甲师休息中</p>
            )}
          </div>

          {/* Note + images */}
          <div>
            <Label>服务说明（选填）</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="简短描述美甲需求，或上传参考图片..."
              className="w-full resize-none rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((url, i) => (
                <div key={url} className="relative h-16 w-16">
                  <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <button
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400">
                  {uploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-[10px]">添加</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-4 safe-area-bottom">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className={`flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold ${
              canSubmit && !submitting
                ? 'bg-[linear-gradient(135deg,#FF6B8A_0%,#FF8FA3_100%)] text-white shadow-[0_12px_24px_rgba(255,107,138,0.3)]'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {submitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              '发起预约'
            )}
          </button>
        </div>
      </div>

      {showShopConfirm && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setShowShopConfirm(false)}>
          <div className="w-full max-w-md rounded-t-[28px] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-sm sm:rounded-[28px] sm:pb-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-900">确认到店地址</h3>
            <p className="mt-1 text-sm text-slate-500">请确认前往的美甲师店铺地址：</p>
            <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-800">
              <div className="font-medium">{shopForConfirm?.name}</div>
              <div className="mt-1 text-slate-600">{[shopForConfirm?.province, shopForConfirm?.city, shopForConfirm?.district, shopForConfirm?.detailAddress].filter(Boolean).join(' ')}</div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowShopConfirm(false)} className="flex-1 rounded-full bg-slate-100 py-3 text-sm font-medium text-slate-600 min-h-[48px]">取消</button>
              <button onClick={async () => { setShowShopConfirm(false); await doCreate(); }} className="flex-1 rounded-full bg-[linear-gradient(135deg,#FF6B8A_0%,#FF8FA3_100%)] py-3 text-sm font-medium text-white min-h-[48px]">确认预约</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mb-2 text-[13px] font-semibold text-slate-900">{children}</p>
);

const Field: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}> = ({ value, onChange, placeholder, type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
  />
);

export default BookingSheet;
