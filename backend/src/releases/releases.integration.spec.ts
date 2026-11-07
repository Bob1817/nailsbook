import { PrismaClient } from '@prisma/client';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { ReleasesService } from './releases.service';

describe('更新公告真实数据库发布链路',()=>{
  let prisma:PrismaClient,directory:string,service:ReleasesService;
  beforeAll(async()=>{
    directory=mkdtempSync(join(tmpdir(),'nailbook-releases-'));
    const db=join(directory,'test.db');
    const sql=execFileSync('npx',['prisma','migrate','diff','--from-empty','--to-schema-datamodel','prisma/schema.prisma','--script']);
    execFileSync('sqlite3',[db],{input:sql});
    prisma=new PrismaClient({datasources:{db:{url:`file:${db}`}}});
    service=new ReleasesService(prisma as never);
  });
  afterAll(async()=>{await prisma?.$disconnect();if(directory)rmSync(directory,{recursive:true,force:true});});
  it('草稿不可见，发布后按角色显示，未来版本隔离，撤回后消失',async()=>{
    const dto={version:'1.1.0',audience:'technician',title:'报价改进',content:'更便捷的报价',important:true,published:false};
    const draft=await service.save(dto);
    expect(await service.publicList('technician','1.1.0')).toEqual([]);
    await service.save({...dto,published:true},draft.id);
    expect((await service.publicList('technician','1.1.0')).map(n=>n.id)).toEqual([draft.id]);
    expect(await service.publicList('client','1.1.0')).toEqual([]);
    expect(await service.publicList('technician','1.0.0')).toEqual([]);
    await service.save({...dto,published:false},draft.id);
    expect(await service.publicList('technician','1.1.0')).toEqual([]);
  });
  it('未来计划不可提前读取，改为立即发布后可见，取消计划即回草稿',async()=>{
    const dto={version:'1.2.0',audience:'client',title:'计划发布',content:'定时通知',published:true};
    const row=await service.save({...dto,scheduledFor:new Date(Date.now()+3600000).toISOString()});
    expect(await service.publicList('client','1.2.0')).toEqual([]);
    await service.save(dto,row.id);
    expect((await service.publicList('client','1.2.0')).map(n=>n.id)).toEqual([row.id]);
    await service.save({...dto,published:false},row.id);
    expect(await service.publicList('client','1.2.0')).toEqual([]);
  });

});
