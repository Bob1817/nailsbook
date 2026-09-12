export type ServiceCategory =
  | 'basic_care'
  | 'color_style'
  | 'extension_reinforcement'
  | 'removal'
  | 'surcharge_home'
  | 'surcharge_night'
  | 'surcharge_holiday';

export type DefaultServiceItem = {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export const DEFAULT_SERVICE_ITEMS: DefaultServiceItem[] = [
  {
    id: 'svc_basic_care_1',
    name: '基础护理与修形',
    description: '指甲修剪、修形、去死皮、护理等基础服务',
    category: 'basic_care',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'svc_color_style_1',
    name: '色彩与款式制作',
    description: '纯色美甲、彩绘、渐变、贴纸等款式设计服务',
    category: 'color_style',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'svc_extension_1',
    name: '指甲延长与加固',
    description: '甲片延长、光疗延长、指甲加固等服务',
    category: 'extension_reinforcement',
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'svc_removal_1',
    name: '卸甲服务',
    description: '卸除甲油胶、卸甲片等服务',
    category: 'removal',
    isActive: true,
    sortOrder: 4,
  },
];

export function buildDefaultServiceItems(): DefaultServiceItem[] {
  const now = new Date().toISOString();
  return DEFAULT_SERVICE_ITEMS.map((item) => ({
    ...item,
    createdAt: now,
    updatedAt: now,
  }));
}
