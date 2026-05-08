import React, { useEffect, useState } from 'react';
import type { ShopAddress, ServiceTypeSettings } from '../contexts/authTypes';

interface ServiceTypeSetupModalProps {
  isOpen: boolean;
  onSubmit: (settings: ServiceTypeSettings) => Promise<void>;
  onClose?: () => void;
  isForceSetup?: boolean;
  existingShops?: ShopAddress[];
  initialHomeService?: boolean;
  initialShopService?: boolean;
  onNavigateToShop?: () => void;
}

export const ServiceTypeSetupModal: React.FC<ServiceTypeSetupModalProps> = ({
  isOpen,
  onSubmit,
  onClose,
  isForceSetup = true,
  existingShops = [],
  initialHomeService = false,
  initialShopService = false,
  onNavigateToShop,
}) => {
  const [homeService, setHomeService] = useState(initialHomeService);
  const [shopService, setShopService] = useState(initialShopService);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showShopRequiredModal, setShowShopRequiredModal] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setHomeService(initialHomeService);
    setShopService(initialShopService);
    setError('');
    setShowShopRequiredModal(false);
  }, [initialHomeService, initialShopService, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!homeService && !shopService) {
      setError('请至少选择一种服务类型');
      return;
    }

    // 如果选择了到店服务，检查是否已有店铺
    if (shopService && existingShops.length === 0) {
      setShowShopRequiredModal(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit({
        homeService,
        shopService,
        shopAddresses: shopService ? existingShops : [],
      });
    } catch (err: any) {
      setError(err.message || '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isForceSetup ? '完善服务信息' : '服务类型设置'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {isForceSetup
              ? '首次登录，请设置您提供的服务类型'
              : '设置您提供的服务类型'}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Service Type Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              服务类型 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  homeService
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={homeService}
                  onChange={(e) => setHomeService(e.target.checked)}
                  className="w-5 h-5 text-pink-500 rounded border-gray-300 focus:ring-pink-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">上门美甲</p>
                  <p className="text-xs text-gray-500">提供上门到客户指定地点服务</p>
                </div>
                <span className="text-2xl">🚗</span>
              </label>

              <label
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  shopService
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={shopService}
                  onChange={(e) => setShopService(e.target.checked)}
                  className="w-5 h-5 text-pink-500 rounded border-gray-300 focus:ring-pink-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">到店美甲</p>
                  <p className="text-xs text-gray-500">客户到您的店铺接受服务</p>
                </div>
                <span className="text-2xl">🏪</span>
              </label>
            </div>
          </div>

          {/* Shop Info */}
          {shopService && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  店铺信息
                </label>
                {onNavigateToShop && (
                  <button
                    onClick={() => {
                      onClose?.();
                      onNavigateToShop();
                    }}
                    className="text-sm text-pink-500 font-medium flex items-center gap-1"
                  >
                    去配置
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>

              {existingShops.length === 0 ? (
                <div className="rounded-xl bg-orange-50 p-4 border border-orange-100">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-orange-800">需要配置店铺</p>
                      <p className="text-xs text-orange-600 mt-1">
                        开启到店美甲需要先创建店铺。保存后将跳转到店铺管理页面进行配置。
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {existingShops.map((address, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-xl flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-pink-500 text-sm">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{address.name}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {[address.province, address.city, address.district, address.detailAddress]
                            .filter(Boolean)
                            .join(' ')}
                        </p>
                        {(address.enabled ?? true) ? (
                          <span className="inline-flex items-center gap-1 mt-1 text-xs text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            营业中
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 mt-1 text-xs text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                            已关闭
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gray-100 space-y-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存设置'}
          </button>
          {!isForceSetup && onClose && (
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-gray-100 text-gray-700 font-medium rounded-xl active:scale-95 transition-transform"
            >
              取消
            </button>
          )}
        </div>
      </div>

      {/* Shop Required Modal */}
      {showShopRequiredModal && (
        <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50">
                <span className="text-2xl">🏪</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">需要创建店铺</h3>
              <p className="text-sm text-gray-500 mb-6">
                开启到店美甲服务需要先创建店铺，请前往【店铺管理】创建店铺后再开启此服务。
              </p>
              <div className="space-y-3">
                {onNavigateToShop && (
                  <button
                    onClick={() => {
                      onClose?.();
                      onNavigateToShop();
                    }}
                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-xl active:scale-95 transition-transform"
                  >
                    前往店铺管理
                  </button>
                )}
                <button
                  onClick={() => setShowShopRequiredModal(false)}
                  className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl active:scale-95 transition-transform"
                >
                  我知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
