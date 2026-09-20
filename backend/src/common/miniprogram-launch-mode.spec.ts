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

  it('uses multi-tenant behavior by default', () => {
    expect(isMiniProgramLaunchMode()).toBe(false);
    expect(launchTechnicianId()).toBeNull();
    expect(isLaunchTechnician(1)).toBe(true);
  });

  it('allows only the configured launch technician', () => {
    process.env.MINIPROGRAM_LAUNCH_MODE = 'true';
    process.env.MINIPROGRAM_TECHNICIAN_ID = '7';
    expect(isLaunchTechnician(7)).toBe(true);
    expect(isLaunchTechnician(8)).toBe(false);
  });

  it('does not restrict launch mode when no technician is configured', () => {
    process.env.MINIPROGRAM_LAUNCH_MODE = 'true';
    expect(isMiniProgramLaunchMode()).toBe(true);
    expect(isLaunchTechnician(99)).toBe(true);
  });
});
