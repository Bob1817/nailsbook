/**
 * 作品瀑布流布局
 *
 * 卡片宽度 = (内容区宽度 - 列间距) / 列数，在区间内浮动；超过 MAX_CARD_WIDTH_PX 时增加一列。
 * 内容区内边距与列间距沿用页面自身的 rpx 数值，保证与页面其他卡片对齐。
 * 作品按封面真实宽高估算卡片高度，逐项放入当前最矮的列，形成小红书式错落瀑布流。
 */
var MIN_COLUMNS = 2;
var MAX_COLUMNS = 6;
var MIN_CARD_WIDTH_PX = 160; // 作品卡片最小推荐宽度（手机端基准：2 列）
var MAX_CARD_WIDTH_PX = 240; // 作品卡片最大推荐宽度（超过时应考虑增加列数）
var DEFAULT_PADDING_RPX = 28;
var DEFAULT_GAP_RPX = 20;
var DEFAULT_COVER_RATIO = 1.15;
var CARD_COPY_HEIGHT_PX = 80;

function windowWidth() {
  try {
    if (wx.getWindowInfo) return wx.getWindowInfo().windowWidth || 375;
  } catch (e) {}
  try {
    return wx.getSystemInfoSync().windowWidth || 375;
  } catch (e) {}
  return 375;
}

/**
 * 依据窗口宽度计算列数与列宽。
 * 规则：
 * 1. 同一屏幕内所有作品卡片宽度完全相同；
 * 2. 屏幕宽度增加时，卡片宽度在合理区间内适当增加；
 * 3. 当可用宽度大于容纳下一列的最小卡片宽度时，增加一列，以此类推。
 * options: { windowWidth, paddingRpx, gapRpx, minCardWidth, maxCardWidth }
 */
function getLayout(options) {
  options = options || {};
  var winWidth = Number(options.windowWidth) > 0 ? Number(options.windowWidth) : windowWidth();
  var paddingRpx = Number(options.paddingRpx) > 0 ? Number(options.paddingRpx) : DEFAULT_PADDING_RPX;
  var gapRpx = Number(options.gapRpx) > 0 ? Number(options.gapRpx) : DEFAULT_GAP_RPX;
  var minCardWidthPx = Number(options.minCardWidth) > 0 ? Number(options.minCardWidth) : MIN_CARD_WIDTH_PX;
  var maxCardWidthPx = Number(options.maxCardWidth) > 0 ? Number(options.maxCardWidth) : MAX_CARD_WIDTH_PX;
  var minColumns = Number(options.minColumns) > 0 ? Number(options.minColumns) : MIN_COLUMNS;
  var maxColumns = Number(options.maxColumns) > 0 ? Number(options.maxColumns) : MAX_COLUMNS;

  var pxPerRpx = winWidth / 750;
  var padding = paddingRpx * pxPerRpx;
  var gap = gapRpx * pxPerRpx;
  var available = Math.max(0, winWidth - padding * 2);

  var columns = minColumns;
  var columnWidth = (available - gap * (columns - 1)) / columns;

  // 当屏幕宽度增大，且可用宽度足以容纳额外一列（保证每列宽度 >= 最小卡片宽度）时，增加一列
  while (columns < maxColumns) {
    var nextColumns = columns + 1;
    var nextColWidth = (available - gap * (nextColumns - 1)) / nextColumns;
    if (nextColWidth >= minCardWidthPx && (columnWidth > maxCardWidthPx || (available + gap) / (minCardWidthPx + gap) >= nextColumns)) {
      columns = nextColumns;
      columnWidth = nextColWidth;
    } else {
      break;
    }
  }

  return {
    columns: columns,
    columnWidth: columnWidth,
    availableWidth: available,
    gap: gap
  };
}

/**
 * 依据作品封面真实宽高计算宽高比（height / width）。
 * 限制在 [0.75, 1.45] 之间（即 4:3 宽图到 3:4.35 竖图），符合小红书错落瀑布流标准，避免极端狭长。
 */
function coverRatio(work) {
  var width = Number(work && (work.coverWidth || work.imageWidth || (work.cover && work.cover.width)));
  var height = Number(work && (work.coverHeight || work.imageHeight || (work.cover && work.cover.height)));
  if (!(width > 0) || !(height > 0)) return DEFAULT_COVER_RATIO;
  return Math.min(1.45, Math.max(0.75, height / width));
}

/** 将作品逐项放入当前最矮的列（贪心平衡瀑布流算法） */
function buildColumns(works, layout) {
  var columns = Math.max(1, (layout && layout.columns) || MIN_COLUMNS);
  var columnWidth = (layout && layout.columnWidth) || 168;
  var cols = [];
  var heights = [];
  var i;
  for (i = 0; i < columns; i += 1) {
    cols.push({ id: i, items: [] });
    heights.push(0);
  }
  (works || []).forEach(function (work) {
    var target = 0;
    for (i = 1; i < heights.length; i += 1) {
      if (heights[i] < heights[target]) target = i;
    }
    cols[target].items.push(work);
    var copyHeight = CARD_COPY_HEIGHT_PX;
    if (work && (work.description || (work.tags && work.tags.length))) {
      copyHeight += 24;
    }
    heights[target] += columnWidth * coverRatio(work) + copyHeight;
  });
  return cols;
}

module.exports = { getLayout, buildColumns };
