import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { servicesService } from '../services/services';
import type { ServiceItem, ServiceCategory, CreateServiceDto } from '../types/service';
import { SERVICE_CATEGORIES } from '../types/service';

const categoryColors: Record<ServiceCategory, { bg: string; text: string; border: string }> = {
  basic_care: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  color_style: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
  extension_reinforcement: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  removal: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
};

const ServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { technician } = useAuth();
  const toast = useToast();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [formData, setFormData] = useState<CreateServiceDto>({
    name: '',
    description: '',
    category: 'basic_care',
  });

  useEffect(() => {
    loadServices();
  }, [technician?.id]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await servicesService.list();
      setServices(data);
    } catch (error) {
      toast.error('加载服务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (service: ServiceItem) => {
    try {
      await servicesService.toggleStatus(service.id);
      await loadServices();
      toast.success(service.isActive ? '已禁用服务' : '已启用服务');
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  const handleDelete = async (service: ServiceItem) => {
    if (!confirm(`确定要删除"${service.name}"吗？`)) return;

    try {
      await servicesService.delete(service.id);
      await loadServices();
      toast.success('服务已删除');
    } catch {
      toast.error('删除失败，请重试');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('请输入服务名称');
      return;
    }

    try {
      if (editingService) {
        await servicesService.update(editingService.id, formData);
        toast.success('服务已更新');
      } else {
        await servicesService.create(formData);
        toast.success('服务已创建');
      }
      setShowAddModal(false);
      setEditingService(null);
      setFormData({ name: '', description: '', category: 'basic_care' });
      await loadServices();
    } catch {
      toast.error('保存失败，请重试');
    }
  };

  const handleEdit = (service: ServiceItem) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      category: service.category,
    });
    setShowAddModal(true);
  };

  const handleAddNew = () => {
    setEditingService(null);
    setFormData({ name: '', description: '', category: 'basic_care' });
    setShowAddModal(true);
  };

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<ServiceCategory, ServiceItem[]>);

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
          <h1 className="text-[17px] font-semibold text-[#1f2230]">服务管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddNew}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-500 text-white shadow-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Service List */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 pb-24">
        {services.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm border border-gray-100">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50">
              <span className="text-3xl">💅</span>
            </div>
            <p className="text-base font-medium text-gray-700">暂无服务</p>
            <p className="mt-2 text-sm text-gray-400">点击右上角添加您的第一个服务</p>
          </div>
        ) : (
          (Object.keys(SERVICE_CATEGORIES) as ServiceCategory[]).map((category) => {
            const categoryServices = groupedServices[category] || [];
            if (categoryServices.length === 0) return null;

            const colors = categoryColors[category];

            return (
              <div key={category}>
                <div className={`flex items-center gap-2 mb-3 px-1`}>
                  <span className={`text-sm font-semibold ${colors.text}`}>
                    {SERVICE_CATEGORIES[category].label}
                  </span>
                  <span className="text-xs text-gray-400">({categoryServices.length})</span>
                </div>
                <div className="space-y-3">
                  {categoryServices.map((service) => (
                    <div
                      key={service.id}
                      className={`rounded-2xl bg-white p-4 shadow-sm border ${
                        service.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`text-base font-semibold ${service.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                              {service.name}
                            </h3>
                            {!service.isActive && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                                已禁用
                              </span>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-sm text-gray-500 leading-relaxed">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                        <button
                          onClick={() => handleEdit(service)}
                          className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleToggleStatus(service)}
                          className={`rounded-full px-4 py-2 text-sm font-medium ${
                            service.isActive
                              ? 'bg-orange-50 text-orange-500'
                              : 'bg-green-50 text-green-500'
                          }`}
                        >
                          {service.isActive ? '禁用' : '启用'}
                        </button>
                        <button
                          onClick={() => handleDelete(service)}
                          className="rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-500"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingService ? '编辑服务' : '新增服务'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  服务名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入服务名称"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  服务分类 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(SERVICE_CATEGORIES) as ServiceCategory[]).map((category) => (
                    <label
                      key={category}
                      className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.category === category
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={category}
                        checked={formData.category === category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as ServiceCategory })}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {SERVICE_CATEGORIES[category].label}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {SERVICE_CATEGORIES[category].description.slice(0, 15)}...
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  服务描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请输入服务描述（选填）"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 resize-none"
                />
              </div>
            </form>

            <div className="px-6 py-5 border-t border-gray-100 space-y-3">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-xl active:scale-95 transition-transform"
              >
                {editingService ? '保存修改' : '创建服务'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-full py-3.5 bg-gray-100 text-gray-700 font-medium rounded-xl active:scale-95 transition-transform"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;
