const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** One serialized scheduler for the MapleStoryTaiwan NEXON application key. */
export class NexonRateLimiter {
  private tail: Promise<void> = Promise.resolve();

  constructor(private readonly state: DurableObjectState) {}

  private async issue(ratePerSecond: number) {
    const interval = 1_000 / ratePerSecond;
    const now = Date.now();
    const stored = await this.state.storage.get<number>('nextAllowedAt');
    const nextAllowedAt = Math.max(now, Number(stored) || now);
    await this.state.storage.put('nextAllowedAt', nextAllowedAt + interval);
    const waitMs = Math.max(0, nextAllowedAt - now);
    if (waitMs > 0) await sleep(waitMs);
    return Response.json({ waitMs });
  }

  async fetch(request: Request) {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/acquire') {
      return new Response('Not found', { status: 404 });
    }
    const body = await request.json().catch(() => ({})) as { ratePerSecond?: unknown };
    const ratePerSecond = Number(body.ratePerSecond);
    if (!Number.isFinite(ratePerSecond) || ratePerSecond < 1 || ratePerSecond > 450) {
      return Response.json({ error: 'invalid_rate' }, { status: 400 });
    }

    // Durable Object instances serialize this promise chain. Persisting the
    // next slot also prevents a restart from losing the last scheduled time.
    const result = this.tail.then(() => this.issue(ratePerSecond));
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }
}

export default {
  fetch: () => new Response('Not found', { status: 404 }),
};
