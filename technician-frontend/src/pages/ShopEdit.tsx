import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ShopAddress, ShopBusinessHour } from '../contexts/authTypes';

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
  const [enabled, setEnabled] = useState(true);
  const [businessHours, setBusinessHours] = useState<ShopBusinessHour[]>(buildDefaultBusinessHours());

  const [formData, setFormData] = useState<ShopAddress>({
    name: '',
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
    <div className="min-h-full bg-[#fff9f8]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 px-5 pt-12 pb-4 backdrop-blur-xl border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isEdit ? '编辑店铺' : '新增店铺'}</h1>
            <p className="text-sm text-gray-500">{isEdit ? '修改店铺信息' : '添加新的店铺地址'}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-32 pt-6">
        {/* Shop Name */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">店铺状态</p>
              <p className="mt-1 text-xs text-gray-500">{enabled ? '客户可预约到店服务' : '客户暂时无法预约此店铺'}</p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled((current) => !current)}
              className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium ${
                enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {enabled ? '已启用' : '已关闭'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">店铺名称 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入店铺名称"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-pink-400/20"
            />
          </div>
        </div>

        {/* Address Info */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">店铺地址</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">省</label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  placeholder="省"
                  className="w-full px-3 py-2.5 bg-gray-50 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-pink-400/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">市</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="市"
                  className="w-full px-3 py-2.5 bg-gray-50 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-pink-400/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">区</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="区"
                  className="w-full px-3 py-2.5 bg-gray-50 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-pink-400/20 text-sm"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">详细地址 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.detailAddress}
              onChange={(e) => setFormData({ ...formData, detailAddress: e.target.value })}
              placeholder="请输入详细地址，如街道、门牌号等"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-pink-400/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">门禁信息（选填）</label>
            <input
              type="text"
              value={formData.doorInfo}
              onChange={(e) => setFormData({ ...formData, doorInfo: e.target.value })}
              placeholder="如：楼层、房间号等"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-pink-400/20"
            />
          </div>
        </div>

        {/* Contact Info */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">店铺电话（选填）</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="请输入店铺联系电话"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-pink-400/20"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
          <div>
            <h3 className="text-sm font-medium text-gray-900">营业时间</h3>
            <p className="mt-1 text-xs text-gray-500">按周设置，未勾选表示当天休息</p>
          </div>
          {businessHours.map((hour) => (
            <div key={hour.weekday} className="rounded-xl bg-gray-50 p-3">
              <div className="flex min-h-11 items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-900">{weekdayLabels[hour.weekday]}</span>
                <label className="flex min-h-11 items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={!hour.closed}
                    onChange={(e) => updateBusinessHour(hour.weekday, { closed: !e.target.checked })}
                    className="h-5 w-5 rounded border-gray-300 text-pink-500 focus:ring-pink-400"
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
                  className="min-h-11 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-pink-400/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                />
                <input
                  type="time"
                  value={hour.end}
                  disabled={hour.closed}
                  onChange={(e) => updateBusinessHour(hour.weekday, { end: e.target.value })}
                  className="min-h-11 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-pink-400/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button - fixed at bottom */}
        <div className="fixed left-0 right-0 bottom-0 z-40 px-5 py-4 bg-white border-t border-gray-100 safe-area-bottom">
          <div className="mx-auto max-w-md">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-gradient-to-r from-pink-400 to-pink-500 py-3.5 font-medium text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
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
