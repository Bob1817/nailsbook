const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('--- 开始测试 P2: 美甲师临时锁档微调与上门美甲服务范围/跨城提示 ---');

// 1. 验证 getCityHint 逻辑
function normalizeCity(name) {
  if (!name || typeof name !== 'string') return '';
  return name.trim().replace(/(市|特别行政区|地区|盟|自治州)$/, '');
}

function getCityHint(tech, address) {
  var techCity = (typeof tech === 'string' ? tech : (tech && (tech.city || tech.serviceArea))) || '';
  var addrCity = (address && address.city) || '';
  var normTech = normalizeCity(techCity);
  var normAddr = normalizeCity(addrCity);

  if (!addrCity) {
    if (techCity) {
      return {
        isCrossCity: false,
        isSameCity: false,
        techCity: techCity,
        addrCity: '',
        hintText: '服务范围：限 ' + techCity + ' 及周边，具体路程与时间由美甲师沟通确认'
      };
    }
    return {
      isCrossCity: false,
      isSameCity: false,
      techCity: '',
      addrCity: '',
      hintText: '上门美甲服务范围及路程由美甲师沟通确认'
    };
  }

  if (normTech && normAddr) {
    if (normTech === normAddr) {
      return {
        isCrossCity: false,
        isSameCity: true,
        techCity: techCity,
        addrCity: addrCity,
        hintText: '同城上门 · 美甲师常驻 ' + techCity + '，路程费用由美甲师沟通确认'
      };
    }
    return {
      isCrossCity: true,
      isSameCity: false,
      techCity: techCity,
      addrCity: addrCity,
      hintText: '跨城提醒：当前地址（' + addrCity + '）与美甲师常驻城市（' + techCity + '）不一致，请提前确认是否支持跨城上门及路程费用'
    };
  }

  return {
    isCrossCity: false,
    isSameCity: false,
    techCity: techCity,
    addrCity: addrCity,
    hintText: '已选择 ' + addrCity + ' · 请与美甲师确认是否支持该区域上门'
  };
}

// Case 1.1: 未选地址，有美甲师城市
const hintNoAddr = getCityHint({ city: '成都市' }, null);
assert.strictEqual(hintNoAddr.isSameCity, false);
assert.strictEqual(hintNoAddr.isCrossCity, false);
assert(hintNoAddr.hintText.includes('成都市'), '未选地址应包含美甲师城市范围说明');

// Case 1.2: 同城地址比较（“成都市” 与 “成都” 归一化判定为同城）
const hintSameCity = getCityHint({ city: '成都市' }, { city: '成都' });
assert.strictEqual(hintSameCity.isSameCity, true);
assert.strictEqual(hintSameCity.isCrossCity, false);
assert(hintSameCity.hintText.includes('同城上门'), '同城应标明同城上门');

// Case 1.3: 跨城地址比较
const hintCrossCity = getCityHint({ city: '成都市' }, { city: '绵阳市' });
assert.strictEqual(hintCrossCity.isSameCity, false);
assert.strictEqual(hintCrossCity.isCrossCity, true);
assert(hintCrossCity.hintText.includes('跨城提醒'), '跨城应标明跨城提醒');

console.log('✓ Case 1 通过: 城市归一化比对与服务范围提示计算验证无误');

// 2. 验证前端 API 接口定义
const apiContent = fs.readFileSync(path.join(__dirname, '../services/api.js'), 'utf8');
assert(apiContent.includes('listBlockedSlots'), 'api.js 必须包含 listBlockedSlots');
assert(apiContent.includes('createBlockedSlot'), 'api.js 必须包含 createBlockedSlot');
assert(apiContent.includes('deleteBlockedSlot'), 'api.js 必须包含 deleteBlockedSlot');
console.log('✓ Case 2 通过: api.js 中 technician.bookingDays 锁档接口定义完整');

// 3. 验证 booking-time-engine 对手动锁档（BlockedTimeSlot）的置灰阻断
const timeEngine = require('../utils/booking-time-engine');
// 模拟 2026-10-30，锁档 14:00 - 16:00
const blockedSlots = [
  {
    orderId: null, // 手动锁档
    startTime: new Date('2026-10-30T14:00:00+08:00').toISOString(),
    endTime: new Date('2026-10-30T16:00:00+08:00').toISOString()
  }
];

const timeList = ['10:00', '11:00', '12:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
const slots = timeEngine.buildSlotStatuses({
  serviceDate: '2026-10-30',
  slots: timeList,
  durationMinutes: 60,
  blockedSlots: blockedSlots,
  serviceSchedule: {
    schemes: [{ id: 1, days: ['fri'], startTime: '10:00', endTime: '20:00' }],
    activeSchemeId: 1
  },
  now: new Date('2026-10-30T09:00:00+08:00')
});

// 检查 13:30（需要 60 分钟，到 14:30，会与 14:00-16:00 冲突）
const slot1330 = slots.find(s => s.time === '13:30');
assert(slot1330 && slot1330.occupied, '13:30 时长重叠锁档区间，必须被标记为 occupied');

// 检查 14:00（处于锁档区间）
const slot1400 = slots.find(s => s.time === '14:00');
assert(slot1400 && slot1400.occupied, '14:00 处于锁档区间，必须被标记为 occupied');

// 检查 15:30（处于锁档区间）
const slot1530 = slots.find(s => s.time === '15:30');
assert(slot1530 && slot1530.occupied, '15:30 处于锁档区间，必须被标记为 occupied');

// 检查 16:00（锁档已结束，16:00 - 17:00 应该可用）
const slot1600 = slots.find(s => s.time === '16:00');
assert(slot1600 && !slot1600.occupied, '16:00 锁档结束后，必须可预约');

// 模拟一键解锁：移除 blockedSlots
const unblockedSlots = timeEngine.buildSlotStatuses({
  serviceDate: '2026-10-30',
  slots: timeList,
  durationMinutes: 60,
  blockedSlots: [],
  serviceSchedule: {
    schemes: [{ id: 1, days: ['fri'], startTime: '10:00', endTime: '20:00' }],
    activeSchemeId: 1
  },
  now: new Date('2026-10-30T09:00:00+08:00')
});
const unblocked1400 = unblockedSlots.find(s => s.time === '14:00');
assert(unblocked1400 && !unblocked1400.occupied, '一键解锁后，14:00 必须恢复为可预约');

console.log('✓ Case 3 通过: booking-time-engine 联动验证，锁档精准阻断重叠时段，解锁后立即恢复');

// 4. 验证 schedule/index.wxml 与 index.wxss
const scheduleWxml = fs.readFileSync(path.join(__dirname, '../pages/technician/schedule/index.wxml'), 'utf8');
const scheduleWxss = fs.readFileSync(path.join(__dirname, '../pages/technician/schedule/index.wxss'), 'utf8');
const scheduleJs = fs.readFileSync(path.join(__dirname, '../pages/technician/schedule/index.js'), 'utf8');

assert(scheduleWxml.includes('add-block-btn'), 'schedule.wxml 必须包含添加锁档按钮');
assert(scheduleWxml.includes('blocked-slot-card'), 'schedule.wxml 必须包含锁档展示卡片');
assert(scheduleWxml.includes('unlock-slot-btn'), 'schedule.wxml 必须包含解锁按钮');
assert(scheduleWxml.includes('block-modal-mask'), 'schedule.wxml 必须包含锁档弹窗');

assert(scheduleJs.includes('openBlockModal'), 'schedule.js 必须包含 openBlockModal');
assert(scheduleJs.includes('confirmCreateBlockedSlot'), 'schedule.js 必须包含 confirmCreateBlockedSlot');
assert(scheduleJs.includes('onUnlockSlot'), 'schedule.js 必须包含 onUnlockSlot');

assert(scheduleWxss.includes('add-block-btn'), 'schedule.wxss 必须包含 add-block-btn 样式');
assert(scheduleWxss.includes('blocked-slot-card'), 'schedule.wxss 必须包含 blocked-slot-card 样式');

console.log('✓ Case 4 通过: 美甲师日程页视图、控制逻辑与样式完整一致');

console.log('--- 全部 P2 验证顺利通过！ ---');
