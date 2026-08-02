export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: T[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== 'object') continue;
    let id = item.id;
    if (!id || seen.has(id)) {
      const newId = id ? `${id}_dup_${i}` : `item_${i}_${Math.random().toString(36).substring(2, 6)}`;
      result.push({ ...item, id: newId });
      seen.add(newId);
    } else {
      seen.add(id);
      result.push(item);
    }
  }
  return result;
}
