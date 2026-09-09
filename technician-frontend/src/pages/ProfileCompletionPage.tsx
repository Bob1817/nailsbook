import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegionSelect from '../components/RegionSelect';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';

const ProfileCompletionPage: React.FC = () => {
  const navigate = useNavigate();
  const { technician, updateTechnicianProfile } = useAuth();
  const toast = useToast();
  const [province, setProvince] = useState(technician?.province || '');
  const [city, setCity] = useState(technician?.city || '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!province || !city) { toast.error('请选择所在省份和城市'); return; }
    setSaving(true);
    try {
      await updateTechnicianProfile({ province, city });
      navigate('/', { replace: true });
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[var(--nb-page)] px-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-lg font-semibold text-[var(--nb-ink)]">完善服务城市</h1>
        <p className="text-sm text-[var(--nb-secondary)]">请先完善你的服务省/市，用于同城上门预约与将来的定位推荐。</p>
        <RegionSelect province={province} city={city} onChange={(v) => { setProvince(v.province); setCity(v.city); }} />
        <button
          onClick={submit}
          disabled={saving}
          className="w-full min-h-[48px] rounded-xl bg-[var(--nb-action)] text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? '保存中…' : '保存并继续'}
        </button>
      </div>
    </div>
  );
};

export default ProfileCompletionPage;
