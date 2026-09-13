const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Entry = { count: number; firstAt: number };

const attempts = new Map<string, Entry>();

function currentEntry(key: string) {
  const entry = attempts.get(key);
  if (!entry) return null;
  if (Date.now() - entry.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return null;
  }
  return entry;
}

export function isRateLimited(key: string) {
  const entry = currentEntry(key);
  return Boolean(entry && entry.count >= MAX_ATTEMPTS);
}

export function recordFailure(key: string) {
  const entry = currentEntry(key);
  if (!entry) {
    attempts.set(key, { count: 1, firstAt: Date.now() });
    return;
  }
  entry.count += 1;
}

export function clearFailures(key: string) {
  attempts.delete(key);
}
