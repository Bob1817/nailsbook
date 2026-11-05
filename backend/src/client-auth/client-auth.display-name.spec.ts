import { ClientAuthService } from './client-auth.service';

describe('client bound technician display name', () => {
  it.each(['published', 'draft'])('matches public profile naming for %s brand', async status => {
    const technician = { id: 55, name: '账号名称', brandProfile: { brandName: '主页名称', publicationStatus: status } };
    const binding = { techId: 55, status: 'active', isDefault: true, technician };
    const prisma = {
      clientUser: { findUnique: jest.fn().mockResolvedValue({ id: 1, phone: '13800000000', bindings: [binding] }) },
      technician: { findUnique: jest.fn().mockResolvedValue(null) },
      order: { groupBy: jest.fn().mockResolvedValue([]) }
    };
    const service = Object.create(ClientAuthService.prototype);
    service.prisma = prisma;
    const profile = await service.getProfile(1);
    expect(profile.technicians[0].name).toBe(status === 'published' ? '主页名称' : '账号名称');
    expect(profile.technicians[0].accountName).toBe('账号名称');
    expect(prisma.clientUser.findUnique.mock.calls[0][0].include.bindings.include.technician.include.brandProfile).toBe(true);
  });
});
