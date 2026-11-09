// Isolated real SQLite integration test. Never reads the configured application DB.
const {mkdtempSync,rmSync,writeFileSync}=require('node:fs');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const {PrismaClient}=require('@prisma/client');
const {BookingQuotesService}=require('../dist/src/booking-quotes/booking-quotes.service');
(async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'nailbook-quote-claim-'));
  writeFileSync(path.join(dir,'test.db'), '');
  const url='file:'+path.join(dir,'test.db');
  const prisma=new PrismaClient({datasources:{db:{url}}});
  try {
    execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'db','push','--skip-generate'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,DATABASE_URL:url},stdio:'pipe'});
    const tech=await prisma.technician.create({data:{name:'测试美甲师',phone:'13900000001',status:'active'}});
    const first=await prisma.clientUser.create({data:{phone:'13900000002'}});
    const second=await prisma.clientUser.create({data:{phone:'13900000003'}});
    const token='a'.repeat(48);
    await prisma.bookingQuote.create({data:{quoteNo:'TEST1',publicToken:token,technicianId:tech.id,technicianNameSnapshot:tech.name,finalPriceFen:100,totalDurationMinutes:60,expiresAt:new Date(Date.now()+60000)}});
    const service=new BookingQuotesService(prisma,{},{});
    const results=await Promise.allSettled([service.accept(first.id,token),service.accept(second.id,token)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const quote=await prisma.bookingQuote.findUnique({where:{publicToken:token}});
    const winner=quote.clientUserId;
    assert.equal(await prisma.clientTechBinding.count(),1);
    assert.equal(await prisma.customer.count(),1);
    assert.equal((await service.accept(winner,token)).clientUserId,winner);
    assert.equal((await service.clientDetail(winner===first.id?second.id:first.id,token)).canSchedule,false);
    await assert.rejects(()=>service.declineOwned(winner===first.id?second.id:first.id,token,'放弃'));
    await service.declineOwned(winner,token,'放弃');
    assert.equal((await service.clientDetail(winner,token)).canSchedule,false);
    console.log('真实 SQLite：并发仅一人认领、失败无绑定副作用、本人重复幂等、他人不可预约/拒绝通过');
  } finally {await prisma.$disconnect();rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
