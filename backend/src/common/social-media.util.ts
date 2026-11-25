import { BadRequestException } from '@nestjs/common';

const PAIRED_PLATFORMS: Record<string, string> = {
  xiaohongshu: '小红书',
  douyin: '抖音',
  weibo: '微博',
};

export interface PairedSocialAccount {
  name: string;
  account: string;
}

/**
 * 规范化自媒体配置：
 * - 小红书/抖音/微博必须「昵称 + 账号」成对填写，或同时留空（不允许仅填一项）；
 * - 兼容历史纯字符串格式与布尔/二维码等附加字段。
 */
export function normalizeSocialMediaUpdate(
  rawInput: Record<string, any> | undefined,
  existing: Record<string, any> = {},
): Record<string, any> {
  const result: Record<string, any> = { ...existing };
  if (!rawInput || typeof rawInput !== 'object') {
    return result;
  }

  for (const [key, value] of Object.entries(rawInput)) {
    if (!key) continue;

    if (PAIRED_PLATFORMS[key]) {
      const label = PAIRED_PLATFORMS[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const name = typeof value.name === 'string' ? value.name.trim() : '';
        const account =
          typeof value.account === 'string' ? value.account.trim() : '';
        if ((name && !account) || (!name && account)) {
          throw new BadRequestException(
            `请完整填写${label}主页昵称和账号，或全部留空`,
          );
        }
        if (name && account) {
          result[key] = { name, account };
        } else {
          delete result[key];
        }
      } else if (typeof value === 'string' && value.trim()) {
        result[key] = value.trim();
      } else {
        delete result[key];
      }
      continue;
    }

    if (typeof value === 'boolean') {
      result[key] = value;
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        result[key] = trimmed;
      } else {
        delete result[key];
      }
    }
  }

  return result;
}
