import { NotFoundException } from '@nestjs/common';
import { ClientAuthController } from './client-auth.controller';

describe('ClientAuthController invite-code validation response', () => {
  const service = { findTechnicianByInviteCode: jest.fn() };
  const controller = new ClientAuthController(service as never, {} as never);

  beforeEach(() => service.findTechnicianByInviteCode.mockReset());

  it('returns HTTP-success business state for an invalid invite code', async () => {
    service.findTechnicianByInviteCode.mockRejectedValue(new NotFoundException('邀请码无效'));
    await expect(controller.findByInviteCode('22322334')).resolves.toEqual({ valid: false, technician: null });
  });

  it('wraps the matched technician in a valid result', async () => {
    const technician = { id: 3, name: '贝贝', invitationCode: 'ABC12345' };
    service.findTechnicianByInviteCode.mockResolvedValue(technician);
    await expect(controller.findByInviteCode('ABC12345')).resolves.toEqual({ valid: true, technician });
  });
});
