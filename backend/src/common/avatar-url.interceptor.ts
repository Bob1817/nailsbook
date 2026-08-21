import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** 递归最大深度，超出后直接返回原值，防止深层嵌套对象导致性能问题 */
const MAX_DEPTH = 5;

function normalizeAvatarUrls(value: unknown, origin: string, depth = 0): unknown {
  if (depth > MAX_DEPTH) return value;

  if (Array.isArray(value)) {
    let changed = false;
    const result = value.map((item) => {
      const normalized = normalizeAvatarUrls(item, origin, depth + 1);
      if (normalized !== item) changed = true;
      return normalized;
    });
    return changed ? result : value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  let changed = false;
  const normalized: Record<string, unknown> = {};

  for (const [key, currentValue] of Object.entries(record)) {
    if (
      key === 'avatarUrl' &&
      typeof currentValue === 'string' &&
      currentValue.startsWith('/')
    ) {
      normalized[key] = `${origin}${currentValue}`;
      changed = true;
      continue;
    }

    const child = normalizeAvatarUrls(currentValue, origin, depth + 1);
    if (child !== currentValue) changed = true;
    normalized[key] = child;
  }

  // 无任何 avatarUrl 需转换时返回原对象，避免不必要的深拷贝
  return changed ? normalized : value;
}

@Injectable()
export class AvatarUrlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      protocol: string;
      get(name: string): string | undefined;
    }>();
    const host = request.get('host');
    const origin = host ? `${request.protocol}://${host}` : '';

    return next
      .handle()
      .pipe(map((data) => (origin ? normalizeAvatarUrls(data, origin) : data)));
  }
}
