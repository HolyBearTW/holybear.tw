// Keep static previews and local development from updating production counters.
// This is a client-side side-effect guard; Firestore rules remain authoritative.
const productionOrigins = new Set([
  'https://holybear.tw',
  'https://www.holybear.tw',
  'https://holybear-tw.pages.dev',
]);

export const canUseProductionCounters = () => typeof window !== 'undefined'
  && productionOrigins.has(window.location.origin);
