/**
 * 统一预约操作布局与优先级解析器。
 */
function resolveActionLayout(actions) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return {
      visibleActions: [],
      overflowActions: [],
      hasMore: false,
      totalCount: 0
    };
  }

  const sorted = [...actions].sort((a, b) => {
    const pa = a && typeof a.priority === 'number' ? a.priority : 99;
    const pb = b && typeof b.priority === 'number' ? b.priority : 99;
    return pa - pb;
  });

  if (sorted.length <= 3) {
    return {
      visibleActions: sorted,
      overflowActions: [],
      hasMore: false,
      totalCount: sorted.length
    };
  }

  return {
    visibleActions: [
      sorted[0],
      sorted[1],
      {
        key: '__more__',
        label: '更多',
        style: 'action-secondary action-more-trigger',
        isMore: true,
        priority: 999
      }
    ],
    overflowActions: sorted.slice(2),
    hasMore: true,
    totalCount: sorted.length
  };
}

module.exports = {
  resolveActionLayout
};
