import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ShopAddress, ShopBusinessHour } from '../contexts/authTypes';
import { uploadService } from '../services/upload';

const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
const weekdayLabels: Record<number, string> = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
};

function buildDefaultBusinessHours(): ShopBusinessHour[] {
  return weekdayOrder.map((weekday) => ({
    weekday,
    start: '10:00',
    end: '21:00',
    closed: false,
  }));
}

function normalizeBusinessHours(hours?: ShopBusinessHour[]) {
  if (!hours?.length) {
    return buildDefaultBusinessHours();
  }

  return weekdayOrder.map((weekday) => {
    const existingHour = hours.find((item) => item.weekday === weekday);
    return existingHour || { weekday, start: '10:00', end: '21:00', closed: false };
  });
}

const ShopEdit: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const indexParam = searchParams.get('index');
  const editIndex = indexParam ? parseInt(indexParam, 10) : null;
  const isEdit = editIndex !== null && !isNaN(editIndex);

  const { technician, updateServiceType } = useAuth();
  const hasValidEditTarget =
    isEdit &&
    !!technician?.shopAddresses &&
    editIndex >= 0 &&
    editIndex < technician.shopAddresses.length;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [businessHours, setBusinessHours] = useState<ShopBusinessHour[]>(buildDefaultBusinessHours());

  const [formData, setFormData] = useState<ShopAddress>({
    name: '',
    description: '',
    photos: [],
    qualifications: [],
    province: '',
    city: '',
    district: '',
    detailAddress: '',
    doorInfo: '',
    phone: '',
  });

  useEffect(() => {
    if (hasValidEditTarget && technician?.shopAddresses) {
      const shop = technician.shopAddresses[editIndex];
      setFormData({
        name: shop.name || '',
        description: shop.description || '',
        photos: shop.photos || [],
        qualifications: shop.qualifications || [],
        province: shop.province || '',
        city: shop.city || '',
        district: shop.district || '',
        detailAddress: shop.detailAddress || '',
        doorInfo: shop.doorInfo || '',
        phone: shop.phone || '',
        latitude: shop.latitude || '',
        longitude: shop.longitude || '',
      });
      setEnabled(shop.enabled ?? true);
      setBusinessHours(normalizeBusinessHours(shop.businessHours));
    }
  }, [editIndex, hasValidEditTarget, technician]);

  const updateBusinessHour = (weekday: number, changes: Partial<ShopBusinessHour>) => {
    setBusinessHours((currentHours) =>
      currentHours.map((hour) => (hour.weekday === weekday ? { ...hour, ...changes } : hour)),
    );
  };

  const uploadImages = async (files: File[]) => {
    setUploading(true);
    try {
      return await Promise.all(files.map(async (file) => (await uploadService.uploadImage(file)).url));
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 6 - (formData.photos?.length || 0));
    event.target.value = '';
    if (!files.length) return;
    try {
      const urls = await uploadImages(files);
      setFormData((current) => ({ ...current, photos: [...(current.photos || []), ...urls] }));
    } catch {
      alert('照片上传失败，请重试');
    }
  };

  const addQualification = () => {
    if ((formData.qualifications?.length || 0) >= 5) return;
    setFormData((current) => ({
      ...current,
      qualifications: [...(current.qualifications || []), { name: '' }],
    }));
  };

  const handleQualificationImage = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const [imageUrl] = await uploadImages([file]);
      setFormData((current) => ({
        ...current,
        qualifications: (current.qualifications || []).map((item, itemIndex) =>
          itemIndex === index ? { ...item, imageUrl } : item,
        ),
      }));
    } catch {
      alert('资质图片上传失败，请重试');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEdit && !hasValidEditTarget) {
      alert('店铺不存在，请返回店铺管理页重试');
      navigate('/shops');
      return;
    }

    if (!formData.name || !formData.detailAddress) {
      alert('请填写店铺名称和详细地址');
      return;
    }

    setSaving(true);
    try {
      const currentShops = technician?.shopAddresses || [];
      const nextShop: ShopAddress = {
        ...formData,
        description: formData.description?.trim(),
        qualifications: (formData.qualifications || []).filter((item) => item.name.trim()),
        enabled,
        businessHours,
      };
      let newShops: ShopAddress[];

      if (hasValidEditTarget) {
        newShops = currentShops.map((shop, i) => (i === editIndex ? nextShop : shop));
      } else {
        newShops = [...currentShops, nextShop];
      }

      console.log('Submitting shop data:', { formData: nextShop, newShops });
      console.log('Request payload:', {
        homeService: technician?.homeService || false,
        shopService: newShops.length > 0,
        shopAddresses: newShops,
      });

      await updateServiceType({
        homeService: technician?.homeService || false,
        shopService: newShops.length > 0,
        shopAddresses: newShops,
      });

      navigate('/shops');
    } catch (error) {
      console.error('Failed to save shop:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--nb-page)]">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[var(--nb-line)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--nb-page)] transition-colors active:bg-[var(--nb-page)]"
        >
          <svg className="h-5 w-5 text-[var(--nb-ink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-[var(--nb-ink)]">{isEdit ? '编辑店铺' : '新增店铺'}</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 px-5 pb-32 pt-6">
        {/* Shop Name */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-[var(--nb-line)] space-y-4">
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-[var(--nb-page)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--nb-ink)]">店铺状态</p>
              <p className="mt-1 text-xs text-[var(--nb-secondary)]">{enabled ? '客户可预约到店服务' : '客户暂时无法预约此店铺'}</p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled((current) => !current)}
              className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium ${
                enabled ? 'bg-[var(--nb-page)] text-[var(--nb-secondary)]' : 'bg-[var(--nb-page)] text-[var(--nb-secondary)]'
              }`}
            >
              {enabled ? '已启用' : '已关闭'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--nb-ink)] mb-2">店铺名称 <span className="text-[var(--nb-secondary)]">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入店铺名称"
              className="w-full px-4 py-3 bg-[var(--nb-page)] rounded-xl text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--nb-ink)]">店铺简介（选填）</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="介绍店铺环境、服务特色或卫生标准"
              maxLength={300}
              rows={4}
              className="w-full rounded-xl bg-[var(--nb-page)] px-4 py-3 text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20"
            />
            <p className="mt-1 text-right text-xs text-[var(--nb-muted)]">{formData.description?.length || 0}/300</p>
          </div>
        </div>

        {/* Address Info */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-[var(--nb-line)] space-y-4">
          <div>
            <h3 className="text-sm font-medium text-[var(--nb-ink)] mb-3">店铺地址</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--nb-secondary)] mb-1">省</label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  placeholder="省"
                  className="w-full px-3 py-2.5 bg-[var(--nb-page)] rounded-lg text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--nb-secondary)] mb-1">市</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="市"
                  className="w-full px-3 py-2.5 bg-[var(--nb-page)] rounded-lg text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--nb-secondary)] mb-1">区</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="区"
                  className="w-full px-3 py-2.5 bg-[var(--nb-page)] rounded-lg text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20 text-sm"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--nb-ink)] mb-2">详细地址 <span className="text-[var(--nb-secondary)]">*</span></label>
            <input
              type="text"
              value={formData.detailAddress}
              onChange={(e) => setFormData({ ...formData, detailAddress: e.target.value })}
              placeholder="请输入详细地址，如街道、门牌号等"
              className="w-full px-4 py-3 bg-[var(--nb-page)] rounded-xl text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--nb-ink)] mb-2">门禁信息（选填）</label>
            <input
              type="text"
              value={formData.doorInfo}
              onChange={(e) => setFormData({ ...formData, doorInfo: e.target.value })}
              placeholder="如：楼层、房间号等"
              className="w-full px-4 py-3 bg-[var(--nb-page)] rounded-xl text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20"
            />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-[var(--nb-line)] bg-white p-5 shadow-sm">
          <div>
            <h3 className="text-sm font-medium text-[var(--nb-ink)]">店铺照片</h3>
            <p className="mt-1 text-xs text-[var(--nb-secondary)]">展示门头和真实环境，最多 6 张</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(formData.photos || []).map((url, index) => (
              <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--nb-page)]">
                <img src={url} alt={`店铺照片 ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label={`删除店铺照片 ${index + 1}`}
                  onClick={() => setFormData((current) => ({ ...current, photos: (current.photos || []).filter((_, i) => i !== index) }))}
                  className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-xl text-white"
                >×</button>
              </div>
            ))}
            {(formData.photos?.length || 0) < 6 && (
              <label className="flex aspect-square min-h-11 cursor-pointer flex-col items-center justify-center rounded-xl bg-[var(--nb-page)] text-sm text-[var(--nb-secondary)] active:bg-[var(--nb-pressed)]">
                <span className="text-2xl">＋</span><span>{uploading ? '上传中' : '添加照片'}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-[var(--nb-line)] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-[var(--nb-ink)]">店铺资质</h3>
              <p className="mt-1 text-xs text-[var(--nb-secondary)]">如营业执照、卫生相关证明</p>
            </div>
            <button type="button" onClick={addQualification} disabled={(formData.qualifications?.length || 0) >= 5} className="min-h-11 rounded-full bg-[var(--nb-page)] px-4 text-sm text-[var(--nb-secondary)] disabled:text-[var(--nb-control)]">添加资质</button>
          </div>
          {(formData.qualifications || []).map((qualification, index) => (
            <div key={index} className="space-y-3 rounded-xl bg-[var(--nb-page)] p-3">
              <input
                value={qualification.name}
                onChange={(e) => setFormData((current) => ({ ...current, qualifications: (current.qualifications || []).map((item, i) => i === index ? { ...item, name: e.target.value } : item) }))}
                placeholder="资质名称"
                maxLength={50}
                className="min-h-11 w-full rounded-xl bg-white px-4 text-sm text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20"
              />
              <div className="flex items-center gap-3">
                {qualification.imageUrl && <img src={qualification.imageUrl} alt={qualification.name || '资质图片'} className="h-16 w-16 rounded-lg object-cover" />}
                <label className="flex min-h-11 cursor-pointer items-center rounded-full bg-white px-4 text-sm text-[var(--nb-secondary)] active:bg-[var(--nb-pressed)]">
                  {qualification.imageUrl ? '更换图片' : '上传图片'}
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handleQualificationImage(index, event)} disabled={uploading} />
                </label>
                <button type="button" onClick={() => setFormData((current) => ({ ...current, qualifications: (current.qualifications || []).filter((_, i) => i !== index) }))} className="min-h-11 px-2 text-sm text-[var(--nb-secondary)]">删除</button>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Info */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-[var(--nb-line)] space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--nb-ink)] mb-2">店铺电话（选填）</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="请输入店铺联系电话"
              className="w-full px-4 py-3 bg-[var(--nb-page)] rounded-xl text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-[var(--nb-line)] space-y-3">
          <div>
            <h3 className="text-sm font-medium text-[var(--nb-ink)]">营业时间</h3>
            <p className="mt-1 text-xs text-[var(--nb-secondary)]">按周设置，未勾选表示当天休息</p>
          </div>
          {businessHours.map((hour) => (
            <div key={hour.weekday} className="rounded-xl bg-[var(--nb-page)] p-3">
              <div className="flex min-h-11 items-center justify-between gap-3">
                <span className="text-sm font-medium text-[var(--nb-ink)]">{weekdayLabels[hour.weekday]}</span>
                <label className="flex min-h-11 items-center gap-2 text-sm text-[var(--nb-secondary)]">
                  <input
                    type="checkbox"
                    checked={!hour.closed}
                    onChange={(e) => updateBusinessHour(hour.weekday, { closed: !e.target.checked })}
                    className="h-5 w-5 rounded border-[var(--nb-control)] text-[var(--nb-secondary)] focus:ring-[var(--nb-control)]"
                  />
                  营业
                </label>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <input
                  type="time"
                  value={hour.start}
                  disabled={hour.closed}
                  onChange={(e) => updateBusinessHour(hour.weekday, { start: e.target.value })}
                  className="min-h-11 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20 disabled:cursor-not-allowed disabled:bg-[var(--nb-page)] disabled:text-[var(--nb-muted)]"
                />
                <input
                  type="time"
                  value={hour.end}
                  disabled={hour.closed}
                  onChange={(e) => updateBusinessHour(hour.weekday, { end: e.target.value })}
                  className="min-h-11 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20 disabled:cursor-not-allowed disabled:bg-[var(--nb-page)] disabled:text-[var(--nb-muted)]"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button - fixed at bottom */}
        <div className="fixed left-0 right-0 bottom-0 z-40 px-5 py-4 bg-white border-t border-[var(--nb-line)] safe-area-bottom">
          <div className="mx-auto max-w-md">
            <button
              type="submit"
              disabled={saving || uploading}
              className="w-full rounded-full bg-[var(--nb-action)] py-3.5 font-medium text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ShopEdit;
