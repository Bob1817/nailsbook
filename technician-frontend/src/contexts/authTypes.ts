export interface ShopBusinessHour {
  weekday: number;
  start: string;
  end: string;
  closed?: boolean;
}

export interface ShopAddress {
  name: string;
  phone?: string;
  province?: string;
  city?: string;
  district?: string;
  detailAddress?: string;
  doorInfo?: string;
  latitude?: string;
  longitude?: string;
  enabled?: boolean;
  businessHours?: ShopBusinessHour[];
}

// 上门费用配置
export interface HomeServiceFeeConfig {
  // 距离范围配置（单位：公里）
  distanceRanges: Array<{
    minDistance: number; // 最小距离（包含）
    maxDistance: number; // 最大距离（不包含，-1表示无上限）
    baseFee: number; // 基础费用
  }>;
  // 时间段费用配置
  timeSlotFees: {
    daytime: {
      start: string; // 如 "08:00"
      end: string; // 如 "18:00"
      fee: number; // 额外费用（可为负数表示优惠）
    };
    nighttime: {
      start: string; // 如 "18:00"
      end: string; // 如 "08:00"
      fee: number; // 额外费用
    };
  };
  // 节假日额外费用
  holidayFee: number;
}

// 上门设置
export interface HomeServiceSettings {
  enabled: boolean;
  // 美甲师常用地址（服务起点）
  baseAddress?: {
    name: string;
    phone?: string;
    province?: string;
    city?: string;
    district?: string;
    detailAddress: string;
    doorInfo?: string;
    latitude?: string;
    longitude?: string;
  };
  // 服务范围（公里）
  serviceRadius: number;
  // 费用配置
  feeConfig: HomeServiceFeeConfig;
}

// 社交媒体账号
export interface SocialMediaAccounts {
  weibo?: string;      // 微博
  xiaohongshu?: string; // 小红书
  douyin?: string;     // 抖音
  kuaishou?: string;   // 快手
  wechat?: string;     // 微信
}

export interface TechnicianSubscription {
  status: string;
  startedAt: string;
  expiredAt?: string | null;
  planName: string;
  planCode: string;
}

export interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface ServiceSchedule {
  days: Record<string, DaySchedule>;
}

export interface CustomTag {
  id: string;
  name: string;
  color: string;
}

export interface Technician {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  status: string;
  invitationCode?: string;
  city?: string;
  serviceArea?: string;
  homeService?: boolean;
  shopService?: boolean;
  shopAddresses?: ShopAddress[];
  homeServiceSettings?: HomeServiceSettings;
  socialMedia?: SocialMediaAccounts;
  subscription?: TechnicianSubscription | null;
  serviceSchedule?: ServiceSchedule | null;
  customTags?: CustomTag[];
  serviceItems?: Array<{
    id: string;
    name: string;
    description?: string;
    category: 'basic_care' | 'color_style' | 'extension_reinforcement' | 'removal';
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface ServiceTypeSettings {
  homeService: boolean;
  shopService: boolean;
  shopAddresses?: ShopAddress[];
  homeServiceSettings?: HomeServiceSettings;
}

export interface AuthContextType {
  technician: Technician | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, passwordOrCode: string) => Promise<void>;
  register: (params: { inviteKey: string; name: string; phone: string; password: string }) => Promise<void>;
  updateTechnicianStatus: (status: string) => Promise<void>;
  updateServiceType: (settings: ServiceTypeSettings) => Promise<void>;
  updateTechnicianProfile: (profile: Partial<Technician>) => Promise<void>;
  logout: () => void;
}
