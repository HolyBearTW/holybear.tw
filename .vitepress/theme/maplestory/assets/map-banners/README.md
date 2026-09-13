The numbered WebP files are local `896x256` profile-banner scenes generated
by `scripts/download-map-banner-scenes.py`. The generator composites the
background and foreground layers from MapleStory.io's GMS map renders, selects
the densest visible `3.5:1` crop, and compresses it to WebP for reliable
first-load rendering without a runtime dependency on the remote map service.

Some valid GMS map records currently return a fully transparent render or an
unavailable endpoint. For those exact IDs, the generator falls back to the
site's existing, manually approved local scene instead of producing a blank
banner. The console output identifies every fallback when the script runs.

The following map IDs are curated separately by
`scripts/generate-curated-map-banners.py`:
`100000000`, `100030102`, `100051000`, `101050000`, `120000000`, `130000000`, `150000000`,
`400000000`, `402000500`, `402000600`, `410000200`, `410000402`, `410004000`,
`410004100`, `875010000`, and `331000000`. Their
source windows are fixed to recognizable landmarks (mushroom training tower,
Evan's farm, Pathfinders' starting scene, Mercedes' Elluel, Nautilus, Ereve, Crystal Garden, Pantheon, Ark's
crystal ruins, Illium's crystal city, Cheong-woon Valley, Kain's starting scene,
Lara's village map, Ren's town map, Lynn's village map, and Kinesis's secret base at night). The
regular downloader preserves these files so a bulk refresh cannot overwrite the
manual selections with sparse transparent map objects.

Curated references include the official [Mercedes microsite](https://nxcache.nexon.net/maplestory/legends/mercedes.html),
[Hoyoung microsite](https://www.nexon.com/maplestory/micro-site/glory),
[Lara microsite](https://www.nexon.com/maplestory/micro-site/laraonair),
[Ark microsite](https://www.nexon.com/maplestory/micro-site/ark), and [Ren article](https://peak.nexon.com/post/850),
plus in-game screenshots used for the classic towns.

MapleStory media and related game content are the property of NEXON.
