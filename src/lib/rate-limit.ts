type RateEntry = {
  count: number;
  expires: number;
};

const bucket = new Map<string, RateEntry>();

export function assertRateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const entry = bucket.get(key);
  if (!entry || entry.expires < now) {
    bucket.set(key, { count: 1, expires: now + windowMs });
    return;
  }
  if (entry.count >= limit) {
    throw new Error("Слишком много запросов. Попробуйте позже.");
  }
  entry.count += 1;
}
