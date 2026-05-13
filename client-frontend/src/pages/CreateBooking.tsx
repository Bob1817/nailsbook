import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/order';
import { addressService, type ClientAddress } from '../services/address';
import { uploadService } from '../services/upload';
import { worksService, type NailWork } from '../services/works';
import { customServiceRequestService } from '../services/customServiceRequest';
import { designService, type DesignRequest } from '../services/design';
import type { ShopAddress, Technician, TechnicianServiceItem } from '../services/auth';

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30',
];

const serviceTypeOptions = [
  { value: '上门美甲', label: '上门美甲', description: '美甲师按预约时间上门服务' },
  { value: '到店美甲', label: '到店美甲', description: '前往美甲师提供的门店地址服务' },
];

const formatClientAddress = (address: ClientAddress) =>
  [address.province, address.city, address.district, address.detailAddress].filter(Boolean).join(' ');

const formatShopAddress = (address: ShopAddress) =>
  [address.province, address.city, address.district, address.detailAddress].filter(Boolean).join(' ');

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const getShopHoursForDate = (shopAddress: ShopAddress | null, serviceDate: string) => {
  if (!shopAddress?.businessHours || !serviceDate) {
    return null;
  }

  const weekday = new Date(`${serviceDate}T00:00:00`).getDay();
  return shopAddress.businessHours.find((item) => item.weekday === weekday) || null;
};

const getEnabledShopAddresses = (tech: Technician | null) =>
  (tech?.shopAddresses || []).filter((item) => item.enabled !== false);

const getBookableTechnicians = (technicians: Technician[]) =>
  technicians.filter((tech) => tech.status === 'active' && (tech.homeService || getEnabledShopAddresses(tech).length > 0));

const getAvailableServiceTypes = (tech: Technician | null) => {
  if (!tech) {
    return [];
  }

  return serviceTypeOptions.filter((option) => {
    if (option.value === '上门美甲') {
      return tech.homeService;
    }
    if (option.value === '到店美甲') {
      return tech.shopService && getEnabledShopAddresses(tech).length > 0;
    }
    return false;
  });
};

const CreateBooking: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { technicians, refreshProfile } = useAuth();
  const bookableTechnicians = useMemo(() => getBookableTechnicians(technicians), [technicians]);
  const [addresses, setAddresses] = useState<ClientAddress[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Get design info from URL params
  const designId = searchParams.get('design_id');
  const designTechId = searchParams.get('tech_id');
  const [designFromUrl, setDesignFromUrl] = useState<DesignRequest | null>(null);
  
  const [formData, setFormData] = useState({
    serviceDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    startTime: '14:00',
    addressId: 0,
    techId: designTechId ? parseInt(designTechId) : (bookableTechnicians.length === 1 ? bookableTechnicians[0].id : 0),
    serviceType: '',
    shopAddressName: '',
    remark: '',
    selectedServiceIds: [] as string[],
  });

  // Custom service state
  const [isCustomService, setIsCustomService] = useState(false);
  const [customServiceTitle, setCustomServiceTitle] = useState('');
  const [customServiceDescription, setCustomServiceDescription] = useState('');
  const [customServiceImages, setCustomServiceImages] = useState<string[]>([]);
  const [selectedWorks, setSelectedWorks] = useState<NailWork[]>([]);
  const [technicianWorks, setTechnicianWorks] = useState<NailWork[]>([]);
  const [showWorkSelector, setShowWorkSelector] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTechnician = useMemo(
    () => bookableTechnicians.find((item) => item.id === formData.techId) || null,
    [bookableTechnicians, formData.techId],
  );
  const isHomeService = formData.serviceType === '上门美甲';
  const isShopService = formData.serviceType === '到店美甲';
  const canChooseServiceType = !!selectedTechnician;

  const availableServiceTypes = useMemo(
    () => getAvailableServiceTypes(selectedTechnician),
    [selectedTechnician],
  );

  const availableShopAddresses = useMemo(
    () => getEnabledShopAddresses(selectedTechnician),
    [selectedTechnician],
  );

  const selectedShopAddress = useMemo(
    () => availableShopAddresses.find((item) => item.name === formData.shopAddressName) || null,
    [availableShopAddresses, formData.shopAddressName],
  );
  const selectedShopHours = useMemo(
    () => getShopHoursForDate(selectedShopAddress, formData.serviceDate),
    [formData.serviceDate, selectedShopAddress],
  );
  const shopAvailableTimeSlots = useMemo(() => {
    if (!isShopService || !selectedShopAddress) {
      return timeSlots;
    }

    if (!selectedShopHours || selectedShopHours.closed) {
      return [];
    }

    const startMinutes = timeToMinutes(selectedShopHours.start);
    const endMinutes = timeToMinutes(selectedShopHours.end);
    return timeSlots.filter((slot) => {
      const slotMinutes = timeToMinutes(slot);
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  }, [isShopService, selectedShopAddress, selectedShopHours]);
  const activeServiceItems = useMemo(
    () =>
      (selectedTechnician?.serviceItems || [])
        .filter((item) => item.isActive)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [selectedTechnician],
  );

  useEffect(() => {
    void refreshProfile();
    // 这里只需要进入页面时拉一次最新技师资料，避免旧缓存导致服务内容/到店能力显示不全。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAddresses();
  }, []);

  // Load design from URL if design_id is provided
  useEffect(() => {
    if (designId) {
      designService.getDesign(parseInt(designId)).then((design) => {
        setDesignFromUrl(design);
        // Pre-fill custom service with design info
        setIsCustomService(true);
        setCustomServiceTitle(design.title || '设计作品');
        setCustomServiceDescription(design.description || '');
        setCustomServiceImages(design.imageUrls || []);
      }).catch((error) => {
        console.error('Failed to load design:', error);
      });
    }
  }, [designId]);

  useEffect(() => {
    if (bookableTechnicians.length === 1 && formData.techId === 0) {
      setFormData((prev) => ({ ...prev, techId: bookableTechnicians[0].id }));
    }
  }, [bookableTechnicians, formData.techId]);

  useEffect(() => {
    setFormData((prev) => {
      const nextTechId = prev.techId;
      const nextSelectedTech = bookableTechnicians.find((item) => item.id === nextTechId) || null;
      const nextOptions = getAvailableServiceTypes(nextSelectedTech);

      if (!nextSelectedTech) {
        const fallbackTechId = bookableTechnicians.length === 1 ? bookableTechnicians[0].id : 0;
        return { ...prev, techId: fallbackTechId, serviceType: '', shopAddressName: '', selectedServiceIds: [] };
      }

      if (nextOptions.length === 1) {
        const forcedServiceType = nextOptions[0].value;
        return {
          ...prev,
          serviceType: forcedServiceType,
          shopAddressName:
            forcedServiceType === '到店美甲' && getEnabledShopAddresses(nextSelectedTech).some((item) => item.name === prev.shopAddressName)
              ? prev.shopAddressName
              : '',
          selectedServiceIds:
            bookableTechnicians.find((item) => item.id === prev.techId)?.id === nextSelectedTech.id ? prev.selectedServiceIds : [],
        };
      }

      if (nextOptions.length === 2 && !nextOptions.some((item) => item.value === prev.serviceType)) {
        return { ...prev, serviceType: '', shopAddressName: '', selectedServiceIds: [] };
      }

      if (prev.serviceType === '上门美甲') {
        return { ...prev, shopAddressName: '' };
      }

      if (prev.shopAddressName && !getEnabledShopAddresses(nextSelectedTech).some((item) => item.name === prev.shopAddressName)) {
        return { ...prev, shopAddressName: '' };
      }

      return prev;
    });
  }, [bookableTechnicians, formData.techId]);

  useEffect(() => {
    if (!isShopService || !selectedShopAddress) {
      return;
    }

    if (shopAvailableTimeSlots.length === 0) {
      setFormData((prev) => ({ ...prev, startTime: '' }));
      return;
    }

    if (!shopAvailableTimeSlots.includes(formData.startTime)) {
      setFormData((prev) => ({ ...prev, startTime: shopAvailableTimeSlots[0] }));
    }
  }, [formData.startTime, isShopService, selectedShopAddress, shopAvailableTimeSlots]);

  const loadAddresses = async () => {
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
      if (data.length > 0) {
        const defaultAddress = data.find((item) => item.isDefault) || data[0];
        setFormData((prev) => ({ ...prev, addressId: prev.addressId || defaultAddress.id }));
      }
    } catch (error) {
      console.error('Failed to load addresses:', error);
    }
  };

  const loadTechnicianWorks = async (techId: number) => {
    try {
      console.log('[Debug] Loading works for techId:', techId);
      const works = await worksService.getWorks();
      console.log('[Debug] Raw works from API:', works);
      console.log('[Debug] First work technicianId:', works[0]?.technicianId);
      const techWorks = works.filter((work) => work.technicianId === techId);
      console.log('[Debug] Filtered techWorks:', techWorks);
      console.log('[Debug] techWorks length:', techWorks.length);
      setTechnicianWorks(techWorks);
    } catch (error) {
      console.error('Failed to load technician works:', error);
    }
  };

  useEffect(() => {
    if (selectedTechnician) {
      loadTechnicianWorks(selectedTechnician.id);
    }
  }, [selectedTechnician]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const result = await uploadService.uploadImage(file);
      setCustomServiceImages((prev) => [...prev, result.url]);
    } catch (error) {
      alert('图片上传失败，请重试');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setCustomServiceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleWorkSelection = (work: NailWork) => {
    setSelectedWorks((prev) => {
      const exists = prev.find((w) => w.id === work.id);
      if (exists) {
        return prev.filter((w) => w.id !== work.id);
      }
      if (prev.length >= 3) {
        alert('最多可选择3个参考作品');
        return prev;
      }
      return [...prev, work];
    });
  };

  const removeSelectedWork = (workId: number) => {
    setSelectedWorks((prev) => prev.filter((w) => w.id !== workId));
  };

  const canSubmit = (() => {
    if (!selectedTechnician) {
      return false;
    }

    if (!formData.serviceType) {
      return false;
    }

    if (isHomeService && formData.addressId === 0) {
      return false;
    }

    if (isShopService && !selectedShopAddress) {
      return false;
    }

    // For custom service, check custom service fields
    if (isCustomService) {
      return customServiceTitle.trim().length > 0;
    }

    // For regular service, check selected services
    if (activeServiceItems.length === 0 || formData.selectedServiceIds.length === 0) {
      return false;
    }

    if (isShopService && selectedShopAddress && !shopAvailableTimeSlots.includes(formData.startTime)) {
      return false;
    }

    return true;
  })();

  const handleTechnicianSelect = (techId: number) => {
    setFormData((prev) => ({
      ...prev,
      techId,
      serviceType: '',
      shopAddressName: '',
      selectedServiceIds: [],
    }));
  };

  const handleServiceTypeSelect = (serviceType: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceType,
      shopAddressName: serviceType === '到店美甲' ? prev.shopAddressName : '',
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!selectedTechnician) {
      alert('请选择美甲师');
      return;
    }

    if (!formData.serviceType) {
      alert('请选择服务类型');
      return;
    }

    if (isHomeService && formData.addressId === 0) {
      alert('请选择上门服务地址');
      return;
    }

    if (isShopService && !selectedShopAddress) {
      alert('请选择到店门店地址');
      return;
    }

    setSubmitting(true);
    try {
      if (isCustomService) {
        // Create custom service request
        if (!customServiceTitle.trim()) {
          alert('请输入自定义服务名称');
          setSubmitting(false);
          return;
        }

        await customServiceRequestService.create({
          techId: formData.techId,
          title: customServiceTitle.trim(),
          description: customServiceDescription.trim() || undefined,
          images: customServiceImages.length > 0 ? customServiceImages : undefined,
          referenceWorkIds: selectedWorks.length > 0 ? selectedWorks.map((w) => w.id) : undefined,
          serviceDate: formData.serviceDate,
          startTime: formData.startTime,
          serviceType: formData.serviceType,
          addressId: isHomeService ? formData.addressId : undefined,
          shopAddress: isShopService && selectedShopAddress ? selectedShopAddress : undefined,
        });
        
        alert('自定义服务需求已提交，请等待美甲师报价');
        navigate('/messages');
      } else {
        // Regular booking flow
        if (activeServiceItems.length === 0) {
          alert('该美甲师暂未设置可预约的服务内容');
          setSubmitting(false);
          return;
        }

        if (formData.selectedServiceIds.length === 0) {
          alert('请选择至少一项服务内容');
          setSubmitting(false);
          return;
        }

        await orderService.createOrder({
          serviceDate: formData.serviceDate,
          startTime: formData.startTime,
          techId: formData.techId,
          serviceType: formData.serviceType,
          selectedServiceIds: formData.selectedServiceIds,
          addressId: isHomeService ? formData.addressId : undefined,
          shopAddress: isShopService ? selectedShopAddress || undefined : undefined,
          remark: formData.remark,
        });
        navigate('/bookings');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '创建预约失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#FFFDFD_0%,#F7F3F6_48%,#F2F6FB_100%)]">
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/78 px-5 app-header-safe pb-5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/5"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Create Booking</p>
            <h1 className="mt-0.5 text-lg font-semibold text-gray-900">创建预约</h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-28 pt-6">
        <section className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">选择美甲师</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {bookableTechnicians.length > 1 ? '请选择当前已开启接单的美甲师' : '当前仅有 1 位可预约的美甲师'}
            </p>
          </div>
          {bookableTechnicians.length > 0 ? (
            <div className="space-y-3">
              {bookableTechnicians.map((tech) => {
              const isSelected = formData.techId === tech.id;
              return (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => handleTechnicianSelect(tech.id)}
                  className={`flex w-full items-center gap-3 rounded-[24px] p-4 text-left ring-1 transition ${
                    isSelected
                      ? 'bg-[linear-gradient(135deg,#FFF0F5_0%,#FAFBFF_100%)] ring-[#FF6B8A]/25'
                      : 'bg-slate-50/80 ring-black/5'
                  }`}
                >
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    isSelected ? 'border-[#FF6B8A] bg-[#FF6B8A]' : 'border-slate-300'
                  }`}>
                    {isSelected && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#FFE0EA_0%,#F4F7FB_100%)]">
                    {tech.avatarUrl ? (
                      <img src={tech.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{tech.name}</span>
                      {tech.isDefault && (
                        <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)]">
                          默认
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{tech.city || tech.serviceArea || '暂未设置服务区域'}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tech.homeService && (
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-black/5">
                          上门美甲
                        </span>
                      )}
                      {tech.shopService && (
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-black/5">
                          到店美甲
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            </div>
          ) : (
            <div className="rounded-[24px] bg-slate-50 px-5 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">当前暂无可预约的美甲师</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">请等待美甲师开启接单并配置可用服务后再发起预约</p>
            </div>
          )}
        </section>

        <section className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">服务类型</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {selectedTechnician ? '根据当前美甲师的服务能力选择本次预约方式' : '请先选择美甲师，再继续选择服务类型'}
            </p>
          </div>
          {!canChooseServiceType ? (
            <div className="rounded-[24px] bg-slate-50 px-5 py-6 text-sm text-slate-400">选择美甲师后，这里会显示可预约的服务类型</div>
          ) : (
            <div className="space-y-3">
              {availableServiceTypes.map((option) => {
                const isSelected = formData.serviceType === option.value;
                const isForced = availableServiceTypes.length === 1;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleServiceTypeSelect(option.value)}
                    disabled={isForced}
                    className={`flex w-full items-start justify-between gap-3 rounded-[24px] p-4 text-left ring-1 transition ${
                      isSelected
                        ? 'bg-[linear-gradient(135deg,#FFF0F5_0%,#FAFBFF_100%)] ring-[#FF6B8A]/25'
                        : 'bg-slate-50/80 ring-black/5'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{option.label}</span>
                        {isForced && (
                          <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)]">
                            固定服务
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-gray-500">{option.description}</p>
                    </div>
                    <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      isSelected ? 'border-[#FF6B8A] bg-[#FF6B8A]' : 'border-slate-300'
                    }`}>
                      {isSelected && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">服务内容</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {selectedTechnician ? '选择本次预约需要的具体服务内容，可多选' : '请先选择美甲师，再选择她当前开放的服务内容'}
            </p>
          </div>
          {!selectedTechnician ? (
            <div className="rounded-[24px] bg-slate-50 px-5 py-6 text-sm text-slate-400">选择美甲师后，这里会显示她在服务管理里设置的服务内容</div>
          ) : (
            <div className="space-y-3">
              {/* Custom Service Option */}
              <button
                type="button"
                onClick={() => {
                  setIsCustomService(!isCustomService);
                  if (!isCustomService) {
                    setFormData((prev) => ({ ...prev, selectedServiceIds: [] }));
                  }
                }}
                className={`flex w-full items-start gap-3 rounded-[24px] p-4 text-left ring-1 transition ${
                  isCustomService
                    ? 'bg-[linear-gradient(135deg,#FFF0F5_0%,#FAFBFF_100%)] ring-[#FF6B8A]/25'
                    : 'bg-slate-50/80 ring-black/5'
                }`}
              >
                <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border-2 ${
                  isCustomService ? 'border-[#FF6B8A] bg-[#FF6B8A]' : 'border-slate-300'
                }`}>
                  {isCustomService && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900">自定义服务</span>
                  <p className="mt-1 text-sm leading-6 text-gray-500">描述你的需求，上传参考图片或选择美甲师作品，等待报价</p>
                </div>
              </button>

              {/* Custom Service Form */}
              {isCustomService && (
                <div className="rounded-[24px] bg-slate-50/80 p-4 space-y-4">
                  {/* Title Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">服务名称</label>
                    <input
                      type="text"
                      value={customServiceTitle}
                      onChange={(e) => setCustomServiceTitle(e.target.value)}
                      placeholder="例如：法式渐变美甲"
                      className="w-full rounded-2xl bg-white px-4 py-3 text-gray-900 outline-none ring-1 ring-slate-200 focus:ring-[#FF6B8A]/20"
                    />
                  </div>

                  {/* Description Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">详细描述</label>
                    <textarea
                      value={customServiceDescription}
                      onChange={(e) => setCustomServiceDescription(e.target.value)}
                      placeholder="描述你的具体需求，如颜色、款式、特殊要求等..."
                      rows={3}
                      className="w-full resize-none rounded-2xl bg-white px-4 py-3 text-gray-900 outline-none ring-1 ring-slate-200 focus:ring-[#FF6B8A]/20"
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">参考图片（可选）</label>
                    <div className="flex flex-wrap gap-2">
                      {customServiceImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image}
                            alt={`参考图片 ${index + 1}`}
                            className="w-20 h-20 rounded-xl object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {customServiceImages.length < 3 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="w-20 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-[#FF6B8A] hover:text-[#FF6B8A] transition"
                        >
                          {uploadingImage ? (
                            <span className="text-xs">上传中...</span>
                          ) : (
                            <>
                              <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-xs">添加图片</span>
                            </>
                          )}
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">最多可上传3张图片</p>
                  </div>

                  {/* Reference Works Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-900">参考作品（可选）</label>
                      <button
                        type="button"
                        onClick={() => setShowWorkSelector(!showWorkSelector)}
                        className="text-xs text-[#FF6B8A] font-medium"
                      >
                        {showWorkSelector ? '收起' : '选择作品'}
                      </button>
                    </div>
                    
                    {/* Selected Works Preview */}
                    {selectedWorks.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedWorks.map((work) => (
                          <div key={work.id} className="relative">
                            <img
                              src={work.coverUrl || '/placeholder.jpg'}
                              alt={work.title || '作品'}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeSelectedWork(work.id)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Work Selector */}
                    {showWorkSelector && (
                      <div className="rounded-xl bg-white p-3 max-h-48 overflow-y-auto">
                        {technicianWorks.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {technicianWorks.map((work) => {
                              const isSelected = selectedWorks.some((w) => w.id === work.id);
                              return (
                                <button
                                  key={work.id}
                                  type="button"
                                  onClick={() => toggleWorkSelection(work)}
                                  className={`relative rounded-lg overflow-hidden ${
                                    isSelected ? 'ring-2 ring-[#FF6B8A]' : ''
                                  }`}
                                >
                                  <img
                                    src={work.coverUrl || '/placeholder.jpg'}
                                    alt={work.title || '作品'}
                                    className="w-full h-20 object-cover"
                                  />
                                  {isSelected && (
                                    <div className="absolute inset-0 bg-[#FF6B8A]/20 flex items-center justify-center">
                                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 text-center py-4">该美甲师暂无作品</p>
                        )}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-slate-400">最多可选择3个参考作品</p>
                  </div>
                </div>
              )}

              {/* Regular Service Items */}
              {!isCustomService && (
                activeServiceItems.length > 0 ? (
                  <div className="space-y-3">
                    {activeServiceItems.map((service: TechnicianServiceItem) => {
                      const isSelected = formData.selectedServiceIds.includes(service.id);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              selectedServiceIds: isSelected
                                ? prev.selectedServiceIds.filter((item) => item !== service.id)
                                : [...prev.selectedServiceIds, service.id],
                            }))
                          }
                          className={`flex w-full items-start gap-3 rounded-[24px] p-4 text-left ring-1 transition ${
                            isSelected
                              ? 'bg-[linear-gradient(135deg,#FFF0F5_0%,#FAFBFF_100%)] ring-[#FF6B8A]/25'
                              : 'bg-slate-50/80 ring-black/5'
                          }`}
                        >
                          <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border-2 ${
                            isSelected ? 'border-[#FF6B8A] bg-[#FF6B8A]' : 'border-slate-300'
                          }`}>
                            {isSelected && (
                              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-gray-900">{service.name}</span>
                            {service.description && (
                              <p className="mt-1 text-sm leading-6 text-gray-500">{service.description}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[24px] bg-slate-50 px-5 py-6 text-sm text-slate-400">该美甲师暂未设置可预约的服务内容</div>
                )
              )}
            </div>
          )}
        </section>

        {isHomeService && (
          <section className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">上门服务地址</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">美甲师会按你选择的地址安排上门服务</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/profile/addresses')}
                className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-primary)]"
              >
                管理地址
              </button>
            </div>
            {addresses.length > 0 ? (
              <div className="space-y-3">
                {addresses.map((address) => {
                  const isSelected = formData.addressId === address.id;
                  return (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, addressId: address.id }))}
                      className={`w-full rounded-[24px] p-4 text-left ring-1 transition ${
                        isSelected
                          ? 'bg-[linear-gradient(135deg,#FFF0F5_0%,#FAFBFF_100%)] ring-[#FF6B8A]/25'
                          : 'bg-slate-50/80 ring-black/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          isSelected ? 'border-[#FF6B8A] bg-[#FF6B8A]' : 'border-slate-300'
                        }`}>
                          {isSelected && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{address.contactName || '未命名'}</span>
                            <span className="text-sm text-gray-500">{address.contactPhone}</span>
                            {address.isDefault && (
                              <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)]">
                                默认
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-gray-600">{formatClientAddress(address)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[24px] bg-slate-50 px-5 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">暂无上门地址，请先添加</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">至少添加一个上门地址后，才能继续预约上门美甲</p>
                <button
                  type="button"
                  onClick={() => navigate('/profile/addresses')}
                  className="mt-4 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white"
                >
                  添加地址
                </button>
              </div>
            )}
          </section>
        )}

        {isShopService && (
          <section className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">到店门店地址</h3>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">请选择本次要前往的具体门店地址</p>
            </div>
            {availableShopAddresses.length > 0 ? (
              <div className="space-y-3">
                {availableShopAddresses.map((address) => {
                  const isSelected = formData.shopAddressName === address.name;
                  return (
                    <button
                      key={address.name}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, shopAddressName: address.name }))}
                      className={`w-full rounded-[24px] p-4 text-left ring-1 transition ${
                        isSelected
                          ? 'bg-[linear-gradient(135deg,#FFF0F5_0%,#FAFBFF_100%)] ring-[#FF6B8A]/25'
                          : 'bg-slate-50/80 ring-black/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          isSelected ? 'border-[#FF6B8A] bg-[#FF6B8A]' : 'border-slate-300'
                        }`}>
                          {isSelected && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{address.name}</span>
                            {address.phone && <span className="text-sm text-gray-500">{address.phone}</span>}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-gray-600">{formatShopAddress(address)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[24px] bg-slate-50 px-5 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">该美甲师暂未配置可预约门店</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">请改选上门服务，或联系美甲师补充门店地址后再预约</p>
              </div>
            )}
          </section>
        )}

        <section className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">预约时间</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">确认服务方式后，选择你方便的预约时间段</p>
          </div>
            <div className="space-y-4">
              <input
                type="date"
              value={formData.serviceDate}
              min={dayjs().format('YYYY-MM-DD')}
              onChange={(e) => setFormData((prev) => ({ ...prev, serviceDate: e.target.value }))}
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-gray-900 outline-none ring-1 ring-transparent focus:ring-[#FF6B8A]/20"
              />
              {isShopService && selectedShopAddress && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  {shopAvailableTimeSlots.length > 0
                    ? `店铺营业时间：${selectedShopHours?.start} - ${selectedShopHours?.end}`
                    : '所选日期为该店铺休息日，请改选其他日期'}
                </div>
              )}
              <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto scrollbar-hide">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, startTime: time }))}
                    disabled={isShopService && selectedShopAddress ? !shopAvailableTimeSlots.includes(time) : false}
                    className={`rounded-2xl py-2.5 text-sm font-medium transition ${
                      formData.startTime === time
                        ? 'bg-[linear-gradient(135deg,#FF6B8A_0%,#FF8FA3_100%)] text-white shadow-lg shadow-pink-200/80'
                        : isShopService && selectedShopAddress && !shopAvailableTimeSlots.includes(time)
                          ? 'cursor-not-allowed bg-slate-100 text-slate-300'
                          : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    {time}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">补充说明</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">填写特殊需求，方便美甲师提前准备</p>
          </div>
          <textarea
            value={formData.remark}
            onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
            placeholder="请输入你的特殊需求，如：想做粉色渐变、需要自带卸甲等..."
            rows={4}
            className="w-full resize-none rounded-2xl bg-slate-50 px-4 py-3 text-gray-900 outline-none ring-1 ring-transparent focus:ring-[#FF6B8A]/20"
          />
        </section>
      </form>

      <div className="fixed bottom-0 left-0 right-0 border-t border-white/60 bg-white/88 px-5 py-4 safe-area-bottom backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <button
            onClick={() => handleSubmit()}
            disabled={submitting || !canSubmit}
            className="w-full rounded-full bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] py-4 font-medium text-white shadow-lg shadow-pink-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '提交中...' : isCustomService ? '提交需求等待报价' : '提交预约'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateBooking;
