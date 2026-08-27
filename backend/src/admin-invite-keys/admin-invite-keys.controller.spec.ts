import 'reflect-metadata';
import { AdminInviteKeysController } from './admin-invite-keys.controller';

describe('AdminInviteKeysController permissions', () => {
  it.each([
    ['list', 'technician:create'],
    ['create', 'technician:create'],
    ['remove', 'technician:delete'],
  ] as const)('%s requires %s', (method, permission) => {
    expect(
      Reflect.getMetadata(
        'permissions',
        AdminInviteKeysController.prototype[method],
      ),
    ).toEqual([permission]);
  });
});
