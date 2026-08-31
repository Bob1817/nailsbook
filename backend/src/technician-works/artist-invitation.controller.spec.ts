import { ArtistInvitationController } from './artist-invitation.controller';

describe('ArtistInvitationController', () => {
  it('uses authenticated artist invite rather than user supplied invite', async () => {
    const prisma = { technician: { findUnique: jest.fn().mockResolvedValue({ status: 'active', invitationCode: 'OWN-CODE' }) } };
    const share = { generateInviteLink: jest.fn().mockResolvedValue({ url: 'https://wxaurl.cn/test' }) };
    const controller = new ArtistInvitationController(prisma as any, share as any);
    await controller.link({ user: { technicianId: 55 } });
    expect(prisma.technician.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 55 } }));
    expect(share.generateInviteLink).toHaveBeenCalledWith('OWN-CODE');
    prisma.technician.findUnique.mockResolvedValue({ status: 'inactive', invitationCode: 'OWN-CODE' });
    await expect(controller.link({ user: { technicianId: 55 } })).rejects.toThrow();
    expect(share.generateInviteLink).toHaveBeenCalledTimes(1);
  });
});
