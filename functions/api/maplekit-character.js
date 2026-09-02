const MAPLEKIT_CHARACTER_API = 'https://maple-kit.com/api/character';
const CACHE_SECONDS = 15 * 60;

const jsonResponse = (body, status = 200, cacheControl = 'no-store') => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
  },
});

const normalizeMember = (member) => ({
  ocid: typeof member?.ocid === 'string' ? member.ocid : '',
  characterName: typeof member?.characterName === 'string' ? member.characterName : '',
  worldName: typeof member?.worldName === 'string' ? member.worldName : '',
  characterClass: typeof member?.characterClass === 'string' ? member.characterClass : '',
  characterLevel: Number.isFinite(Number(member?.characterLevel)) ? Number(member.characterLevel) : 0,
  characterImage: typeof member?.characterImage === 'string' ? member.characterImage : '',
  characterPower: typeof member?.characterPower === 'string' ? member.characterPower : String(member?.characterPower ?? '0'),
  maxCharacterPower: typeof member?.maxCharacterPower === 'string' ? member.maxCharacterPower : String(member?.maxCharacterPower ?? '0'),
  characterGuildName: typeof member?.characterGuildName === 'string' ? member.characterGuildName : null,
  characterDateCreate: typeof member?.characterDateCreate === 'string' ? member.characterDateCreate : null,
  isSelf: member?.isSelf === true,
  isResolved: member?.isResolved === true,
});

export async function onRequest({ request }) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const requestUrl = new URL(request.url);
  const characterName = requestUrl.searchParams.get('character_name')?.trim() ?? '';

  if (!characterName || Array.from(characterName).length > 24) {
    return jsonResponse({ error: '角色名稱格式不正確' }, 400);
  }

  const upstreamUrl = new URL(MAPLEKIT_CHARACTER_API);
  upstreamUrl.searchParams.set('character_name', characterName);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        Referer: `https://maple-kit.com/character/${encodeURIComponent(characterName)}`,
        'User-Agent': 'Mozilla/5.0 (compatible; HolyBearTW/1.0; +https://holybear.tw)',
      },
      cf: {
        cacheEverything: true,
        cacheTtl: CACHE_SECONDS,
      },
    });

    if (!upstreamResponse.ok) {
      return jsonResponse({ error: '分身資料來源目前無法使用' }, 502);
    }

    const payload = await upstreamResponse.json();
    const members = Array.isArray(payload?.aliasGroup?.members)
      ? payload.aliasGroup.members
          .map(normalizeMember)
          .filter((member) => member.characterName && member.isResolved)
      : [];

    return jsonResponse(
      {
        groupId: payload?.aliasGroup?.groupId ?? null,
        members,
      },
      200,
      `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
    );
  } catch (error) {
    console.error('MapleKit alias lookup failed', error);
    return jsonResponse({ error: '分身資料查詢失敗' }, 502);
  }
}
