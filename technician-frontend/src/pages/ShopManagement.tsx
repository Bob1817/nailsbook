import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function formatBusinessHours(hours?: ShopBusinessHour[]) {
  if (!hours?.length) {
    return '营业时间未设置';
  }

  const normalizedHours = weekdayOrder
    .map((weekday) => hours.find((item) => item.weekday === weekday))
    .filter((item): item is ShopBusinessHour => Boolean(item));

  if (normalizedHours.length === 0) {
    return '营业时间未设置';
  }

  return normalizedHours
    .map((hour) => `${weekdayLabels[hour.weekday]} ${hour.closed ? '休息' : `${hour.start}-${hour.end}`}`)
    .join(' · ');
}

const ShopManagement: React.FC = () => {
  const navigate = useNavigate();
  const { technician, updateServiceType } = useAuth();
  const [shops, setShops] = useState<ShopAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (technician?.shopAddresses) {
      setShops(technician.shopAddresses);
    }
    setLoading(false);
  }, [technician]);

  const handleToggleEnabled = async (index: number) => {
    const newShops = shops.map((shop, i) =>
      i === index ? { ...shop, enabled: !(shop.enabled ?? true) } : shop,
    );

    try {
      await updateServiceType({
        homeService: technician?.homeService || false,
        shopService: newShops.length > 0,
        shopAddresses: newShops,
      });
      setShops(newShops);
    } catch (error) {
      console.error('Failed to toggle shop enabled state:', error);
      alert('操作失败，请重试');
    }
  };

  const handleDelete = async (index: number) => {
    if (!confirm('确定要删除这个店铺吗？')) return;

    const newShops = shops.filter((_, i) => i !== index);
    try {
      await updateServiceType({
        homeService: technician?.homeService || false,
        shopService: newShops.length > 0,
        shopAddresses: newShops,
      });
      setShops(newShops);
    } catch (error) {
      console.error('Failed to delete shop:', error);
      alert('删除失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#fff9f8]">
        <div className="w-8 h-8 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-[#fff9f8]">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[#f2e6ec]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f3f5] transition-colors active:bg-[#eee5e9]"
        >
          <svg className="h-5 w-5 text-[#3c3440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-[#1f2230]">店铺管理</h1>
      </div>

      {/* Info Banner */}
      <div className="flex-1 overflow-y-auto pb-24">
      <div className="px-5 pt-4">
        <div className="rounded-xl bg-blue-50 p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-blue-800 font-medium">到店美甲配置</p>
              <p className="text-xs text-blue-600 mt-1">
                添加并启用店铺后，用户预约时将显示"到店美甲"选项。用户选择后可查看店铺名称和地址。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Shop List */}
      <div className="px-5 py-6 space-y-4">
        {shops.length > 0 ? (
          shops.map((shop, index) => (
            <div
              key={index}
              className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-2xl">🏪</span>
                    <h3 className="text-lg font-semibold text-gray-900">{shop.name}</h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        shop.enabled ?? true ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {shop.enabled ?? true ? '营业中' : '已关闭'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {[shop.province, shop.city, shop.district, shop.detailAddress]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-400">
                    {formatBusinessHours(shop.businessHours)}
                  </p>
                  {shop.doorInfo && (
                    <p className="text-xs text-gray-400 mt-1">{shop.doorInfo}</p>
                  )}
                  {shop.phone && (
                    <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {shop.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  onClick={() => handleToggleEnabled(index)}
                  className="min-h-11 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600"
                >
                  {shop.enabled ?? true ? '关闭店铺' : '启用店铺'}
                </button>
                <button
                  onClick={() => navigate(`/shops/edit?index=${index}`)}
                  className="min-h-11 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(index)}
                  className="min-h-11 rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-500"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm border border-gray-100">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50">
              <span className="text-3xl">🏪</span>
            </div>
            <p className="text-base font-medium text-gray-700">暂无店铺</p>
            <p className="mt-2 text-sm text-gray-400">添加店铺信息，让客户知道您的店铺位置</p>
          </div>
        )}
      </div>

      {/* Add Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 safe-area-bottom">
        <div className="mx-auto max-w-md">
          <button
            onClick={() => navigate('/shops/edit')}
            className="w-full rounded-full bg-gradient-to-r from-pink-400 to-pink-500 py-3.5 font-medium text-white shadow-lg"
          >
            + 新增店铺
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ShopManagement;
