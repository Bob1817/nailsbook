import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/feedback/ToastProvider';
import { Card } from '../components/base/Card';
import { Button } from '../components/base/Button';

interface Qualification {
  id: number;
  type: string;
  title: string;
  detail: string;
  organization?: string;
  year: number;
  month?: number;
  imageUrl?: string | null;
  isVerified: boolean;
  sortOrder: number;
}

const QUALIFICATION_TYPES = [
  { value: 'education', label: '教育经历', icon: '🎓', placeholder: '如：中国美术学院' },
  { value: 'training', label: '培训经历', icon: '📚', placeholder: '如：日式美甲进修班' },
  { value: 'certificate', label: '证书资质', icon: '📜', placeholder: '如：美甲师资格证' },
  { value: 'certification', label: '行业认证', icon: '✅', placeholder: '如：JNA认证' },
  { value: 'award', label: '获奖记录', icon: '🏆', placeholder: '如：全国美甲大赛金奖' },
];

const QualificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQual, setEditingQual] = useState<Qualification | null>(null);

  useEffect(() => {
    loadQualifications();
  }, []);

  const loadQualifications = async () => {
    try {
      const token = localStorage.getItem('technician_token');
      const response = await fetch('/api/technician/qualifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setQualifications(data);
      }
    } catch {
      toast.error('加载资质信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条资质信息吗？')) return;

    try {
      const token = localStorage.getItem('technician_token');
      const response = await fetch(`/api/technician/qualifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('已删除');
        loadQualifications();
      } else {
        toast.error('删除失败');
      }
    } catch {
      toast.error('删除失败，请重试');
    }
  };

  const groupedQualifications = QUALIFICATION_TYPES.map((type) => ({
    ...type,
    items: qualifications.filter((q) => q.type === type.value),
  }));

  return (
    <div className="flex h-[100dvh] flex-col bg-[#fff9f8]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[#f2e6ec]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f3f5] transition-colors active:bg-[#eee5e9]"
          >
            <svg className="h-5 w-5 text-[#3c3440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[17px] font-semibold text-[#1f2230]">资质管理</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="rounded-full bg-[#FF5E93] px-4 py-2 text-[13px] font-medium text-white active:bg-[#e54e82]"
        >
          + 添加资质
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Info Banner */}
        <div className="mb-5 rounded-[18px] bg-[#fff7fa] p-4 ring-1 ring-[#f2e6ec]">
          <p className="text-[13px] text-[#831843]">
            资质信息将展示在您的主页，帮助客户更好地了解您的专业背景，提升信任度。
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF5E93] border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {groupedQualifications.map((group) => (
              <Card key={group.value} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{group.icon}</span>
                    <h2 className="text-[15px] font-semibold text-gray-900">{group.label}</h2>
                    <span className="text-xs text-gray-400">({group.items.length})</span>
                  </div>
                </div>

                {group.items.length > 0 ? (
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <div key={item.id} className="rounded-[14px] bg-[#fafafa] p-3.5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[14px] font-medium text-gray-900">{item.title}</p>
                              {item.isVerified && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-600">
                                  已验证
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[12px] text-gray-500">
                              {item.detail} · {item.year}{item.month ? `.${item.month}` : ''}
                            </p>
                            {item.organization && (
                              <p className="mt-1 text-[12px] text-gray-400">{item.organization}</p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-3">
                            <button
                              type="button"
                              onClick={() => setEditingQual(item)}
                              className="rounded-full bg-white px-3 py-1.5 text-[12px] text-gray-600 ring-1 ring-gray-200 active:bg-gray-50"
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="rounded-full bg-white px-3 py-1.5 text-[12px] text-red-500 ring-1 ring-red-200 active:bg-red-50"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[14px] bg-[#fafafa] p-4 text-center">
                    <p className="text-[13px] text-gray-400">暂无{group.label}信息</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingQual) && (
        <QualificationFormModal
          qualification={editingQual}
          onClose={() => {
            setShowAddModal(false);
            setEditingQual(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingQual(null);
            loadQualifications();
          }}
        />
      )}
    </div>
  );
};

interface QualificationFormModalProps {
  qualification?: Qualification | null;
  onClose: () => void;
  onSave: () => void;
}

const QualificationFormModal: React.FC<QualificationFormModalProps> = ({ qualification, onClose, onSave }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: qualification?.type || 'education',
    title: qualification?.title || '',
    detail: qualification?.detail || '',
    organization: qualification?.organization || '',
    year: qualification?.year || new Date().getFullYear(),
    month: qualification?.month || undefined as number | undefined,
    sortOrder: qualification?.sortOrder || 0,
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('请输入标题');
      return;
    }
    if (!formData.detail.trim()) {
      toast.error('请输入详情信息');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('technician_token');
      const url = qualification
        ? `/api/technician/qualifications/${qualification.id}`
        : '/api/technician/qualifications';
      const method = qualification ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(qualification ? '已更新' : '已添加');
        onSave();
      } else {
        toast.error('保存失败');
      }
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const inputClassName =
    'w-full rounded-[14px] border border-[#f1e7e8] bg-[#fffdfd] px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-50';

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-md flex flex-col rounded-t-[20px] bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3.5">
          <h2 className="text-lg font-bold text-gray-900">
            {qualification ? '编辑资质' : '添加资质'}
          </h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4 space-y-4">
          {/* Type */}
          <div>
            <label className="mb-2 block text-[13px] font-medium text-gray-700">资质类型 *</label>
            <div className="flex flex-wrap gap-2">
              {QUALIFICATION_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value })}
                  className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    formData.type === type.value
                      ? 'bg-[#FF5E93] text-white'
                      : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                  }`}
                >
                  {type.icon} {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-2 block text-[13px] font-medium text-gray-700">标题 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={QUALIFICATION_TYPES.find((t) => t.value === formData.type)?.placeholder}
              className={inputClassName}
            />
          </div>

          {/* Detail */}
          <div>
            <label className="mb-2 block text-[13px] font-medium text-gray-700">详情信息 *</label>
            <input
              type="text"
              value={formData.detail}
              onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
              placeholder="如：硕士 · 美术学专业"
              className={inputClassName}
            />
          </div>

          {/* Organization */}
          <div>
            <label className="mb-2 block text-[13px] font-medium text-gray-700">颁发机构</label>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              placeholder="如：中国美术学院"
              className={inputClassName}
            />
          </div>

          {/* Year & Month */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-[13px] font-medium text-gray-700">年份 *</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                min={1990}
                max={2030}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-2 block text-[13px] font-medium text-gray-700">月份（选填）</label>
              <select
                value={formData.month || ''}
                onChange={(e) => setFormData({ ...formData, month: e.target.value ? parseInt(e.target.value) : undefined })}
                className={inputClassName}
              >
                <option value="">不选择</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="shrink-0 px-5 pt-3 border-t border-gray-50 bg-white"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}
        >
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[48px] rounded-[16px] bg-gray-100 text-[15px] font-medium text-gray-600 active:bg-gray-200"
            >
              取消
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="flex-1 min-h-[48px] rounded-[16px] bg-[#FF5E93] text-[15px] font-semibold text-white shadow-sm active:bg-[#e54e82] disabled:opacity-60"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QualificationsPage;
