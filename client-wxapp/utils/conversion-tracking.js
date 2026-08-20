const api = require('../services/api');

const VISITOR_KEY = 'conversion_visitor_id';
const EVENT_TYPES = ['homepage_view', 'work_view', 'price_view', 'consult_click', 'consult_submit', 'booking_click', 'booking_submit', 'artist_view', 'booking_intent'];
const CHANNELS = ['direct', 'xiaohongshu', 'douyin', 'wechat_moments', 'wechat_share', 'repeat_customer', 'customer_referral', 'offline_qr', 'organic', 'unknown'];
const ALIASES = { xhs:'xiaohongshu', red:'xiaohongshu', tiktok_cn:'douyin', moments:'wechat_moments', share_card:'wechat_share', wechat_friend:'wechat_share', repurchase:'repeat_customer', referral:'customer_referral', qr:'offline_qr' };

function randomId(prefix) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`; }
function safeToken(value, max) { const v=String(value||'').trim().toLowerCase(); return /^[a-z0-9_-]+$/.test(v)?v.slice(0,max):''; }
function normalizeChannel(value) { const v=safeToken(value,32)||'direct'; const channel=ALIASES[v]||v; return CHANNELS.includes(channel)?channel:'direct'; }
function getVisitorId() { let id=wx.getStorageSync(VISITOR_KEY); if(!id){id=randomId('visitor');wx.setStorageSync(VISITOR_KEY,id);} return id; }
function attributionFrom(options, fallbackTouchpoint) {
  options=options||{};
  const raw=options.channel||options.source||'';
  const channel=normalizeChannel(raw);
  const isChannel=CHANNELS.includes(ALIASES[safeToken(raw,32)]||safeToken(raw,32));
  return { channel, source:channel, touchpoint:safeToken(options.touchpoint||(!isChannel&&raw)||fallbackTouchpoint,32), campaign:safeToken(options.campaign,64), content:safeToken(options.content,64), visitorId:getVisitorId() };
}
function buildConversionEvent(options) {
  const technicianId=Number(options&&options.technicianId), workId=Number(options&&options.workId);
  if(!Number.isInteger(technicianId)||technicianId<=0||!EVENT_TYPES.includes(options.eventType))return null;
  return { eventId:randomId('event'), technicianId, workId:Number.isInteger(workId)&&workId>0?workId:undefined, eventType:options.eventType, ...attributionFrom(options,options.touchpoint) };
}
function trackConversion(options) { const event=buildConversionEvent(options); if(!event)return Promise.resolve(false); return api.public.conversionEvents.record(event).then(()=>true).catch(()=>false); }

module.exports={ attributionFrom, buildConversionEvent, getVisitorId, normalizeChannel, trackConversion };
