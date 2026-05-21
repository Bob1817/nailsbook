import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import request from 'supertest';
import {
  ContractTestApp,
  createContractTestApp,
  prepareContractSqliteDatabase,
} from './test-app';

describe('Chat and upload HTTP contract', () => {
  let testApp: ContractTestApp;
  let tempDir: string;
  let databaseUrl: string;
  let uploadsPath: string;
  let ownedTechnicianIds: number[] = [];
  let ownedClientIds: number[] = [];
  let ownedInviteCodes: string[] = [];
  let ownedConversationIds: number[] = [];

  beforeAll(async () => {
    tempDir = mkdtempSync(resolve(tmpdir(), 'nailbook-chat-upload-contract-'));
    databaseUrl = `file:${resolve(tempDir, 'chat-upload-contract.db')}`;
    uploadsPath = resolve(tempDir, 'uploads');

    prepareContractSqliteDatabase(databaseUrl);
    testApp = await createContractTestApp({ databaseUrl, uploadsPath });
  });

  beforeEach(() => {
    ownedTechnicianIds = [];
    ownedClientIds = [];
    ownedInviteCodes = [];
    ownedConversationIds = [];
  });

  afterEach(async () => {
    await cleanupOwnedRecords();
  });

  afterAll(async () => {
    await testApp?.cleanup();
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Client Conversations and Messages', () => {
    it('lists conversations and sends a message to create a new conversation', async () => {
      const { accessToken, client, technician } = await setupClientWithBinding('chat-client');

      const convListRes = await request(testApp.app.getHttpServer())
        .get('/api/client/messages/conversations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(Array.isArray(convListRes.body)).toBe(true);

      const sendRes = await request(testApp.app.getHttpServer())
        .post('/api/client/messages')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          techId: technician.id,
          messageType: 'text',
          content: 'Hello from contract test',
        })
        .expect(201);

      expect(sendRes.body).toMatchObject({
        message: expect.objectContaining({
          messageType: 'text',
          content: 'Hello from contract test',
          senderType: 'client',
        }),
      });

      const conversationId = sendRes.body.message?.conversationId ?? sendRes.body.conversationId ?? sendRes.body.conversation?.id;
      if (conversationId) {
        ownedConversationIds.push(conversationId);
      }

      const msgListRes = await request(testApp.app.getHttpServer())
        .get('/api/client/messages')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ conversation_id: conversationId })
        .expect(200);
      const msgList = msgListRes.body.messages ?? (Array.isArray(msgListRes.body) ? msgListRes.body : msgListRes.body.data);
      expect(Array.isArray(msgList)).toBe(true);
    });

    it('marks messages as read', async () => {
      const { accessToken, client, technician } = await setupClientWithBinding('chat-read');

      const conversation = await testApp.prisma.conversation.create({
        data: {
          clientId: client.id,
          techId: technician.id,
          lastMessage: 'Test message',
          lastMessageAt: new Date(),
        },
      });
      ownedConversationIds.push(conversation.id);

      await testApp.prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: 'technician',
          senderId: technician.id,
          receiverType: 'client',
          receiverId: client.id,
          messageType: 'text',
          content: 'Unread message',
          isRead: false,
        },
      });

      const readRes = await request(testApp.app.getHttpServer())
        .patch('/api/client/messages/read')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ conversation_id: conversation.id })
        .expect(200);
      expect(readRes.body).toBeDefined();
    });
  });

  describe('Technician Conversations and Messages', () => {
    it('lists conversations and sends a message to a client', async () => {
      const { accessToken, technician, client } = await setupTechnicianWithClient('chat-tech');

      const convListRes = await request(testApp.app.getHttpServer())
        .get('/api/technician/messages/conversations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const convList = Array.isArray(convListRes.body) ? convListRes.body : convListRes.body.data;
      expect(Array.isArray(convList)).toBe(true);

      const sendRes = await request(testApp.app.getHttpServer())
        .post('/api/technician/messages')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          clientId: client.id,
          messageType: 'text',
          content: 'Reply from technician',
        })
        .expect(201);

      expect(sendRes.body).toMatchObject({
        message: expect.objectContaining({
          messageType: 'text',
          content: 'Reply from technician',
          senderType: 'technician',
        }),
      });

      const conversationId = sendRes.body.message?.conversationId ?? sendRes.body.conversationId ?? sendRes.body.conversation?.id;
      if (conversationId) {
        ownedConversationIds.push(conversationId);
      }
    });
  });

  describe('Upload', () => {
    it('client uploads an image and receives a URL', async () => {
      const { accessToken } = await setupClientWithBinding('upload-client');

      const testImagePath = resolve(tempDir, 'test-upload.jpg');
      writeFileSync(testImagePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]));

      const uploadRes = await request(testApp.app.getHttpServer())
        .post('/api/client/uploads/image')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testImagePath)
        .expect(201);

      expect(uploadRes.body).toMatchObject({
        url: expect.stringContaining('/uploads/'),
      });
    });

    it('technician uploads an image and receives a URL', async () => {
      const { accessToken } = await setupTechnician('upload-tech');

      const testImagePath = resolve(tempDir, 'test-tech-upload.jpg');
      writeFileSync(testImagePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]));

      const uploadRes = await request(testApp.app.getHttpServer())
        .post('/api/technician/uploads/image')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testImagePath)
        .expect(201);

      expect(uploadRes.body).toMatchObject({
        url: expect.stringContaining('/uploads/'),
      });
    });
  });

  async function setupClientWithBinding(label: string) {
    const phone = uniquePhone();
    const inviteCode = uniqueInviteCode(label);
    ownedInviteCodes.push(inviteCode);

    const technician = await testApp.prisma.technician.create({
      data: {
        name: `Contract Tech ${label}`,
        phone: uniquePhone(),
        avatarUrl: null,
        city: 'Shanghai',
        serviceArea: 'Downtown',
        status: 'active',
        invitationCode: inviteCode,
        homeService: true,
        shopService: true,
        shopAddresses: JSON.stringify([{ name: 'Contract Studio', city: 'Shanghai', detailAddress: '88 Test Road', enabled: true }]),
        serviceItems: JSON.stringify([{ id: 'contract-basic', name: 'Basic Care', category: 'basic_care', isActive: true, sortOrder: 1 }]),
      },
    });
    ownedTechnicianIds.push(technician.id);

    const client = await testApp.prisma.clientUser.create({
      data: { phone, nickname: `Contract Client ${label}`, status: 'active' },
    });
    ownedClientIds.push(client.id);

    await testApp.prisma.clientTechBinding.create({
      data: { clientId: client.id, techId: technician.id, inviteCode, bindSource: 'invite', isDefault: true, status: 'active' },
    });

    const accessToken = testApp.signClientToken(client.id, client.phone);
    return { accessToken, client: { id: client.id, phone: client.phone }, technician: { id: technician.id, name: technician.name } };
  }

  async function setupTechnicianWithClient(label: string) {
    const phone = uniquePhone();
    const inviteCode = uniqueInviteCode(label);
    ownedInviteCodes.push(inviteCode);

    const technician = await testApp.prisma.technician.create({
      data: {
        name: `Contract Tech ${label}`,
        phone: uniquePhone(),
        avatarUrl: null,
        city: 'Shanghai',
        serviceArea: 'Downtown',
        status: 'active',
        invitationCode: inviteCode,
        homeService: true,
        shopService: true,
        shopAddresses: JSON.stringify([{ name: 'Contract Studio', city: 'Shanghai', detailAddress: '88 Test Road', enabled: true }]),
        serviceItems: JSON.stringify([{ id: 'contract-basic', name: 'Basic Care', category: 'basic_care', isActive: true, sortOrder: 1 }]),
      },
    });
    ownedTechnicianIds.push(technician.id);

    const client = await testApp.prisma.clientUser.create({
      data: { phone, nickname: `Contract Client ${label}`, status: 'active' },
    });
    ownedClientIds.push(client.id);

    await testApp.prisma.clientTechBinding.create({
      data: { clientId: client.id, techId: technician.id, inviteCode, bindSource: 'invite', isDefault: true, status: 'active' },
    });

    const accessToken = testApp.signTechnicianToken(technician.id, technician.phone);
    return { accessToken, technician: { id: technician.id, name: technician.name }, client: { id: client.id, phone: client.phone } };
  }

  async function setupTechnician(label: string) {
    const phone = uniquePhone();
    const inviteCode = uniqueInviteCode(label);
    ownedInviteCodes.push(inviteCode);

    const technician = await testApp.prisma.technician.create({
      data: {
        name: `Contract Tech ${label}`,
        phone,
        avatarUrl: null,
        city: 'Shanghai',
        serviceArea: 'Downtown',
        status: 'active',
        invitationCode: inviteCode,
        homeService: true,
        shopService: true,
        shopAddresses: JSON.stringify([{ name: 'Contract Studio', city: 'Shanghai', detailAddress: '88 Test Road', enabled: true }]),
        serviceItems: JSON.stringify([{ id: 'contract-basic', name: 'Basic Care', category: 'basic_care', isActive: true, sortOrder: 1 }]),
      },
    });
    ownedTechnicianIds.push(technician.id);

    const accessToken = testApp.signTechnicianToken(technician.id, technician.phone);
    return { accessToken, technician: { id: technician.id, name: technician.name } };
  }

  async function cleanupOwnedRecords() {
    if (!testApp) return;

    await testApp.prisma.message.deleteMany({
      where: { conversationId: { in: ownedConversationIds } },
    }).catch(() => {});
    await testApp.prisma.conversation.deleteMany({
      where: { id: { in: ownedConversationIds } },
    }).catch(() => {});
    await testApp.prisma.clientTechBinding.deleteMany({
      where: {
        OR: [
          { clientId: { in: ownedClientIds } },
          { techId: { in: ownedTechnicianIds } },
          { inviteCode: { in: ownedInviteCodes } },
        ],
      },
    }).catch(() => {});
    await testApp.prisma.clientUser.deleteMany({
      where: { id: { in: ownedClientIds } },
    }).catch(() => {});
    await testApp.prisma.technician.deleteMany({
      where: { id: { in: ownedTechnicianIds } },
    }).catch(() => {});
  }

  function uniquePhone() {
    const digits = `${Date.now()}${Math.floor(Math.random() * 100000)}`.slice(-9).padStart(9, '0');
    return `19${digits}`;
  }

  function uniqueInviteCode(label: string) {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 100000)}`.slice(-8).toUpperCase();
    return `${label.replace(/[^a-z0-9]/gi, '').slice(0, 8)}${suffix}`.toUpperCase();
  }
});