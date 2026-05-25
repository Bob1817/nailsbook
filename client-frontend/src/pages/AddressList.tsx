import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { addressService, type ClientAddress } from '../services/address';

const AddressList: React.FC = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<ClientAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch (error) {
      console.error('Failed to load addresses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个地址吗？')) return;

    try {
      await addressService.deleteAddress(id);
      await loadAddresses();
    } catch (error) {
      console.error('Failed to delete address:', error);
      alert('删除失败，请重试');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await addressService.setDefaultAddress(id);
      await loadAddresses();
    } catch (error) {
      console.error('Failed to set default address:', error);
      alert('设置失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-[#FF6B8A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#FFFDFD_0%,#F7F3F6_48%,#F2F6FB_100%)]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/78 px-5 app-header-safe pb-5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/5"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Address Book</p>
            <h1 className="mt-0.5 text-lg font-semibold text-gray-900">地址管理</h1>
          </div>
        </div>
      </div>

      {/* Address List - add extra padding for the floating button */}
      <div className="space-y-4 px-5 pb-32 pt-6">
        {addresses.length > 0 ? (
          addresses.map((address) => (
            <div
              key={address.id}
              className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-base font-semibold text-gray-900">{address.contactName || '未命名'}</span>
                    <span className="text-sm text-gray-500">{address.contactPhone}</span>
                    {address.isDefault && (
                      <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)]">
                        默认
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-6 text-gray-600">
                    {[address.province, address.city, address.district, address.detailAddress].filter(Boolean).join(' ')}
                  </p>
                  {address.doorInfo && (
                    <p className="mt-2 text-xs text-gray-400">{address.doorInfo}</p>
                  )}
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#FFF0F5_0%,#F4F7FB_100%)]">
                  <svg className="h-5 w-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="rounded-full border border-[var(--color-primary)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-primary)]"
                  >
                    设为默认
                  </button>
                )}
                <button
                  onClick={() => navigate(`/profile/addresses/edit?id=${address.id}`)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-gray-600"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[32px] bg-white/88 px-6 py-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#FFE2EA_0%,#F4F6FB_100%)]">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">暂无地址</p>
            <p className="mt-2 text-sm leading-6 text-gray-400">预约前先添加常用地址，之后可快速选择服务地点</p>
          </div>
        )}
      </div>

      {/* Add Button - floating above bottom tab bar with safe area */}
      <div className="fixed left-0 right-0 z-40 px-5 py-4" style={{ bottom: 'max(80px, env(safe-area-inset-bottom) + 64px)' }}>
        <div className="mx-auto max-w-md">
          <button
            onClick={() => navigate('/profile/addresses/edit')}
            className="w-full rounded-full bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] py-3.5 font-medium text-white shadow-lg shadow-pink-200/50 active:scale-95 transition-transform"
          >
            + 添加新地址
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressList;
