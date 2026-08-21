// 日期/时间/金额/倒计时格式化工具

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  // 兼容 iOS 不识别带空格的格式："2026-06-02 14:30:00" -> "2026-06-02T14:30:00"
  const normalized = typeof value === 'string' ? value.replace(' ', 'T') : value;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

// "14:30"
function formatClock(iso) {
  const d = parseDate(iso);
  if (!d) return '';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// "6月2日 周一"
function formatBookingDate(iso) {
  const d = parseDate(iso);
  if (!d) return '';
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`;
}

// "6月2日 周一"（当前日期）
function formatToday() {
  return formatBookingDate(new Date());
}

// "¥168"
function formatMoney(value) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return '¥0';
  if (n === Math.floor(n)) return `¥${n}`;
  return `¥${n.toFixed(2)}`;
}

// 距出发倒计时人话："现在出发" / "23 分钟" / "2 小时" / "1 天 3 小时"
function formatDepartureCountdown(minutes) {
  if (minutes <= 0) return '现在出发';
  if (minutes < 60) return `${minutes} 分钟`;
  const totalHours = minutes / 60;
  if (totalHours < 24) return `${Math.floor(totalHours)} 小时`;
  const days = Math.floor(totalHours / 24);
  const restHours = Math.floor(totalHours % 24);
  if (restHours === 0) return `${days} 天`;
  return `${days} 天 ${restHours} 小时`;
}

// 是否同一天
function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

module.exports = {
  parseDate,
  formatClock,
  formatBookingDate,
  formatToday,
  formatMoney,
  formatDepartureCountdown,
  isSameDay
};
