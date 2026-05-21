import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AvatarUrlInterceptor } from '../../src/common/avatar-url.interceptor';
import { PrismaService } from '../../src/common/prisma/prisma.service';

export interface ContractTestApp {
  app: INestApplication;
  prisma: PrismaService;
  databaseUrl: string;
  cleanup: () => Promise<void>;
}

export interface ContractTestAppOptions {
  databaseUrl?: string;
  uploadsPath?: string;
  applyHttpConfig?: boolean;
}

const contractsDir = __dirname;

export function getDefaultContractDatabaseUrl() {
  return `file:${resolve(contractsDir, 'contract-test.db')}`;
}

export function prepareContractSqliteDatabase(databaseUrl?: string) {
  const resolvedDatabaseUrl = resolveContractDatabaseUrl(databaseUrl);

  if (!resolvedDatabaseUrl.startsWith('file:')) {
    return;
  }

  const databasePath = resolveSqliteFilePath(resolvedDatabaseUrl);
  mkdirSync(dirname(databasePath), { recursive: true });

  for (const filePath of [
    databasePath,
    `${databasePath}-shm`,
    `${databasePath}-wal`,
    `${databasePath}-journal`,
  ]) {
    if (existsSync(filePath)) {
      rmSync(filePath);
    }
  }

  const schemaSql = execFileSync(
    'npx',
    [
      'prisma',
      'migrate',
      'diff',
      '--from-empty',
      '--to-schema-datamodel',
      'prisma/schema.prisma',
      '--script',
    ],
    { cwd: resolve(contractsDir, '../..') },
  );

  execFileSync('sqlite3', [databasePath], {
    input: schemaSql,
  });
}

export async function createContractTestApp(
  options: ContractTestAppOptions = {},
): Promise<ContractTestApp> {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAutoSeedDemoData = process.env.AUTO_SEED_DEMO_DATA;
  const databaseUrl = resolveContractDatabaseUrl(options.databaseUrl);
  let app: NestExpressApplication | undefined;

  process.env.DATABASE_URL = databaseUrl;
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
  process.env.AUTO_SEED_DEMO_DATA = process.env.AUTO_SEED_DEMO_DATA ?? 'false';

  try {
    const appModulePath = '../../src/app.module';
    const { AppModule } = require(appModulePath);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    const uploadsPath = options.uploadsPath ?? resolve(contractsDir, 'uploads');

    if (options.applyHttpConfig ?? true) {
      mkdirSync(uploadsPath, { recursive: true });

      app.enableCors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      });
      app.useStaticAssets(uploadsPath, {
        prefix: '/uploads/',
      });
      app.setGlobalPrefix('api');
      app.useGlobalPipes(
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: false,
        }),
      );
      app.useGlobalInterceptors(new AvatarUrlInterceptor());
    }

    await app.init();
    const initializedApp = app;

    return {
      app: initializedApp,
      prisma: initializedApp.get(PrismaService),
      databaseUrl,
      cleanup: async () => {
        try {
          await initializedApp.close();
        } finally {
          restoreEnv('DATABASE_URL', previousDatabaseUrl);
          restoreEnv('NODE_ENV', previousNodeEnv);
          restoreEnv('AUTO_SEED_DEMO_DATA', previousAutoSeedDemoData);
        }
      },
    };
  } catch (error) {
    try {
      if (app) {
        try {
          await app.close();
        } catch {
          // Preserve the compile/init failure while still restoring env below.
        }
      }
    } finally {
      restoreEnv('DATABASE_URL', previousDatabaseUrl);
      restoreEnv('NODE_ENV', previousNodeEnv);
      restoreEnv('AUTO_SEED_DEMO_DATA', previousAutoSeedDemoData);
    }

    throw error;
  }
}

function resolveContractDatabaseUrl(explicitDatabaseUrl?: string) {
  if (explicitDatabaseUrl) {
    return explicitDatabaseUrl;
  }

  if (!process.env.DATABASE_URL || isObviousDevDatabaseUrl(process.env.DATABASE_URL)) {
    return getDefaultContractDatabaseUrl();
  }

  return process.env.DATABASE_URL;
}

function resolveSqliteFilePath(databaseUrl: string) {
  const filePath = databaseUrl.slice('file:'.length).split('?')[0];
  return isAbsolute(filePath) ? filePath : resolve(process.cwd(), filePath);
}

function isObviousDevDatabaseUrl(databaseUrl: string) {
  const normalizedUrl = databaseUrl.trim().replace(/\\/g, '/');

  return (
    normalizedUrl === 'file:./dev.db' ||
    normalizedUrl === 'file:dev.db' ||
    normalizedUrl === 'file:../dev.db' ||
    normalizedUrl.includes('prisma/dev.db')
  );
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
