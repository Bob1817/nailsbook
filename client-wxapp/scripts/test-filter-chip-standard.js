const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

// 1. 客户页顶部搜索框与邀请按钮
const customerWxss = read('pages/technician/customers/index.wxss');
assert.match(customerWxss, /\.header\s*\{[^}]*padding:\s*12rpx/s, '客户页顶部 header 必须采用紧凑垂直内边距');
assert.match(customerWxss, /\.search-bar\s*\{[^}]*height:\s*72rpx;[^}]*background:\s*var\(--nb-page\);/s, '客户页搜索框必须采用紧凑高度与页面底色');
assert.match(customerWxss, /\.btn-invite\.btn-invite[\s\S]*border:\s*1rpx\s+solid\s+rgba\(0,\s*0,\s*0,\s*0\.08\);[\s\S]*border-radius:\s*var\(--radius-full\);/s, '邀请按钮必须是具有独立边框的完整实体胶囊');
assert.match(customerWxss, /\.filter-row\s*\{[^}]*height:\s*56rpx;/s, '标签行高度必须压缩至 56rpx 以释放首屏空间');
assert.match(customerWxss, /\.tab-item\s*\{[^}]*height:\s*54rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '客户页标签必须采用紧凑 Airbnb Filter Chip 药丸规格');
assert.match(customerWxss, /\.tab-item::after\s*\{[^}]*content:\s*'';[^}]*top:\s*-16rpx;[^}]*bottom:\s*-16rpx;/s, '筛选胶囊保留紧凑外观并通过伪元素扩充触控热区');
assert.match(customerWxss, /\.tab-active\s*\{[^}]*background:\s*var\(--nb-action\);[^}]*color:\s*var\(--nb-inverse\);/s, '客户页选中标签必须使用石墨黑高对比底色反白字');

// 2. 美甲师消息页标签
const techChatWxss = read('pages/technician/chat/index.wxss');
assert.match(techChatWxss, /\.tab-pill\s*\{[^}]*height:\s*56rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '美甲师消息页标签必须升级为实体 Airbnb Filter Chip');
assert.match(techChatWxss, /\.tab-pill::after\s*\{[^}]*content:\s*'';[^}]*top:\s*-16rpx;[^}]*bottom:\s*-16rpx;/s, '筛选胶囊保留紧凑外观并通过伪元素扩充触控热区');
assert.match(techChatWxss, /\.tab-pill-active\s*\{[^}]*background:\s*var\(--nb-action\);/s, '美甲师消息页激活标签必须为石墨黑底色');
assert.match(techChatWxss, /\.tab-pill-active\s+\.tab-label\s*\{[^}]*color:\s*var\(--nb-inverse\);/s, '美甲师消息页激活文字必须反白');
assert.match(techChatWxss, /\.tab-pill-active\s+\.tab-count\s*\{[^}]*background:\s*#FFFFFF;[^}]*color:\s*var\(--nb-action\);/s, '美甲师消息页激活计数徽标必须反转为高对比白底黑字');

// 3. 客户消息页标签
const clientChatWxss = read('pages/client/chat/index.wxss');
assert.match(clientChatWxss, /\.tab-pill\s*\{[^}]*height:\s*56rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '客户消息页标签必须统一为实体 Airbnb Filter Chip');
assert.match(clientChatWxss, /\.tab-pill::after\s*\{[^}]*content:\s*'';[^}]*top:\s*-16rpx;[^}]*bottom:\s*-16rpx;/s, '筛选胶囊保留紧凑外观并通过伪元素扩充触控热区');
assert.match(clientChatWxss, /\.tab-pill-active\s*\{[^}]*background:\s*var\(--nb-action\);/s, '客户消息页激活标签必须为石墨黑底色');
assert.match(clientChatWxss, /\.tab-pill-active\s+\.tab-label\s*\{[^}]*color:\s*var\(--nb-inverse\);/s, '客户消息页激活文字必须反白');
assert.match(clientChatWxss, /\.tab-pill-active\s+\.tab-count\s*\{[^}]*background:\s*#FFFFFF;[^}]*color:\s*var\(--nb-action\);/s, '客户消息页激活计数徽标必须反转为高对比白底黑字');

// 4. 美甲师全部预约页标签
const allBookingsWxss = read('pages/technician/all-bookings/index.wxss');
assert.match(allBookingsWxss, /\.filter-tab\s*\{[^}]*height:\s*54rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '全部预约页标签必须采用紧凑 Airbnb Filter Chip 药丸规格');
assert.match(allBookingsWxss, /\.filter-tab::after\s*\{[^}]*content:\s*'';[^}]*top:\s*-16rpx;[^}]*bottom:\s*-16rpx;/s, '筛选胶囊保留紧凑外观并通过伪元素扩充触控热区');
assert.match(allBookingsWxss, /\.filter-tab\.active\s*\{[^}]*background:\s*var\(--nb-action\);[\s\S]*color:\s*var\(--nb-inverse\);/s, '全部预约页激活标签必须为石墨黑底色反白字');

// 5. 美甲师端作品管理页标签与排序
const techWorksWxss = read('pages/technician/works/index.wxss');
assert.match(techWorksWxss, /\.filter-chip,\s*\.status-chip\s*\{[^}]*height:\s*54rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '美甲师作品页分类与状态筛选必须采用 54rpx Airbnb Filter Chip 规格');
assert.match(techWorksWxss, /\.filter-chip::after,\s*\.status-chip::after\s*\{[^}]*content:\s*'';[^}]*top:\s*-16rpx;[^}]*bottom:\s*-16rpx;/s, '筛选胶囊保留紧凑外观并通过伪元素扩充触控热区');
assert.match(techWorksWxss, /\.filter-chip\.selected,\s*\.status-chip\.selected\s*\{[^}]*background:\s*var\(--nb-action\);[\s\S]*color:\s*var\(--nb-inverse\);/s, '美甲师作品页选中状态必须为石墨黑反白字');
assert.match(techWorksWxss, /\.sort-action\s*\{[^}]*height:\s*54rpx;[^}]*border-radius:\s*var\(--radius-full\);/s, '美甲师作品页排序操作必须对齐 44px 胶囊规格');

// 6. 客户端作品列表/画册分类与排序
const clientWorksWxss = read('pages/client/works/index.wxss');
assert.match(clientWorksWxss, /\.tech-pill\s*\{[^}]*height:\s*54rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '客户端作品页分类与美甲师筛选必须为 54rpx Airbnb Filter Chip');
assert.match(clientWorksWxss, /\.tech-pill::after\s*\{[^}]*content:\s*'';[^}]*top:\s*-16rpx;[^}]*bottom:\s*-16rpx;/s, '筛选胶囊保留紧凑外观并通过伪元素扩充触控热区');
assert.match(clientWorksWxss, /\.tech-pill-active\s*\{[^}]*background:\s*var\(--nb-action\);[\s\S]*color:\s*var\(--nb-inverse\);/s, '客户端作品页选中胶囊必须为石墨黑底色反白字');
assert.match(clientWorksWxss, /\.sort-tab\s*\{[^}]*height:\s*54rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '客户端作品页排序标签必须统一为 54rpx Airbnb Filter Chip');

// 7. 客户端我的预约/订单状态筛选
const clientOrdersWxss = read('pages/client/orders/index.wxss');
assert.match(clientOrdersWxss, /\.status-tab\s*\{[^}]*height:\s*54rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '客户端订单状态筛选必须统一为 54rpx Airbnb Filter Chip 药丸规格');
assert.match(clientOrdersWxss, /\.status-tab::after\s*\{[^}]*content:\s*'';[^}]*top:\s*-16rpx;[^}]*bottom:\s*-16rpx;/s, '筛选胶囊保留紧凑外观并通过伪元素扩充触控热区');
assert.match(clientOrdersWxss, /\.status-tab-active\s*\{[^}]*background:\s*var\(--nb-action\);[\s\S]*color:\s*var\(--nb-inverse\);/s, '客户端订单状态选中胶囊必须为石墨黑底色反白字');
assert.match(clientOrdersWxss, /\.filter-create\s*\{[^}]*width:\s*54rpx;[^}]*height:\s*54rpx;/s, '客户端发起预约圆形快捷按钮必须与筛选栏等高协调');

// 8. 客户端发现页分类标签
const clientDiscoverWxss = read('pages/client/discover/index.wxss');
assert.match(clientDiscoverWxss, /\.cat-pill\s*\{[^}]*height:\s*54rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '客户端发现页分类标签必须升级为 54rpx Airbnb Filter Chip 药丸');
assert.match(clientDiscoverWxss, /\.cat-pill::after\s*\{[^}]*content:\s*'';[^}]*top:\s*-16rpx;[^}]*bottom:\s*-16rpx;/s, '筛选胶囊保留紧凑外观并通过伪元素扩充触控热区');
assert.match(clientDiscoverWxss, /\.cat-active\s*\{[^}]*background:\s*var\(--nb-action\);[\s\S]*color:\s*var\(--nb-inverse\);/s, '客户端发现页选中分类必须为石墨黑底色反白字');

// 9. 美甲师端交易订单筛选
const techTradeOrdersWxss = read('pages/technician/trade-orders/index.wxss');
assert.match(techTradeOrdersWxss, /\.tab\s*\{[^}]*height:\s*54rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '美甲师交易订单筛选必须统一为 54rpx Airbnb Filter Chip');
assert.match(techTradeOrdersWxss, /\.tab::after\s*\{[^}]*content:\s*'';[^}]*top:\s*-16rpx;[^}]*bottom:\s*-16rpx;/s, '美甲师交易订单标签必须具备 44px 触控保护');
assert.match(techTradeOrdersWxss, /\.tab\.active\s*\{[^}]*background:\s*var\(--nb-action\);[\s\S]*color:\s*var\(--nb-inverse\);/s, '美甲师交易订单选中标签必须为石墨黑底色反白字');

// 10. 美甲师端完成服务建议选项与反应等级胶囊
const completeServiceWxss = read('pages/technician/complete-service/index.wxss');
assert.match(completeServiceWxss, /\.chip\.airbnb-chip\s*\{[^}]*height:\s*54rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '完成服务建议胶囊必须为 54rpx Airbnb Filter Chip');
assert.match(completeServiceWxss, /\.chip\.airbnb-chip::after\s*\{[^}]*content:\s*'';[^}]*top:\s*-16rpx;[^}]*bottom:\s*-16rpx;/s, '筛选胶囊保留紧凑外观并通过伪元素扩充触控热区');
assert.match(completeServiceWxss, /\.chip\.airbnb-chip\.chip-active\s*\{[^}]*background:\s*var\(--nb-action\);[\s\S]*color:\s*var\(--nb-inverse\);/s, '完成服务胶囊激活态必须为石墨黑底色反白字');

// 11. 美甲师端排期阻断原因胶囊
const scheduleWxss = read('pages/technician/schedule/index.wxss');
assert.match(scheduleWxss, /\.reason-chip\s*\{[^}]*height:\s*54rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '排期设置原因胶囊必须为 54rpx Airbnb Filter Chip');
assert.match(scheduleWxss, /\.reason-chip::after\s*\{[^}]*content:\s*'';[^}]*top:\s*-16rpx;[^}]*bottom:\s*-16rpx;/s, '筛选胶囊保留紧凑外观并通过伪元素扩充触控热区');
assert.match(scheduleWxss, /\.reason-chip\.chip-active\s*\{[^}]*background:\s*var\(--nb-action\);[\s\S]*color:\s*var\(--nb-inverse\);/s, '排期设置原因胶囊激活态必须为石墨黑底色反白字');

// 12. 客户端与美甲师端拒绝/取消原因胶囊
const clientOrderDetailWxss = read('pages/client/order-detail/index.wxss');
assert.match(clientOrderDetailWxss, /\.reason-chip\s*\{[^}]*height:\s*54rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '客户订单详情原因胶囊必须为 54rpx Airbnb Filter Chip');
assert.match(clientOrderDetailWxss, /\.reason-chip::after\s*\{[^}]*content:\s*'';[^}]*top:\s*-16rpx;[^}]*bottom:\s*-16rpx;/s, '筛选胶囊保留紧凑外观并通过伪元素扩充触控热区');

const techOrderDetailWxss = read('pages/technician/order-detail/index.wxss');
assert.match(techOrderDetailWxss, /\.reason-chip\s*\{[^}]*height:\s*54rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '美甲师订单详情原因胶囊必须为 54rpx Airbnb Filter Chip');
assert.match(techOrderDetailWxss, /\.reason-chip::after\s*\{[^}]*content:\s*'';[^}]*top:\s*-16rpx;[^}]*bottom:\s*-16rpx;/s, '筛选胶囊保留紧凑外观并通过伪元素扩充触控热区');

// 13. 美甲师端标签管理
const tagMgmtWxss = read('pages/technician/tag-management/index.wxss');
assert.match(tagMgmtWxss, /\.tag-chip\s*\{[^}]*height:\s*54rpx;[^}]*border-radius:\s*var\(--radius-full\);[^}]*background:\s*var\(--nb-page\);/s, '标签管理页标签胶囊必须为 54rpx Airbnb Filter Chip');
assert.match(tagMgmtWxss, /\.tag-chip::after\s*\{[^}]*content:\s*'';[^}]*top:\s*-16rpx;[^}]*bottom:\s*-16rpx;/s, '筛选胶囊保留紧凑外观并通过伪元素扩充触控热区');
console.log('Airbnb Filter Chip 全量双端胶囊标签与筛选按钮统一规范专项验证全部通过 (14/14 项测试)！');
