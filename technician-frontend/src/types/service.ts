export interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  category: ServiceCategory;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type ServiceCategory =
  | 'basic_care'
  | 'color_style'
  | 'extension_reinforcement'
  | 'removal';

export interface CreateServiceDto {
  name: string;
  description?: string;
  category: ServiceCategory;
}

export interface UpdateServiceDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export const SERVICE_CATEGORIES: Record<ServiceCategory, { label: string; description: string }> = {
  basic_care: {
    label: '基础护理与修形',
    description: '指甲修剪、修形、基础护理等服务',
  },
  color_style: {
    label: '色彩与款式制作',
    description: '纯色美甲、款式设计、彩绘等服务',
  },
  extension_reinforcement: {
    label: '指甲延长与加固',
    description: '甲片延长、光疗延长、指甲加固等服务',
  },
  removal: {
    label: '卸甲服务',
    description: '卸除甲油胶、卸甲片等服务',
  },
};

// 系统初始化的默认服务内容
export const DEFAULT_SERVICES: Omit<ServiceItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '基础修甲',
    description: '指甲修剪、修形、去死皮等基础护理',
    category: 'basic_care',
    isActive: true,
    sortOrder: 1,
  },
  {
    name: '纯色美甲',
    description: '单色甲油胶涂抹',
    category: 'color_style',
    isActive: true,
    sortOrder: 2,
  },
  {
    name: '款式美甲',
    description: '包含彩绘、贴纸、渐变等款式设计',
    category: 'color_style',
    isActive: true,
    sortOrder: 3,
  },
  {
    name: '甲片延长',
    description: '使用甲片进行指甲延长',
    category: 'extension_reinforcement',
    isActive: true,
    sortOrder: 4,
  },
  {
    name: '光疗延长',
    description: '使用光疗胶进行指甲延长和加固',
    category: 'extension_reinforcement',
    isActive: true,
    sortOrder: 5,
  },
  {
    name: '卸甲服务',
    description: '卸除甲油胶或甲片',
    category: 'removal',
    isActive: true,
    sortOrder: 6,
  },
];
