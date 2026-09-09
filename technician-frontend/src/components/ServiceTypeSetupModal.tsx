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
        <div className="px-6 py-5 border-b border-[var(--nb-line)]">
          <h2 className="text-lg font-bold text-[var(--nb-ink)]">
            {isForceSetup ? '完善服务信息' : '服务类型设置'}
          </h2>
          <p className="mt-1 text-sm text-[var(--nb-secondary)]">
            {isForceSetup
              ? '首次登录，请设置您提供的服务类型'
              : '设置您提供的服务类型'}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-[var(--nb-page)] text-[var(--nb-secondary)] text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Service Type Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--nb-ink)]">
              服务类型 <span className="text-[var(--nb-secondary)]">*</span>
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  homeService
                    ? 'border-[var(--nb-ink)] bg-[var(--nb-page)]'
                    : 'border-[var(--nb-line)] hover:border-[var(--nb-control)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={homeService}
                  onChange={(e) => setHomeService(e.target.checked)}
                  className="w-5 h-5 text-[var(--nb-secondary)] rounded border-[var(--nb-control)] focus:ring-[var(--nb-ink)]"
                />
                <div className="flex-1">
                  <p className="font-medium text-[var(--nb-ink)]">上门美甲</p>
                  <p className="text-xs text-[var(--nb-secondary)]">提供上门到客户指定地点服务</p>
                </div>
                <span className="text-2xl">🚗</span>
              </label>

              <label
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  shopService
                    ? 'border-[var(--nb-ink)] bg-[var(--nb-page)]'
                    : 'border-[var(--nb-line)] hover:border-[var(--nb-control)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={shopService}
                  onChange={(e) => setShopService(e.target.checked)}
                  className="w-5 h-5 text-[var(--nb-secondary)] rounded border-[var(--nb-control)] focus:ring-[var(--nb-ink)]"
                />
                <div className="flex-1">
                  <p className="font-medium text-[var(--nb-ink)]">到店美甲</p>
                  <p className="text-xs text-[var(--nb-secondary)]">客户到您的店铺接受服务</p>
                </div>
                <span className="text-2xl">🏪</span>
              </label>
            </div>
          </div>

          {/* Shop Info */}
          {shopService && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[var(--nb-ink)]">
                  店铺信息
                </label>
                {onNavigateToShop && (
                  <button
                    onClick={() => {
                      onClose?.();
                      onNavigateToShop();
                    }}
                    className="text-sm text-[var(--nb-secondary)] font-medium flex items-center gap-1"
                  >
                    去配置
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>

              {existingShops.length === 0 ? (
                <div className="rounded-xl bg-[var(--nb-page)] p-4 border border-[var(--nb-line)]">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[var(--nb-secondary)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-[var(--nb-ink)]">需要配置店铺</p>
                      <p className="text-xs text-[var(--nb-secondary)] mt-1">
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
                      className="p-4 bg-[var(--nb-page)] rounded-xl flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--nb-page)] flex items-center justify-center flex-shrink-0">
                        <span className="text-[var(--nb-secondary)] text-sm">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--nb-ink)]">{address.name}</p>
                        <p className="text-sm text-[var(--nb-secondary)] truncate">
                          {[address.province, address.city, address.district, address.detailAddress]
                            .filter(Boolean)
                            .join(' ')}
                        </p>
                        {(address.enabled ?? true) ? (
                          <span className="inline-flex items-center gap-1 mt-1 text-xs text-[var(--nb-secondary)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--nb-action)]"></span>
                            营业中
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 mt-1 text-xs text-[var(--nb-muted)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--nb-pressed)]"></span>
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
        <div className="px-6 py-5 border-t border-[var(--nb-line)] space-y-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 bg-[var(--nb-action)] text-white font-medium rounded-xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存设置'}
          </button>
          {!isForceSetup && onClose && (
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-[var(--nb-page)] text-[var(--nb-ink)] font-medium rounded-xl active:scale-95 transition-transform"
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
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--nb-page)]">
                <span className="text-2xl">🏪</span>
              </div>
              <h3 className="text-lg font-bold text-[var(--nb-ink)] mb-2">需要创建店铺</h3>
              <p className="text-sm text-[var(--nb-secondary)] mb-6">
                开启到店美甲服务需要先创建店铺，请前往【店铺管理】创建店铺后再开启此服务。
              </p>
              <div className="space-y-3">
                {onNavigateToShop && (
                  <button
                    onClick={() => {
                      onClose?.();
                      onNavigateToShop();
                    }}
                    className="w-full py-3 bg-[var(--nb-action)] text-white font-medium rounded-xl active:scale-95 transition-transform"
                  >
                    前往店铺管理
                  </button>
                )}
                <button
                  onClick={() => setShowShopRequiredModal(false)}
                  className="w-full py-3 bg-[var(--nb-page)] text-[var(--nb-ink)] font-medium rounded-xl active:scale-95 transition-transform"
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
