import { createServer } from 'http';
import { Server } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import { ChatGateway } from './chat.gateway';
const WebSocket = require('ws');
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function until(check: () => boolean) {
  for (let i = 0; i < 100; i++) { if (check()) return; await wait(30); }
  throw new Error('Realtime condition timed out');
}

describe('mini-program booking transport against real Socket.IO', () => {
  it('authenticates, isolates rooms, handles heartbeat and resynchronizes after reconnect', async () => {
    const oldSecret = process.env.TECHNICIAN_JWT_SECRET;
    process.env.TECHNICIAN_JWT_SECRET = 'booking-test-secret';
    const http = createServer();
    const io = new Server(http, { pingInterval: 150, pingTimeout: 300 });
    const gateway = new ChatGateway(
      { getUserConversationIds: async () => [] } as any,
      { userConnected: () => 'joined', getOnlineUsers: () => [] } as any,
      {} as any,
      { technician: { findUnique: async () => ({status:'active',tokenVersion:0}) } } as any,
    );
    gateway.server = io;
    io.on('connection', socket => { void gateway.handleConnection(socket); });
    await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
    const port = (http.address() as any).port;
    const clients: any[] = [];
    const source = fs.readFileSync(path.resolve(__dirname, '../../../client-wxapp/utils/booking-realtime.js'), 'utf8');
    function client(id: number, invalid = false) {
      let refreshes = 0;
      const token = jwt.sign({sub:id,userType:'technician',tv:0}, invalid ? 'wrong-secret' : 'booking-test-secret', {expiresIn:'1h'});
      const storage: any = {role:'technician',technician_token:token};
      const tasks: any[] = [];
      const module = {exports:{} as any};
      vm.runInNewContext(source, { module, console, setTimeout, clearTimeout, Promise,
        getApp: () => ({globalData:{apiBaseUrl:`http://127.0.0.1:${port}`}}),
        getCurrentPages: () => [{data:{loading:false},onBookingChanged:()=>{refreshes++;}}],
        wx: {getStorageSync:(key:string)=>storage[key], connectSocket:({url}:any)=>{
          const ws = new WebSocket(url); tasks.push(ws);
          return { get readyState(){ return ws.readyState; },
            send:({data}:any)=>ws.send(data), close:()=>ws.close(),
            onMessage:(cb:any)=>ws.on('message',(data:any)=>cb({data:data.toString()})),
            onClose:(cb:any)=>ws.on('close',cb), onError:(cb:any)=>ws.on('error',cb) };
        }}
      });
      const instance = {api:module.exports,tasks,count:()=>refreshes}; clients.push(instance);
      instance.api.start(); return instance;
    }
    try {
      const a = client(7), b = client(8), invalid = client(9,true);
      await until(()=>a.count()===1 && b.count()===1);
      expect(invalid.count()).toBe(0);
      gateway.broadcastBookingChanged({id:42,technicianId:7});
      await until(()=>a.count()===2);
      expect(b.count()).toBe(1);
      await wait(600); expect(a.tasks.length).toBe(1);
      a.tasks[0].terminate();
      await until(()=>a.tasks.length===2 && a.count()===3);
      expect(invalid.tasks.length).toBe(1);
      a.api.stop(); const count = a.count();
      gateway.broadcastBookingChanged({id:43,technicianId:7});
      await wait(350); expect(a.count()).toBe(count);
    } finally {
      clients.forEach(c=>c.api.stop());
      await new Promise<void>(resolve=>io.close(()=>resolve()));
      if (oldSecret === undefined) delete process.env.TECHNICIAN_JWT_SECRET;
      else process.env.TECHNICIAN_JWT_SECRET = oldSecret;
    }
  });
});
