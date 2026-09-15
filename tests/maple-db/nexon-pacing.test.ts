import { describe, expect, it } from 'vitest';
import { runWithPacedConcurrency } from '../../functions/_shared/nexon-client';

describe('paced NEXON work', () => {
  it('limits in-flight work and spaces task starts globally', async () => {
    const starts: number[] = [];
    let active = 0;
    let maxActive = 0;
    const result = await runWithPacedConcurrency(
      [0, 1, 2, 3],
      2,
      20,
      async (value) => {
        starts[value] = Date.now();
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return value;
      },
    );
    expect(result.every((entry) => entry.status === 'fulfilled')).toBe(true);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(15);
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(15);
    expect(starts[3] - starts[2]).toBeGreaterThanOrEqual(15);
  });
});
