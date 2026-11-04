// Receive-only Socket.IO v5 / Engine.IO v4 text transport over wx.SocketTask.
// No polling, binary payloads, acknowledgements or chat writes are needed here.
let socket = null;
let sessionKey = '';
let running = false;
let retryTimer = null;
let heartbeatTimer = null;
let refreshTimer = null;
let retryCount = 0;
let heartbeatMs = 45000;
let pending = false;
let generation = 0;
let blockedUrl = '';

function session() {
  const app = typeof getApp === 'function' ? getApp() : null;
  const role = wx.getStorageSync('role');
  const token = wx.getStorageSync('technician_token') || wx.getStorageSync('token');
  if (role !== 'technician' || !token || wx.getStorageSync('isTourist')) return null;
  if (!app || !app.globalData || !app.globalData.apiBaseUrl) return null;
  const expiresAt = typeof app.getTokenExpiresAt === 'function' ? app.getTokenExpiresAt(token) : 0;
  if (expiresAt && expiresAt <= Date.now()) return null;
  const base = app.globalData.apiBaseUrl.replace(/\/$/, '');
  return { token, key: base + ':' + token, url: base.replace(/^http/, 'ws') + '/socket.io/?EIO=4&transport=websocket' };
}

function isDomainConfigError(error) {
  const message = String((error && (error.errMsg || error.message)) || error || '');
  return /合法域名|domain list|url not in domain/i.test(message);
}

function handleSocketError(task, url, error) {
  if (task && socket !== task) return;
  if (isDomainConfigError(error)) {
    blockedUrl = url;
    stop();
    return;
  }
  reconnect();
}

function refresh() {
  clearTimeout(refreshTimer);
  refreshTimer = null;
  if (!running || !pending) return;
  if (!session() || session().key !== sessionKey) { start(); return; }
  const pages = getCurrentPages();
  const page = pages[pages.length - 1];
  if (!page || typeof page.onBookingChanged !== 'function') { pending = false; return; }
  if (page.data.loading || page._dashboardLoading || page._bookingRefreshing) {
    refreshTimer = setTimeout(refresh, 300);
    return;
  }
  const refreshGeneration = generation;
  pending = false;
  page._bookingRefreshing = true;
  Promise.resolve().then(() => page.onBookingChanged()).catch(() => {
    // Keep existing content on transient failures; retry without a full page reload.
    if (running && generation === refreshGeneration) { pending = true; refreshTimer = setTimeout(refresh, 5000); }
  }).finally(() => { page._bookingRefreshing = false; });
}

function invalidate() {
  pending = true;
  if (!refreshTimer) refreshTimer = setTimeout(refresh, 250);
}

function disconnect() {
  const old = socket;
  socket = null;
  clearTimeout(heartbeatTimer);
  heartbeatTimer = null;
  // Only live tasks (CONNECTING=0 / OPEN=1) accept close; closing a dead or
  // never-connected task triggers "closeSocket:fail task not found".
  if (old && (old.readyState === 0 || old.readyState === 1)) {
    try { old.close({ fail: () => {} }); } catch (_) {}
  }
}

function reconnect() {
  disconnect();
  if (!running || retryTimer) return;
  const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(retryCount++, 5)));
  retryTimer = setTimeout(() => { retryTimer = null; connect(); }, delay + Math.floor(Math.random() * 500));
}

function armHeartbeat() {
  clearTimeout(heartbeatTimer);
  heartbeatTimer = setTimeout(reconnect, heartbeatMs);
}

function connect() {
  if (!running || socket) return;
  const current = session();
  if (!current) { stop(); return; }
  if (blockedUrl === current.url) { stop(); return; }
  sessionKey = current.key;
  let task;
  let setupError = null;
  try {
    task = wx.connectSocket({
      url: current.url,
      fail: error => {
        if (!task) { setupError = error; return; }
        handleSocketError(task, current.url, error);
      }
    });
    socket = task;
    if (setupError) { handleSocketError(task, current.url, setupError); return; }
  } catch (error) { handleSocketError(task, current.url, error); return; }
  armHeartbeat();
  const send = data => task.send({ data, fail: () => { if (socket === task) reconnect(); } });
  task.onMessage(({ data }) => {
    if (socket !== task || !running) return;
    const latest = session();
    if (!latest || latest.key !== sessionKey) { start(); return; }
    if (typeof data !== 'string') return;
    try {
      if (data[0] === '0') {
        const hello = JSON.parse(data.slice(1));
        heartbeatMs = Number(hello.pingInterval) + Number(hello.pingTimeout);
        if (!Number.isFinite(heartbeatMs) || heartbeatMs <= 0) heartbeatMs = 45000;
        armHeartbeat();
        send('40' + JSON.stringify({ token: current.token }));
      } else if (data === '2') {
        send('3');
        armHeartbeat();
      } else if (data.startsWith('42')) {
        const event = JSON.parse(data.slice(2));
        if (event[0] === 'booking:ready') {
          retryCount = 0;
          invalidate(); // Also recovers missed events after reconnect/background.
        } else if (event[0] === 'booking:changed' && Number.isSafeInteger(event[1]?.orderId)) {
          invalidate();
        } else if (event[0] === 'error') {
          stop(); // Authentication rejected: do not repeatedly send the same token.
        }
      } else if (data.startsWith('44')) {
        stop();
      } else if (data === '1' || data === '41') {
        reconnect();
      }
    } catch (_) { reconnect(); }
  });
  task.onClose(() => { if (socket === task) reconnect(); });
  task.onError(error => handleSocketError(task, current.url, error));
}

function start() {
  const current = session();
  if (!current || typeof wx.connectSocket !== 'function') { stop(); return; }
  if (running && sessionKey === current.key && (socket || retryTimer)) return;
  stop();
  running = true;
  sessionKey = current.key;
  connect();
}

function stop() {
  generation += 1;
  running = false;
  pending = false;
  retryCount = 0;
  clearTimeout(retryTimer);
  clearTimeout(refreshTimer);
  retryTimer = refreshTimer = null;
  disconnect();
}

module.exports = { start, stop };
