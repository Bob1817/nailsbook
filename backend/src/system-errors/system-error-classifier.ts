export type ErrorCategory =
  | 'database'
  | 'server'
  | 'backend'
  | 'frontend'
  | 'other';

export type ErrorPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface ErrorClassification {
  category: ErrorCategory;
  categoryLabel: string;
  fixAction: string;
  fixHint: string;
  priority: ErrorPriority;
  priorityLabel: string;
  urgencyNote: string;
}

export interface ErrorLike {
  source?: string | null;
  errorType?: string | null;
  message?: string | null;
  stack?: string | null;
  route?: string | null;
  statusCode?: number | null;
}

const CATEGORY_META: Record<
  ErrorCategory,
  { categoryLabel: string; fixAction: string; fixHint: string }
> = {
  database: {
    categoryLabel: '数据库错误',
    fixAction: '数据库修复',
    fixHint: '检查 Prisma Schema、数据库迁移脚本、字段约束或 SQLite 并发锁',
  },
  server: {
    categoryLabel: '服务器/网关错误',
    fixAction: '服务器重启 / 检查容器与网关',
    fixHint: '登录 ECS 检查 Docker 容器状态、内存占用与 Nginx 上游配置，必要时重启服务',
  },
  backend: {
    categoryLabel: '后台错误',
    fixAction: '后端代码修复',
    fixHint: '排查 backend/ 接口异常与服务日志，修复后重新构建镜像并部署至 ECS',
  },
  frontend: {
    categoryLabel: '前端错误',
    fixAction: '前端代码修复',
    fixHint: '排查 client-wxapp/ 或 admin-frontend/ 异常堆栈，修复后重新上传发布',
  },
  other: {
    categoryLabel: '系统环境提示',
    fixAction: '兼容排查 / 观察忽略',
    fixHint: '多为旧版路由兜底或微信基础库受限环境提示，确认无阻断后可标记完成',
  },
};

const PRIORITY_META: Record<
  ErrorPriority,
  { priorityLabel: string; urgencyNote: string }
> = {
  P0: {
    priorityLabel: 'P0 · 必须马上修复',
    urgencyNote: '直接阻断核心业务或导致服务不可用，必须立即处理',
  },
  P1: {
    priorityLabel: 'P1 · 紧急修复',
    urgencyNote: '影响核心功能或接口稳定性，需在当班/当日内优先修复',
  },
  P2: {
    priorityLabel: 'P2 · 排期修复',
    urgencyNote: '局部非阻断异常或偶发失败，可纳入近期迭代修复',
  },
  P3: {
    priorityLabel: 'P3 · 低优先级观察',
    urgencyNote: '历史链接兜底或环境兼容提示，暂不影响项目核心使用',
  },
};

export function classifySystemError(
  error: ErrorLike,
  occurrenceCount = 1,
): ErrorClassification {
  const source = String(error.source || '').toLowerCase();
  const errorType = String(error.errorType || '').toLowerCase();
  const message = String(error.message || '');
  const stack = String(error.stack || '');
  const route = String(error.route || '');
  const statusCode = Number(error.statusCode || 0);
  const haystack = `${message}\n${stack}\n${route}`.toLowerCase();

  let category: ErrorCategory = 'frontend';

  if (
    /prisma|sqlite|sql\b|p20\d{2}|unique constraint|foreign key|database|deadlock|readonly database/.test(
      haystack,
    )
  ) {
    category = 'database';
  } else if (
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    /http 50[234]|bad gateway|gateway timeout|econnrefused|etimedout|enotfound|socket hang up|out of memory|\boom\b/.test(
      haystack,
    )
  ) {
    category = 'server';
  } else if (
    source === 'backend' ||
    statusCode >= 500 ||
    errorType === 'api_500' ||
    /http 5\d\d|internal server error|nestjs|typeerror.*service\.ts/.test(
      haystack,
    )
  ) {
    category = 'backend';
  } else if (
    /wx:\/\/not-found|not-found/.test(haystack) &&
    errorType === 'js_error'
  ) {
    category = 'other';
  } else {
    category = 'frontend';
  }

  const isCoreFlow =
    /\/orders|\/payments|\/auth|\/wechat-auth|\/client-auth|\/technician-auth|\/bookings|\/subscriptions|pages\/login|pages\/register|pages\/client\/create-order|pages\/client\/quote-confirm|pages\/technician\/create-order|pages\/technician\/subscription/.test(
      haystack,
    );

  let priority: ErrorPriority = 'P2';
  if (category === 'other') {
    priority = 'P3';
  } else if (
    category === 'database' ||
    category === 'server' ||
    isCoreFlow ||
    occurrenceCount >= 5
  ) {
    priority = 'P0';
  } else if (
    category === 'backend' ||
    statusCode >= 500 ||
    /onlaunch|appservice\.app\.js|getupdatemanager/.test(haystack) ||
    occurrenceCount >= 3
  ) {
    priority = 'P1';
  } else if (errorType === 'unhandled_rejection' || errorType === 'api_network_error') {
    priority = 'P2';
  }

  return {
    category,
    ...CATEGORY_META[category],
    priority,
    ...PRIORITY_META[priority],
  };
}

export function buildErrorFingerprint(error: ErrorLike): string {
  const { category } = classifySystemError(error, 1);
  const source = String(error.source || 'unknown').toLowerCase();
  const errorType = String(error.errorType || 'unknown').toLowerCase();
  const rawRoute = String(error.route || '').split('?')[0].trim();
  const normalizedRoute = rawRoute.replace(/\/\d+(?=\/|$)/g, '/:id');
  const rawMsg = String(error.message || '')
    .replace(/\s+/g, ' ')
    .replace(/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\s]*/g, '<ts>')
    .replace(/#\d+/g, '#:id')
    .trim()
    .slice(0, 120);

  return `${category}|${source}|${errorType}|${normalizedRoute}|${rawMsg}`;
}
