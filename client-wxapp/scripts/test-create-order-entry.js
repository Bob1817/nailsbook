const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createRequire } = require('node:module');
const file = path.join(__dirname, '../pages/client/create-order/index.js');
const tech = id => ({ technician: { id, status: 'active', serviceItems: [], shopAddresses: [] }, isDefault: true });
let bindings = [], definition, draft = {};
vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
  Page: value => definition = value, console,
  wx: { getStorageSync: () => draft },
  require: name => name.includes('services/api') ? { auth: { getUserInfo: async () => ({ bindings }) }, public: {} } : createRequire(file)(name)
});
function page(options = {}) {
  const result = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(v) { Object.assign(this.data, v); },
    isClientLoggedIn: () => true, loadTechWorks() {} };
  result.onLoad(options);
  return result;
}
const flush = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  bindings = [tech(1), tech(2)];
  draft = { selectedTechId: 1, sourceWorkId: 9 };
  let p = page(); await flush();
  assert(!p.data.selectedTechId, '多位美甲师不得通过默认标记或旧草稿自动选择');
  assert.equal(p._fullMode, false, '普通入口优先时间申请，款式与价格稍后完善');
  p.onSelectTechnician({ currentTarget: { dataset: { id: 2 } } });
  assert.equal(p.data.selectedTechId, 2);
  p.data.startTime = '14:00';
  p.onSelectTechnician({ currentTarget: { dataset: { id: 2 } } });
  assert.equal(p.data.startTime, '14:00', '重复点击不重置预约信息');
  draft = {}; bindings = [tech(1)];
  p = page(); await flush(); assert.equal(p.data.selectedTechId, 1);
  p.onSelectTechnician({ currentTarget: { dataset: { id: 1 } } });
  assert.equal(p.data.selectedTechId, 1, '唯一美甲师不能取消');
  bindings = [tech(1), tech(2)];
  p = page({ mode: 'full' }); await flush();
  assert.equal(p._fullMode, true, '显式完整模式仍支持先选服务');
  p = page({ techId: '2' }); await flush();
  assert.equal(p.data.selectedTechId, 2); assert.equal(p.data.presetLocked, true);
  p.onSelectTechnician({ currentTarget: { dataset: { id: 1 } } });
  assert.equal(p.data.selectedTechId, 2, '固定入口不能切换美甲师');
  console.log('预约入口：多选不默认、唯一不可取消、固定美甲师、旧草稿隔离检查通过');
})().catch(err => { console.error(err); process.exitCode = 1; });
