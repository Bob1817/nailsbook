var DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
var DAY_LABELS = { mon: '周一', tue: '周二', wed: '周三', thu: '周四', fri: '周五', sat: '周六', sun: '周日' };

// 30 分钟粒度的时间选项 (00:00 ~ 23:30)
var TIME_OPTIONS = [];
for (var i = 0; i < 48; i++) {
  var h = Math.floor(i / 2);
  var m = i % 2 === 0 ? '00' : '30';
  TIME_OPTIONS.push((h < 10 ? '0' : '') + h + ':' + m);
}

function genId() {
  return 's_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

/**
 * 将存储的 serviceSchedule 统一为 schemes[] 新格式
 * 兼容旧的 days{} 格式、空数据、null
 */
function normalizeSchedule(saved) {
  if (saved && Array.isArray(saved.schemes)) {
    return {
      schemes: saved.schemes,
      activeSchemeId: saved.activeSchemeId || (saved.schemes[0] && saved.schemes[0].id) || null,
      restDays: saved.restDays || []
    };
  }
  if (saved && saved.days) {
    var enabled = DAY_KEYS.filter(function (k) {
      return saved.days[k] && saved.days[k].enabled;
    });
    var counts = {};
    enabled.forEach(function (k) {
      var d = saved.days[k];
      var key = d.startTime + '-' + d.endTime;
      counts[key] = (counts[key] || 0) + 1;
    });
    var top = '';
    var topCount = 0;
    Object.keys(counts).forEach(function (key) {
      if (counts[key] > topCount) {
        topCount = counts[key];
        top = key;
      }
    });
    var startTime = '10:00';
    var endTime = '21:00';
    if (top) {
      var parts = top.split('-');
      startTime = parts[0];
      endTime = parts[1];
    }
    var scheme = { id: 'default', label: '默认', startTime: startTime, endTime: endTime, days: enabled };
    return { schemes: [scheme], activeSchemeId: scheme.id, restDays: [] };
  }
  var defaultScheme = { id: genId(), label: '默认', startTime: '10:00', endTime: '21:00', days: DAY_KEYS.slice() };
  return { schemes: [defaultScheme], activeSchemeId: defaultScheme.id, restDays: [] };
}

/** 返回当前激活的方案，无则返回 null */
function activeScheme(schedule) {
  if (!schedule || !schedule.schemes) return null;
  for (var i = 0; i < schedule.schemes.length; i++) {
    if (schedule.schemes[i].id === schedule.activeSchemeId) return schedule.schemes[i];
  }
  return null;
}

/** 生成日期摘要文本 */
function daysSummary(days) {
  if (!days || days.length === 0) return '未选择';
  if (days.length === 7) return '每天';
  var sorted = days.slice().sort(function (a, b) {
    return DAY_KEYS.indexOf(a) - DAY_KEYS.indexOf(b);
  });
  return sorted.map(function (d) { return DAY_LABELS[d] || d; }).join('·');
}

module.exports = {
  DAY_KEYS: DAY_KEYS,
  DAY_LABELS: DAY_LABELS,
  TIME_OPTIONS: TIME_OPTIONS,
  genId: genId,
  normalizeSchedule: normalizeSchedule,
  activeScheme: activeScheme,
  daysSummary: daysSummary
};
