import { ValidationPipe } from '@nestjs/common';
import { ReleasesService, compareVersions } from './releases.service';
import { ReleaseQueryDto, SaveReleaseDto } from './releases.dto';
import { AdminReleasesController } from './releases.controller';
import { SuperAdminGuard } from '../auth/super-admin.guard';

describe('版本与更新公告',()=>{
  it('只查询已发布且匹配角色的公告，按数值版本排序并排除未来版本',async()=>{
    const db:any={releaseNotice:{findMany:jest.fn().mockResolvedValue([
      {id:1,version:'1.9.0'},{id:2,version:'1.10.0'},{id:3,version:'2.0.0'},
    ])}};
    const service=new ReleasesService(db);
    expect((await service.publicList('client','1.10.0')).map(n=>n.id)).toEqual([2,1]);
    expect(db.releaseNotice.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{audience:{in:['all','client']},publishedAt:{lte:expect.any(Date)}}}));
    expect(compareVersions('1.10.0','1.9.0')).toBeGreaterThan(0);
  });
  it('支持发布及撤回，重复版本和受众返回可读错误',async()=>{
    const db:any={releaseNotice:{findUnique:jest.fn().mockResolvedValue({id:1}),update:jest.fn().mockResolvedValue({id:1}),create:jest.fn().mockRejectedValue({code:'P2002'})}};
    const service=new ReleasesService(db),dto={version:'1.0.0',audience:'all',title:' 更新 ',content:' 内容 ',published:true};
    await service.save(dto,1);
    expect(db.releaseNotice.update).toHaveBeenLastCalledWith(expect.objectContaining({data:expect.objectContaining({title:'更新',publishedAt:expect.any(Date)})}));
    await service.save({...dto,published:false},1);
    expect(db.releaseNotice.update).toHaveBeenLastCalledWith(expect.objectContaining({data:expect.objectContaining({publishedAt:null})}));
    await expect(service.save(dto)).rejects.toThrow('已存在');
  });
  it('定时发布保存未来时间，拒绝过去时间和未开启发布的计划',async()=>{
    const db:any={releaseNotice:{create:jest.fn().mockResolvedValue({id:1})}};
    const service=new ReleasesService(db),dto={version:'1.0.0',audience:'all',title:'更新',content:'内容',published:true};
    const future=new Date(Date.now()+3600000).toISOString();
    await service.save({...dto,scheduledFor:future});
    expect(db.releaseNotice.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({publishedAt:new Date(future)})}));
    await expect(service.save({...dto,scheduledFor:'2020-01-01T00:00:00Z'})).rejects.toThrow('未来');
    await expect(service.save({...dto,published:false,scheduledFor:future})).rejects.toThrow();
  });

  it('服务器时间到达发布时刻才公开，含北京时间换算',async()=>{
    jest.useFakeTimers();
    const at=new Date('2099-01-01T12:00:00+08:00');
    const row={id:9,version:'1.0.0',publishedAt:at};
    const db:any={releaseNotice:{findMany:jest.fn().mockImplementation(query=>Promise.resolve(query.where.publishedAt.lte>=at ? [row] : []))}};
    try {
      const service=new ReleasesService(db);
      jest.setSystemTime(at.getTime()-1);
      expect(await service.publicList('client','1.0.0')).toEqual([]);
      jest.setSystemTime(at.getTime());
      expect((await service.publicList('client','1.0.0')).map(n=>n.id)).toEqual([9]);
      expect(db.releaseNotice.findMany).toHaveBeenLastCalledWith(expect.objectContaining({where:expect.objectContaining({publishedAt:{lte:new Date('2099-01-01T04:00:00Z')}})}));
    } finally {jest.useRealTimers();}
  });

  it('真实请求校验拒绝非法版本、空白内容和非法受众',async()=>{
    const pipe=new ValidationPipe({transform:true,whitelist:true});
    const valid={version:'1.2.0',audience:'all',title:'更新',content:'改进预约'};
    for(const patch of [{version:'latest'},{audience:'admin'},{content:'   '},{published:'true'},{scheduledFor:'2027-01-01T12:00:00'},{scheduledFor:'invalid'}])
      await expect(pipe.transform({...valid,...patch},{type:'body',metatype:SaveReleaseDto})).rejects.toThrow();
    await expect(pipe.transform({role:'admin'},{type:'query',metatype:ReleaseQueryDto})).rejects.toThrow();
  });
  it('版本管理接口仅允许超管',()=>{
    expect(Reflect.getMetadata('__guards__',AdminReleasesController)).toContain(SuperAdminGuard);
    const guard=new SuperAdminGuard();
    expect(()=>guard.canActivate({switchToHttp:()=>({getRequest:()=>({user:{roleCode:'operator'}})})} as never)).toThrow();
  });
});
