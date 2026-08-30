# Fuwari in VitePress PoC

This directory is an isolated Astro-to-Vue port based on Typelin's Fuwari fork
commit `33083ec485268e44b349e2efba6b22f048629e77` (2026-08-30 snapshot), which
itself is based on saicaca/fuwari.

Source mapping:

- `components/FuwariBlog.vue` + `HeroBanner.vue` ← `src/layouts/MainGridLayout.astro`;
  Typelin's disabled Banner is retained, while the background remains owned by
  this site's existing VitePress theme selector instead of a copied random API
- `components/PostCard.vue` ← `src/components/PostCard.astro`
- `components/PostMeta.vue` ← `src/components/PostMeta.astro`
- `components/Profile.vue` ← `src/components/widget/Profile.astro`
- `components/SideBar.vue` ← `src/components/widget/SideBar.astro`
- `components/WidgetLayout.vue` ← `src/components/widget/WidgetLayout.astro`
- `utils/date-utils.ts` ← `src/utils/date-utils.ts`
- `styles/fuwari.css` ← the relevant Tailwind classes plus `src/styles/main.css`
  and `src/styles/variables.styl`, rewritten under `.fuwari-blog`.

Astro routing, the Astro Navbar, Swup, Content Collections and global CSS are
intentionally not copied. VitePress owns the route, real Default Theme Navbar,
theme state and base URL. Typelin-only counters, schedule widgets and the third
column are outside this first PoC. See `LICENSE.Fuwari.txt` for the MIT license.
