const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Process-wide scheduler for the standalone Windows importer. This is only a
 * local safety cap; Production uses the shared Durable Object limiter in the
 * Pages/Worker path. Every retry also consumes a slot.
 */
export const createLocalNexonRateLimiter = (ratePerSecond) => {
  const interval = 1_000 / Math.max(1, ratePerSecond);
  let nextAllowedAt = 0;
  let tail = Promise.resolve();
  return {
    acquire: async () => {
      const turn = tail.then(async () => {
        const now = Date.now();
        const scheduled = Math.max(now, nextAllowedAt);
        nextAllowedAt = scheduled + interval;
        const delay = scheduled - now;
        if (delay > 0) await wait(delay);
      });
      tail = turn.then(() => undefined, () => undefined);
      await turn;
    },
  };
};
