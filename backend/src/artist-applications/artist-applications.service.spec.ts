import { ArtistApplicationsService } from './artist-applications.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateArtistApplicationDto } from './dto/create-artist-application.dto';

const input = { name: '测试', phone: '13800138000', city: '杭州', wechat: 'test', serviceMode: 'shop' };
function setup() {
  const tx = {
    artistApplication: {
      update: jest.fn().mockResolvedValue({ id: 1, status: 'approved' }),
    },
    technician: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 2 }) },
  };
  const prisma = {
    artistApplication: { findUnique: jest.fn().mockResolvedValue({ id: 1, ...input }) },
    $transaction: jest.fn().mockImplementation(fn => fn(tx)),
  };
  return { tx, prisma, service: new ArtistApplicationsService(prisma as unknown as PrismaService) };
}

describe('artist application contracts', () => {
  it.each(['home', 'shop', 'both'])('accepts %s without a follow requirement', async mode => {
    const dto = plainToInstance(CreateArtistApplicationDto, { ...input, serviceMode: mode, name: ' 测试 ' });
    expect(await validate(dto)).toEqual([]);
    expect(dto.name).toBe('测试');
  });
  it.each([{ phone: 'bad' }, { name: '  ' }, { serviceMode: '到店服务' }, { note: 'x'.repeat(1001) }])('rejects invalid payload %o', async change => {
    expect((await validate(plainToInstance(CreateArtistApplicationDto, { ...input, ...change }))).length).toBeGreaterThan(0);
  });
  it('does not disclose review status through legacy phone lookup', async () => {
    const { service } = setup();
    expect(await service.checkPhone(input.phone)).toEqual({ status: 'none' });
  });
  it.each([['home', true, false], ['shop', false, true], ['both', true, true], ['到店服务', false, true]])('approves %s with the correct service configuration', async (mode, homeService, shopService) => {
    const { service, tx, prisma } = setup();
    prisma.artistApplication.findUnique.mockResolvedValue({ id: 1, ...input, serviceMode: mode as string });
    await service.approve(1, 9);
    expect(tx.technician.create).toHaveBeenCalledWith({ data: expect.objectContaining({ homeService, shopService }) });
  });
  it('does not approve an unknown legacy mode into an unusable account', async () => {
    const { service, tx, prisma } = setup();
    prisma.artistApplication.findUnique.mockResolvedValue({ id: 1, ...input, serviceMode: '不确定' });
    await expect(service.approve(1, 9)).rejects.toThrow('服务方式不明确');
    expect(tx.artistApplication.update).not.toHaveBeenCalled();
    expect(tx.technician.create).not.toHaveBeenCalled();
  });
});
