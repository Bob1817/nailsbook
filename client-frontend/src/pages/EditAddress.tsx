import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addressService } from '../services/address';

const EditAddress: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addressId = searchParams.get('id');
  const isEdit = !!addressId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    contactName: '',
    contactPhone: '',
    province: '',
    city: '',
    district: '',
    detailAddress: '',
    doorInfo: '',
    isDefault: false,
  });

  const loadAddress = useCallback(async (id: number) => {
    try {
      setLoading(true);
      const addresses = await addressService.getAddresses();
      const address = addresses.find((a) => a.id === id);
      if (address) {
        setFormData({
          contactName: address.contactName || '',
          contactPhone: address.contactPhone || '',
          province: address.province || '',
          city: address.city || '',
          district: address.district || '',
          detailAddress: address.detailAddress || '',
          doorInfo: address.doorInfo || '',
          isDefault: address.isDefault,
        });
      }
    } catch {
      console.error('Failed to load address');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isEdit) {
      loadAddress(parseInt(addressId!));
    }
  }, [addressId, isEdit, loadAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contactName || !formData.contactPhone || !formData.detailAddress) {
      alert('请填写完整信息');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await addressService.updateAddress(parseInt(addressId!), formData);
      } else {
        await addressService.createAddress(formData);
      }
      navigate('/profile/addresses');
    } catch {
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
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
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Address Form</p>
            <h1 className="mt-0.5 text-lg font-semibold text-gray-900">{isEdit ? '编辑地址' : '添加地址'}</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-32 pt-6">
        {/* Contact Info */}
        <div className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">联系人信息</h3>
            <p className="mt-1 text-sm text-gray-500">填写上门服务时需要联系的收件人信息</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">联系人姓名</label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              placeholder="请输入联系人姓名"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-[#FF6B8A]/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">联系电话</label>
            <input
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              placeholder="请输入联系电话"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-[#FF6B8A]/20"
            />
          </div>
        </div>

        {/* Address Info */}
        <div className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">服务地址</h3>
            <p className="mt-1 text-sm text-gray-500">补充你的常用上门服务地点与门禁信息</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">省</label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                placeholder="省"
                className="w-full px-3 py-3 bg-gray-50 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-[#FF6B8A]/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">市</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="市"
                className="w-full px-3 py-3 bg-gray-50 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-[#FF6B8A]/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">区</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="区"
                className="w-full px-3 py-3 bg-gray-50 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-[#FF6B8A]/20 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">详细地址</label>
            <input
              type="text"
              value={formData.detailAddress}
              onChange={(e) => setFormData({ ...formData, detailAddress: e.target.value })}
              placeholder="请输入详细地址，如街道、门牌号等"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-[#FF6B8A]/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">门禁信息（选填）</label>
            <input
              type="text"
              value={formData.doorInfo}
              onChange={(e) => setFormData({ ...formData, doorInfo: e.target.value })}
              placeholder="如：小区门禁、楼栋号、单元号等"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-[#FF6B8A]/20"
            />
          </div>
        </div>

        {/* Default Address */}
        <div className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">设为默认地址</span>
              <p className="mt-1 text-xs text-gray-400">后续预约时会优先使用这个地址</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                formData.isDefault ? 'bg-[#FF6B8A]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  formData.isDefault ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Submit Button - fixed at bottom */}
        <div className="fixed left-0 right-0 bottom-0 z-40 px-5 py-4 bg-white border-t border-gray-100 safe-area-bottom">
          <div className="mx-auto max-w-md">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] py-4 font-medium text-white shadow-lg shadow-pink-200/50 active:scale-95 transition-transform disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditAddress;
