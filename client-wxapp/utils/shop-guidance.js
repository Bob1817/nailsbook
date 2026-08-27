function createBlockId(prefix, index) {
  return String(prefix || 'block') + '-' + Date.now() + '-' + String(index || 0) + '-' + Math.random().toString(36).slice(2, 7);
}

function normalizeGuidanceSection(section, prefix) {
  const value = section && typeof section === 'object' ? section : {};
  let blocks = Array.isArray(value.blocks) ? value.blocks.map((block, index) => {
    if (!block || (block.type !== 'text' && block.type !== 'image')) return null;
    const content = block.type === 'text' ? String(block.text || '') : String(block.url || '');
    if (!content.trim()) return null;
    return block.type === 'text'
      ? { id: String(block.id || createBlockId(prefix, index)), type: 'text', text: content }
      : { id: String(block.id || createBlockId(prefix, index)), type: 'image', url: content };
  }).filter(Boolean) : [];

  if (!blocks.length) {
    if (typeof value.text === 'string' && value.text.trim()) {
      blocks.push({ id: createBlockId(prefix, 0), type: 'text', text: value.text });
    }
    (Array.isArray(value.images) ? value.images : []).filter(Boolean).forEach((url, index) => {
      blocks.push({ id: createBlockId(prefix, index + 1), type: 'image', url: String(url) });
    });
  }

  return { blocks };
}

function serializeGuidanceSection(section) {
  const normalized = normalizeGuidanceSection(section, 'save');
  const blocks = normalized.blocks.map((block) => ({ ...block }));
  return {
    blocks,
    text: blocks.filter((block) => block.type === 'text').map((block) => block.text).join('\n'),
    images: blocks.filter((block) => block.type === 'image').map((block) => block.url)
  };
}

module.exports = { createBlockId, normalizeGuidanceSection, serializeGuidanceSection };
