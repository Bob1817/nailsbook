import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addressService } from '../services/address';
import RegionDistrictSelect from '../components/RegionDistrictSelect';

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
      <div className="min-h-full flex items-center justify-center bg-[var(--nb-page)]">
        <div className="w-8 h-8 border-2 border-[var(--nb-control)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--nb-page)]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/78 px-5 app-header-safe pb-5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[var(--nb-ink)] shadow-[0_10px_24px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
          >
            <svg className="w-5 h-5 text-[var(--nb-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Address Form</p>
            <h1 className="mt-0.5 text-lg font-semibold text-[var(--nb-ink)]">{isEdit ? '编辑地址' : '添加地址'}</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-32 pt-6">
        {/* Contact Info */}
        <div className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--nb-ink)]">联系人信息</h3>
            <p className="mt-1 text-sm text-[var(--nb-secondary)]">填写上门服务时需要联系的收件人信息</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--nb-ink)] mb-2">联系人姓名</label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              placeholder="请输入联系人姓名"
              className="w-full px-4 py-3 bg-[var(--nb-page)] rounded-xl text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--nb-ink)] mb-2">联系电话</label>
            <input
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              placeholder="请输入联系电话"
              className="w-full px-4 py-3 bg-[var(--nb-page)] rounded-xl text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20"
            />
          </div>
        </div>

        {/* Address Info */}
        <div className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--nb-ink)]">服务地址</h3>
            <p className="mt-1 text-sm text-[var(--nb-secondary)]">补充你的常用上门服务地点与门禁信息</p>
          </div>
          <RegionDistrictSelect
            value={{ province: formData.province, city: formData.city, district: formData.district }}
            onChange={(v) => setFormData({ ...formData, province: v.province, city: v.city, district: v.district })}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--nb-ink)] mb-2">详细地址</label>
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
              placeholder="如：小区门禁、楼栋号、单元号等"
              className="w-full px-4 py-3 bg-[var(--nb-page)] rounded-xl text-[var(--nb-ink)] outline-none focus:ring-2 focus:ring-[var(--nb-control)]/20"
            />
          </div>
        </div>

        {/* Default Address */}
        <div className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-[var(--nb-ink)]">设为默认地址</span>
              <p className="mt-1 text-xs text-[var(--nb-muted)]">后续预约时会优先使用这个地址</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
              style={{ width: '44px', height: '24px' }}
              className={`relative shrink-0 rounded-full transition-colors ${
                formData.isDefault ? 'bg-[var(--nb-action)]' : 'bg-[var(--nb-pressed)]'
              }`}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  top: '2px',
                  left: formData.isDefault ? '22px' : '2px',
                }}
                className="absolute rounded-full bg-white shadow-sm transition-all duration-150"
              />
            </button>
          </div>
        </div>

        {/* Submit Button - fixed at bottom */}
        <div className="fixed left-0 right-0 bottom-0 z-40 px-5 py-4 bg-white border-t border-[var(--nb-line)] safe-area-bottom">
          <div className="mx-auto max-w-md">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-[var(--nb-action)] py-4 font-medium text-white shadow-lg shadow-black/50 active:scale-95 transition-transform disabled:opacity-50"
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
