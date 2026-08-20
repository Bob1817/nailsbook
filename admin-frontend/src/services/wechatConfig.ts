import api from './api';

export interface WechatConfig {
  loginEnabled: boolean;
  miniProgramAppId: string;
  hasMiniProgramSecret: boolean;
  loginValidatedAt: string | null;
  loginValidationError: string | null;
  paymentEnabled: boolean;
  merchantId: string;
  merchantSerialNo: string;
  hasMerchantPrivateKey: boolean;
  hasApiV3Key: boolean;
  paymentNotifyUrl: string;
  paymentValidatedAt: string | null;
  paymentValidationError: string | null;
  updatedAt: string;
}

export interface LaunchConfig {
  operatorName: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  privacyContact: string;
  filingNumber: string;
  launchTechnicianId: number | null;
  bookingReminderTemplateId: string;
  technician: null | {
    id: number;
    name: string;
    phone: string;
    status: string;
    homeService: boolean;
    shopService: boolean;
  };
  launchModeLocked: boolean;
  required: Record<string, boolean>;
  readyForReview: boolean;
  updatedAt: string;
}

export type UpdateLaunchConfig = Pick<
  LaunchConfig,
  | 'operatorName'
  | 'storeName'
  | 'storeAddress'
  | 'storePhone'
  | 'privacyContact'
  | 'filingNumber'
  | 'bookingReminderTemplateId'
> & { launchTechnicianId: number };

export const wechatConfigService = {
  get: () => api.get<WechatConfig>('/wechat-config').then((r) => r.data),
  updateLogin: (data: {
    loginEnabled: boolean;
    miniProgramAppId: string;
    miniProgramSecret?: string;
  }) => api.patch<WechatConfig>('/wechat-config/login', data).then((r) => r.data),
  validateLogin: () => api.post<WechatConfig>('/wechat-config/login/validate').then((r) => r.data),
  updatePayment: (data: {
    paymentEnabled: boolean;
    merchantId: string;
    merchantSerialNo: string;
    merchantPrivateKey?: string;
    apiV3Key?: string;
    paymentNotifyUrl: string;
  }) => api.patch<WechatConfig>('/wechat-config/payment', data).then((r) => r.data),
  validatePayment: () => api.post<WechatConfig>('/wechat-config/payment/validate').then((r) => r.data),
  getLaunch: () => api.get<LaunchConfig>('/wechat-config/launch').then((r) => r.data),
  updateLaunch: (data: UpdateLaunchConfig) =>
    api.patch<LaunchConfig>('/wechat-config/launch', data).then((r) => r.data),
};
