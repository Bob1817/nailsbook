import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import request from 'supertest';
import { VerificationCodeService } from '../../src/common/verification-code/verification-code.service';
import {
  ContractTestApp,
  createContractTestApp,
  prepareContractSqliteDatabase,
} from './test-app';

describe('Client auth HTTP contract', () => {
  let testApp: ContractTestApp;
  let verificationCodeService: VerificationCodeService;
  let tempDir: string;
  let databaseUrl: string;
  let uploadsPath: string;
  let restoreGenerateSpy: (() => void) | undefined;
  let capturedVerificationCodes = new Map<string, string>();
  let ownedClientPhones: string[] = [];
  let ownedTechnicianPhones: string[] = [];
  let ownedInviteCodes: string[] = [];

  beforeAll(async () => {
    tempDir = mkdtempSync(resolve(tmpdir(), 'nailbook-client-auth-contract-'));
    databaseUrl = `file:${resolve(tempDir, 'client-auth-contract.db')}`;
    uploadsPath = resolve(tempDir, 'uploads');

    prepareContractSqliteDatabase(databaseUrl);
    testApp = await createContractTestApp({ databaseUrl, uploadsPath });
    verificationCodeService = testApp.app.get(VerificationCodeService);

    const generateCode = verificationCodeService.generate.bind(
      verificationCodeService,
    );
    const generateSpy = jest
      .spyOn(verificationCodeService, 'generate')
      .mockImplementation((phone: string) => {
        const code = generateCode(phone);
        capturedVerificationCodes.set(phone, code);
        return code;
      });
    restoreGenerateSpy = () => generateSpy.mockRestore();
  });

  beforeEach(() => {
    capturedVerificationCodes = new Map<string, string>();
    ownedClientPhones = [];
    ownedTechnicianPhones = [];
    ownedInviteCodes = [];
  });

  afterEach(async () => {
    await cleanupOwnedRecords();
  });

  afterAll(async () => {
    restoreGenerateSpy?.();
    await testApp?.cleanup();
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('looks up invite codes with the technician identity Flutter needs before registration', async () => {
    const technician = await createTechnician('lookup', {
      city: 'Shanghai',
      serviceArea: 'Pudong',
      status: 'active',
    });

    const response = await request(testApp.app.getHttpServer())
      .get('/api/client/auth/find-by-invite-code')
      .query({ code: technician.inviteCode })
      .expect(200);

    expect(response.body).toEqual({
      id: technician.id,
      name: technician.name,
      phone: technician.phone,
      avatarUrl: null,
      city: 'Shanghai',
      serviceArea: 'Pudong',
      status: 'active',
      homeService: true,
      shopService: true,
      shopAddresses: [
        {
          name: 'Contract Studio',
          city: 'Shanghai',
          detailAddress: '88 Test Road',
          enabled: true,
        },
      ],
      serviceItems: [
        {
          id: 'contract-basic',
          name: 'Basic Care',
          category: 'basic_care',
          isActive: true,
          sortOrder: 1,
        },
      ],
    });
  });

  it('registers by invite with token, client profile, and default technician identity', async () => {
    const phone = uniquePhone();
    ownedClientPhones.push(phone);
    const technician = await createTechnician('register');

    await request(testApp.app.getHttpServer())
      .post('/api/client/auth/request-register-code')
      .send({ phone, inviteCode: technician.inviteCode })
      .expect(201);

    const response = await request(testApp.app.getHttpServer())
      .post('/api/client/auth/register-by-invite')
      .send({
        phone,
        code: getVerificationCode(phone),
        techId: technician.id,
        inviteCode: technician.inviteCode,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      client: {
        id: expect.any(Number),
        nickname: null,
        phone,
        status: 'active',
      },
      technician: {
        id: technician.id,
        name: technician.name,
        phone: technician.phone,
      },
    });
    // register-by-invite currently returns only the newly bound/default technician.
    // login and /auth/me below document the full technician list contract for Flutter.
    expect(response.body.technicians).toBeUndefined();

    const binding = await testApp.prisma.clientTechBinding.findFirstOrThrow({
      where: {
        clientId: response.body.client.id,
        techId: technician.id,
        status: 'active',
      },
    });
    expect(binding.isDefault).toBe(true);
  });

  it('logs in with the register-compatible auth shape and the bound technician list', async () => {
    const { client, defaultTechnician, secondaryTechnician } =
      await createClientWithTwoBindings('login');

    await request(testApp.app.getHttpServer())
      .post('/api/client/auth/request-login-code')
      .send({ phone: client.phone })
      .expect(201);

    const response = await request(testApp.app.getHttpServer())
      .post('/api/client/auth/login')
      .send({
        phone: client.phone,
        code: getVerificationCode(client.phone),
      })
      .expect(201);

    expect(response.body).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      client: {
        id: client.id,
        nickname: client.nickname,
        phone: client.phone,
        avatarUrl: null,
        status: 'active',
      },
      technician: {
        id: defaultTechnician.id,
        name: defaultTechnician.name,
        phone: defaultTechnician.phone,
        status: 'active',
        homeService: true,
        shopService: true,
        shopAddresses: [
          expect.objectContaining({
            name: 'Contract Studio',
            city: 'Shanghai',
          }),
        ],
        serviceItems: [
          expect.objectContaining({
            id: 'contract-basic',
            isActive: true,
          }),
        ],
      },
    });
    expect(response.body.technicians).toEqual([
      expect.objectContaining({
        id: defaultTechnician.id,
        isDefault: true,
        bindSource: 'invite',
        status: 'active',
      }),
      expect.objectContaining({
        id: secondaryTechnician.id,
        isDefault: false,
        bindSource: 'invite',
        status: 'active',
      }),
    ]);
  });

  it('returns the client profile, bound technicians, and default binding from /auth/me', async () => {
    const { accessToken, client, defaultTechnician, secondaryTechnician } =
      await registerAndBindSecondTechnician('me');

    const response = await request(testApp.app.getHttpServer())
      .get('/api/client/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: client.id,
      nickname: null,
      phone: client.phone,
      avatarUrl: null,
      status: 'active',
      binding: {
        techId: defaultTechnician.id,
        inviteCode: defaultTechnician.inviteCode,
        bindSource: 'invite',
        technician: {
          id: defaultTechnician.id,
          name: defaultTechnician.name,
          phone: defaultTechnician.phone,
          status: 'active',
          homeService: true,
          shopService: true,
        },
      },
    });
    expect(response.body.technicians).toEqual([
      expect.objectContaining({
        id: defaultTechnician.id,
        isDefault: true,
        bindSource: 'invite',
        bindId: expect.any(Number),
        status: 'active',
      }),
      expect.objectContaining({
        id: secondaryTechnician.id,
        isDefault: false,
        bindSource: 'manual',
        bindId: expect.any(Number),
        status: 'active',
      }),
    ]);
  });

  async function registerAndBindSecondTechnician(label: string) {
    const phone = uniquePhone();
    ownedClientPhones.push(phone);
    const defaultTechnician = await createTechnician(`${label}-default`);
    const secondaryTechnician = await createTechnician(`${label}-secondary`);

    await request(testApp.app.getHttpServer())
      .post('/api/client/auth/request-register-code')
      .send({ phone, inviteCode: defaultTechnician.inviteCode })
      .expect(201);

    const registerResponse = await request(testApp.app.getHttpServer())
      .post('/api/client/auth/register-by-invite')
      .send({
        phone,
        code: getVerificationCode(phone),
        techId: defaultTechnician.id,
        inviteCode: defaultTechnician.inviteCode,
      })
      .expect(201);

    await request(testApp.app.getHttpServer())
      .post('/api/client/auth/bind-technician')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .send({
        techId: secondaryTechnician.id,
        inviteCode: secondaryTechnician.inviteCode,
        isDefault: false,
      })
      .expect(201);

    return {
      accessToken: registerResponse.body.accessToken as string,
      client: registerResponse.body.client as { id: number; phone: string },
      defaultTechnician,
      secondaryTechnician,
    };
  }

  async function createClientWithTwoBindings(label: string) {
    const clientPhone = uniquePhone();
    ownedClientPhones.push(clientPhone);
    const client = await testApp.prisma.clientUser.create({
      data: {
        phone: clientPhone,
        nickname: `Contract Client ${label}`,
        status: 'active',
      },
    });
    const defaultTechnician = await createTechnician(`${label}-default`);
    const secondaryTechnician = await createTechnician(`${label}-secondary`);

    await testApp.prisma.clientTechBinding.create({
      data: {
        clientId: client.id,
        techId: defaultTechnician.id,
        inviteCode: defaultTechnician.inviteCode,
        bindSource: 'invite',
        isDefault: true,
        status: 'active',
      },
    });
    await testApp.prisma.clientTechBinding.create({
      data: {
        clientId: client.id,
        techId: secondaryTechnician.id,
        inviteCode: secondaryTechnician.inviteCode,
        bindSource: 'invite',
        isDefault: false,
        status: 'active',
      },
    });

    return { client, defaultTechnician, secondaryTechnician };
  }

  async function createTechnician(
    label: string,
    overrides: {
      city?: string;
      serviceArea?: string;
      status?: string;
    } = {},
  ) {
    const phone = uniquePhone();
    const inviteCode = uniqueInviteCode(label);
    ownedTechnicianPhones.push(phone);
    ownedInviteCodes.push(inviteCode);

    const technician = await testApp.prisma.technician.create({
      data: {
        name: `Contract Tech ${label}`,
        phone,
        avatarUrl: null,
        city: overrides.city ?? 'Shanghai',
        serviceArea: overrides.serviceArea ?? 'Downtown',
        status: overrides.status ?? 'active',
        invitationCode: inviteCode,
        homeService: true,
        shopService: true,
        shopAddresses: JSON.stringify([
          {
            name: 'Contract Studio',
            city: 'Shanghai',
            detailAddress: '88 Test Road',
            enabled: true,
          },
        ]),
        serviceItems: JSON.stringify([
          {
            id: 'contract-basic',
            name: 'Basic Care',
            category: 'basic_care',
            isActive: true,
            sortOrder: 1,
          },
        ]),
      },
    });

    return {
      id: technician.id,
      name: technician.name,
      phone: technician.phone,
      inviteCode,
    };
  }

  function getVerificationCode(phone: string) {
    const code = capturedVerificationCodes.get(phone);
    if (!code) {
      throw new Error(`No verification code generated for ${phone}`);
    }
    return code;
  }

  async function cleanupOwnedRecords() {
    if (!testApp) {
      return;
    }

    const clients = ownedClientPhones.length
      ? await testApp.prisma.clientUser.findMany({
          where: { phone: { in: ownedClientPhones } },
          select: { id: true },
        })
      : [];
    const technicians =
      ownedTechnicianPhones.length || ownedInviteCodes.length
        ? await testApp.prisma.technician.findMany({
            where: {
              OR: [
                { phone: { in: ownedTechnicianPhones } },
                { invitationCode: { in: ownedInviteCodes } },
              ],
            },
            select: { id: true },
          })
        : [];
    const clientIds = clients.map((client) => client.id);
    const technicianIds = technicians.map((technician) => technician.id);

    await testApp.prisma.clientTechBinding.deleteMany({
      where: {
        OR: [
          { clientId: { in: clientIds } },
          { techId: { in: technicianIds } },
          { inviteCode: { in: ownedInviteCodes } },
        ],
      },
    });
    await testApp.prisma.clientUser.deleteMany({
      where: { phone: { in: ownedClientPhones } },
    });
    await testApp.prisma.technician.deleteMany({
      where: {
        OR: [
          { phone: { in: ownedTechnicianPhones } },
          { invitationCode: { in: ownedInviteCodes } },
        ],
      },
    });
  }

  function uniquePhone() {
    const digits = `${Date.now()}${Math.floor(Math.random() * 100000)}`
      .slice(-9)
      .padStart(9, '0');
    return `17${digits}`;
  }

  function uniqueInviteCode(label: string) {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 100000)}`
      .slice(-8)
      .toUpperCase();
    return `${label.replace(/[^a-z0-9]/gi, '').slice(0, 8)}${suffix}`.toUpperCase();
  }
});
