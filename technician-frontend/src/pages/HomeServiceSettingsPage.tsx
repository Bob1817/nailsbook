import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import type { HomeServiceSettings, HomeServiceFeeConfig } from '../contexts/authTypes';

const defaultFeeConfig: HomeServiceFeeConfig = {
  distanceRanges: [
    { minDistance: 0, maxDistance: 3, baseFee: 0 },
    { minDistance: 3, maxDistance: 5, baseFee: 20 },
    { minDistance: 5, maxDistance: 10, baseFee: 40 },
    { minDistance: 10, maxDistance: -1, baseFee: 60 },
  ],
  timeSlotFees: {
    daytime: { start: '08:00', end: '18:00', fee: 0 },
    nighttime: { start: '18:00', end: '08:00', fee: 30 },
  },
  holidayFee: 20,
};

const defaultSettings: HomeServiceSettings = {
  enabled: false,
  serviceRadius: 10,
  feeConfig: defaultFeeConfig,
};

const STORAGE_KEY = 'home_service_settings';

const HomeServiceSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { technician, updateServiceType } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState<HomeServiceSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'fee'>('basic');
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    // 从 localStorage 或 technician 数据加载设置
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      } catch {
        // 使用默认设置
      }
    } else if (technician?.homeServiceSettings) {
      setSettings(technician.homeServiceSettings);
    }
  }, [technician?.homeServiceSettings]);

  const saveSettings = async (newSettings: HomeServiceSettings) => {
    setLoading(true);
    try {
      // 保存到 localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

      // 同步到后端
      await updateServiceType({
        homeService: newSettings.enabled,
        shopService: technician?.shopService || false,
        shopAddresses: technician?.shopAddresses || [],
        homeServiceSettings: newSettings,
      });

      setSettings(newSettings);
      toast.success('设置已保存');
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async () => {
    const newSettings = { ...settings, enabled: !settings.enabled };
    await saveSettings(newSettings);
  };

  const handleUpdateBaseAddress = (field: string, value: string) => {
    const currentBaseAddress = settings.baseAddress || {
      name: '',
      detailAddress: '',
    };
    const newSettings = {
      ...settings,
      baseAddress: {
        ...currentBaseAddress,
        [field]: value,
      },
    };
    setSettings(newSettings);
  };

  const handleUpdateFeeConfig = (updates: Partial<HomeServiceFeeConfig>) => {
    setSettings({
      ...settings,
      feeConfig: { ...settings.feeConfig, ...updates },
    });
  };

  const handleUpdateDistanceRange = (index: number, field: string, value: number) => {
    const newRanges = [...settings.feeConfig.distanceRanges];
    newRanges[index] = { ...newRanges[index], [field]: value };
    handleUpdateFeeConfig({ distanceRanges: newRanges });
  };

  const handleAddDistanceRange = () => {
    const lastRange = settings.feeConfig.distanceRanges[settings.feeConfig.distanceRanges.length - 1];
    const newRange = {
      minDistance: lastRange?.maxDistance === -1 ? lastRange.minDistance + 5 : lastRange?.maxDistance || 0,
      maxDistance: -1,
      baseFee: 0,
    };
    handleUpdateFeeConfig({
      distanceRanges: [...settings.feeConfig.distanceRanges, newRange],
    });
  };

  const handleRemoveDistanceRange = (index: number) => {
    const newRanges = settings.feeConfig.distanceRanges.filter((_, i) => i !== index);
    handleUpdateFeeConfig({ distanceRanges: newRanges });
  };

  const handleSubmit = async () => {
    if (settings.enabled && !settings.baseAddress?.detailAddress) {
      toast.error('请填写服务起点地址');
      return;
    }
    await saveSettings(settings);
  };

  return (
    <div className="min-h-full bg-[#fff9f8] pb-32">
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
            <h1 className="text-xl font-bold text-gray-900">上门设置</h1>
            <p className="text-sm text-gray-500">配置上门美甲服务</p>
          </div>
        </div>
      </div>

      {/* Enable Toggle */}
      <div className="px-5 py-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">开启上门服务</h3>
              <p className="text-sm text-gray-500 mt-1">开启后用户可在预约时选择上门美甲</p>
            </div>
            <button
              onClick={handleToggleEnabled}
              disabled={loading}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                settings.enabled ? 'bg-pink-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {settings.enabled && (
        <>
          {/* Tabs */}
          <div className="px-5 mb-4">
            <div className="flex rounded-xl bg-gray-100 p-1">
              <button
                onClick={() => setActiveTab('basic')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'basic'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                基础设置
              </button>
              <button
                onClick={() => setActiveTab('fee')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'fee'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                费用设置
              </button>
            </div>
          </div>

          {/* Basic Settings Tab */}
          {activeTab === 'basic' && (
            <div className="px-5 space-y-4">
              {/* Base Address */}
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">服务起点地址</h3>
                <p className="text-sm text-gray-500 mb-4">用户预约时将基于该地址计算距离</p>

                {settings.baseAddress?.detailAddress ? (
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{settings.baseAddress.name || '常用地址'}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {[settings.baseAddress.province, settings.baseAddress.city, settings.baseAddress.district, settings.baseAddress.detailAddress]
                            .filter(Boolean)
                            .join(' ')}
                        </p>
                        {settings.baseAddress.doorInfo && (
                          <p className="text-xs text-gray-500 mt-1">{settings.baseAddress.doorInfo}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setShowAddressForm(true)}
                        className="text-sm text-pink-500 font-medium"
                      >
                        修改
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    添加服务起点地址
                  </button>
                )}
              </div>

              {/* Service Radius */}
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">服务范围</h3>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={settings.serviceRadius}
                    onChange={(e) => setSettings({ ...settings, serviceRadius: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                  <span className="text-sm font-medium text-gray-900 w-16 text-right">
                    {settings.serviceRadius} km
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">超出此范围的用户将无法预约上门服务</p>
              </div>
            </div>
          )}

          {/* Fee Settings Tab */}
          {activeTab === 'fee' && (
            <div className="px-5 space-y-4">
              {/* Distance-based Fees */}
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">距离费用</h3>
                  <button
                    onClick={handleAddDistanceRange}
                    className="text-sm text-pink-500 font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    添加区间
                  </button>
                </div>

                <div className="space-y-3">
                  {settings.feeConfig.distanceRanges.map((range, index) => (
                    <div key={index} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>{range.minDistance}km</span>
                          <span>~</span>
                          <span>{range.maxDistance === -1 ? '不限' : `${range.maxDistance}km`}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={range.baseFee}
                          onChange={(e) => handleUpdateDistanceRange(index, 'baseFee', parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg text-center"
                        />
                        <span className="text-sm text-gray-500">元</span>
                      </div>
                      {settings.feeConfig.distanceRanges.length > 1 && (
                        <button
                          onClick={() => handleRemoveDistanceRange(index)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Time-based Fees */}
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">时段费用</h3>

                <div className="space-y-4">
                  {/* Daytime */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">白天时段</p>
                      <p className="text-xs text-gray-500">
                        {settings.feeConfig.timeSlotFees.daytime.start} - {settings.feeConfig.timeSlotFees.daytime.end}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">额外费用</span>
                      <input
                        type="number"
                        value={settings.feeConfig.timeSlotFees.daytime.fee}
                        onChange={(e) => {
                          const newTimeSlotFees = {
                            ...settings.feeConfig.timeSlotFees,
                            daytime: { ...settings.feeConfig.timeSlotFees.daytime, fee: parseInt(e.target.value) || 0 },
                          };
                          handleUpdateFeeConfig({ timeSlotFees: newTimeSlotFees });
                        }}
                        className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg text-center"
                      />
                      <span className="text-sm text-gray-500">元</span>
                    </div>
                  </div>

                  {/* Nighttime */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">夜间时段</p>
                      <p className="text-xs text-gray-500">
                        {settings.feeConfig.timeSlotFees.nighttime.start} - {settings.feeConfig.timeSlotFees.nighttime.end}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">额外费用</span>
                      <input
                        type="number"
                        value={settings.feeConfig.timeSlotFees.nighttime.fee}
                        onChange={(e) => {
                          const newTimeSlotFees = {
                            ...settings.feeConfig.timeSlotFees,
                            nighttime: { ...settings.feeConfig.timeSlotFees.nighttime, fee: parseInt(e.target.value) || 0 },
                          };
                          handleUpdateFeeConfig({ timeSlotFees: newTimeSlotFees });
                        }}
                        className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg text-center"
                      />
                      <span className="text-sm text-gray-500">元</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Holiday Fee */}
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">节假日费用</h3>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">节假日额外费用</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.feeConfig.holidayFee}
                      onChange={(e) => handleUpdateFeeConfig({ holidayFee: parseInt(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg text-center"
                    />
                    <span className="text-sm text-gray-500">元</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Address Form Modal */}
      {showAddressForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">设置服务起点地址</h2>
              <button
                onClick={() => setShowAddressForm(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">地址名称</label>
                <input
                  type="text"
                  value={settings.baseAddress?.name || ''}
                  onChange={(e) => handleUpdateBaseAddress('name', e.target.value)}
                  placeholder="如：工作室、家"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">省</label>
                  <input
                    type="text"
                    value={settings.baseAddress?.province || ''}
                    onChange={(e) => handleUpdateBaseAddress('province', e.target.value)}
                    placeholder="省份"
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">市</label>
                  <input
                    type="text"
                    value={settings.baseAddress?.city || ''}
                    onChange={(e) => handleUpdateBaseAddress('city', e.target.value)}
                    placeholder="城市"
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">区</label>
                  <input
                    type="text"
                    value={settings.baseAddress?.district || ''}
                    onChange={(e) => handleUpdateBaseAddress('district', e.target.value)}
                    placeholder="区县"
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">详细地址 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={settings.baseAddress?.detailAddress || ''}
                  onChange={(e) => handleUpdateBaseAddress('detailAddress', e.target.value)}
                  placeholder="街道、门牌号"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">门牌/房间号</label>
                <input
                  type="text"
                  value={settings.baseAddress?.doorInfo || ''}
                  onChange={(e) => handleUpdateBaseAddress('doorInfo', e.target.value)}
                  placeholder="如：A座 1201室"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">联系电话</label>
                <input
                  type="tel"
                  value={settings.baseAddress?.phone || ''}
                  onChange={(e) => handleUpdateBaseAddress('phone', e.target.value)}
                  placeholder="联系电话"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-100">
              <button
                onClick={() => {
                  if (!settings.baseAddress?.detailAddress) {
                    toast.error('请填写详细地址');
                    return;
                  }
                  setShowAddressForm(false);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-xl active:scale-95 transition-transform"
              >
                确认地址
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      {settings.enabled && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 safe-area-bottom">
          <div className="mx-auto max-w-md">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-pink-400 to-pink-500 py-3.5 font-medium text-white shadow-lg disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeServiceSettingsPage;
