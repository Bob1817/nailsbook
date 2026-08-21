import {
  isLaunchTechnician,
  isMiniProgramLaunchMode,
  launchTechnicianId,
  resetLaunchTechnicianIdConfiguration,
} from './miniprogram-launch-mode';

describe('mini program launch mode', () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original };
    delete process.env.MINIPROGRAM_LAUNCH_MODE;
    delete process.env.MINIPROGRAM_TECHNICIAN_ID;
    resetLaunchTechnicianIdConfiguration();
  });

  afterAll(() => {
    process.env = original;
  });

  it('fails closed by default', () => {
    expect(isMiniProgramLaunchMode()).toBe(true);
    expect(launchTechnicianId()).toBeNull();
    expect(isLaunchTechnician(1)).toBe(false);
  });

  it('allows only the configured launch technician', () => {
    process.env.MINIPROGRAM_TECHNICIAN_ID = '7';
    expect(isLaunchTechnician(7)).toBe(true);
    expect(isLaunchTechnician(8)).toBe(false);
  });

  it('restores multi-tenant behavior only when explicitly disabled', () => {
    process.env.MINIPROGRAM_LAUNCH_MODE = 'false';
    expect(isMiniProgramLaunchMode()).toBe(false);
    expect(isLaunchTechnician(99)).toBe(true);
  });
});
