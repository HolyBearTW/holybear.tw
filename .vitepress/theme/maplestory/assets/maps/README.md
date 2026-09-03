The numbered WebP files are fixed `160x216` equipment-area scene crops. Newer
files are cropped from clean in-game screenshots by
`scripts/crop-maple-map-screenshots.py`; their selected walkable surface is
aligned near output y=171 to match the rendered character's visible sole. Most
source boxes are exactly `160x216` and are never resized. The Mercedes scene uses
a proportional `260x351` crop to center the cherry tree, while the Moxuan scene
uses a proportional `280x378` crop to keep both the emblem and the grass in
frame; neither approved exception is stretched.

Original PNG screenshots are retained locally under
`scripts/map-scene-sources/` and ignored by Git so they are not bundled by the
eager MapleStory asset loader. The numbered WebP files are the deployed assets.

MapleStory media and related game content are the property of NEXON.
