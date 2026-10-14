import { BadRequestException } from '@nestjs/common';
import { ClientAuthService } from './client-auth.service';
import { ROLE_SWITCH_DISABLED } from '../common/account-role-policy';

describe('single-role account policy', () => {
  const service = Object.create(ClientAuthService.prototype) as ClientAuthService;

  it.each([
    ['selectRole', () => service.selectRole(91, { role: 'technician' })],
    ['activateTechnician', () => service.activateTechnician(91, 'KEY')],
    ['loginAsClientForTechnician', () => service.loginAsClientForTechnician(55)],
  ])('rejects the legacy %s role-switch path', async (_name, action) => {
    await expect(action()).rejects.toEqual(
      new BadRequestException(ROLE_SWITCH_DISABLED),
    );
  });
});
