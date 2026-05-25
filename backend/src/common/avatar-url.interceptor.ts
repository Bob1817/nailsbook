import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function normalizeAvatarUrls(value: unknown, origin: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeAvatarUrls(item, origin));
  }

  if (value instanceof Date) {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  for (const [key, currentValue] of Object.entries(record)) {
    if (
      key === 'avatarUrl' &&
      typeof currentValue === 'string' &&
      currentValue.startsWith('/')
    ) {
      normalized[key] = `${origin}${currentValue}`;
      continue;
    }

    normalized[key] = normalizeAvatarUrls(currentValue, origin);
  }

  return normalized;
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
