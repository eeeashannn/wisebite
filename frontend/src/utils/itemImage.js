/**
 * Placeholders for items without images: use first letter of name or category.
 */
const CATEGORY_LETTER = {
  Dairy: 'D',
  Meat: 'M',
  Vegetables: 'V',
  Fruits: 'F',
  Bakery: 'B',
  Pantry: 'P',
  Beverages: 'B',
  Frozen: 'F',
  Snacks: 'S',
  Other: '?',
};

export function getItemDisplay(item) {
  if (item?.image_url) {
    return { type: 'image', value: item.image_url };
  }
  const name = (item?.name || '').trim();
  const category = item?.category || 'Other';
  const letter = name ? name.charAt(0).toUpperCase() : (CATEGORY_LETTER[category] || '?');
  return { type: 'letter', value: letter };
}

export function getItemEmoji(item) {
  const d = getItemDisplay(item);
  return d.type === 'letter' ? d.value : (item?.name?.charAt(0)?.toUpperCase() || '?');
}
