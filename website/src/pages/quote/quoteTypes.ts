export type ServiceCategory = 'base' | 'style' | 'accessory' | 'addon';

export interface QuoteServiceItem {
  id: string;
  category: ServiceCategory;
  name: string;
  artBadge?: string; // 艺术风格标签（如：通透果冻感、磁吸微光、法式优雅）
  description?: string;
  price: number; // 默认单价
  unit: '整手' | '指' | '颗';
  count: number; // 当前选中的数量
  durationMinutes: number; // 单项耗时（分钟）
  editablePrice?: boolean; // 美甲师是否可自定义单价
}

export interface TechnicianProfile {
  name: string;
  title: string;
  avatarUrl?: string;
  shopName: string;
  address?: string;
  phone?: string;
  wechat?: string;
  tags: string[];
  isRegistered: boolean;
}

export interface QuoteDraft {
  id: string;
  technician: TechnicianProfile;
  items: QuoteServiceItem[];
  customNote?: string;
  themeCode?: string;
  createdAt: number;
}
