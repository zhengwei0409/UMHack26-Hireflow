const processedMessageIds: Map<string, Set<number>> = new Map();

export function isUpdateProcessed(botToken: string, updateId: number): boolean {
  if (!updateId) return false;

  if (!processedMessageIds.has(botToken)) {
    processedMessageIds.set(botToken, new Set());
  }

  const processed = processedMessageIds.get(botToken)!;

  if (processed.has(updateId)) {
    return true;
  }

  processed.add(updateId);

  // Keep only last 100 processed IDs per bot
  if (processed.size > 100) {
    const iterator = processed.values();
    const firstValue = iterator.next();
    if (!firstValue.done) {
      processed.delete(firstValue.value);
    }
  }

  return false;
}
