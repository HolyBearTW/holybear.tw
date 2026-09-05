import { describe, expect, it } from 'vitest';
import { assertAllowedBrowserOrigin, buildNexonProxyTarget } from '../../functions/_shared/nexon-proxy';

describe('NEXON browser proxy guard', () => {
  it('allows the expected character lookup parameters', () => {
    const target = buildNexonProxyTarget(
      'id',
      new URL('https://holybear.tw/api/nexon/id?character_name=%E6%B8%AC%E8%A9%A6%E8%A7%92%E8%89%B2'),
    );
    expect(target.origin).toBe('https://open.api.nexon.com');
    expect(target.searchParams.get('character_name')).toBe('測試角色');
  });

  it('rejects unsupported and duplicated query parameters', () => {
    expect(() => buildNexonProxyTarget(
      'character/basic',
      new URL('https://holybear.tw/api/nexon/character/basic?ocid=abcdefghijklmnop&redirect=https://example.com'),
    )).toThrow('不支援的查詢參數');
    expect(() => buildNexonProxyTarget(
      'id',
      new URL('https://holybear.tw/api/nexon/id?character_name=a&character_name=b'),
    )).toThrow('查詢參數不可重複');
  });

  it('rejects cross-origin browser requests', () => {
    const request = new Request('https://holybear.tw/api/nexon/id?character_name=test', {
      headers: { origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' },
    });
    expect(() => assertAllowedBrowserOrigin(request)).toThrow('不允許跨站呼叫');
  });
});
