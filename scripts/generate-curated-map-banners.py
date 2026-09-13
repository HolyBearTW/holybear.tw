"""Generate the manually curated banner replacements for the sparse GMS renders.

The regular downloader remains responsible for the other map IDs.  These eleven
IDs use complete, recognizable in-game/official scenes and explicit crop windows
so a rerun cannot select a random transparent map object as the banner subject.
"""
from __future__ import annotations

import re
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / ".vitepress/theme/maplestory/assets/map-banners"
LOCAL_SCENES = ROOT / "scripts/map-scene-sources"
OUTPUT_SIZE = (896, 256)
REMOTE = {
    "100030102": "https://upload3.inven.co.kr/upload/2022/06/14/bbs/i16021697930.png?MW=800",
    "101050000": "https://nxcache.nexon.net/maplestory/legends/img/screenshots/mercedes-ss3-full.jpg",
    "410000200": "https://g.nexonstatic.com/maplestory/micro-site/assets/img/main-bg.c0483e29.webp",
    "130000000": "https://upload3.inven.co.kr/upload/2023/12/02/bbs/i15296270533.png?MW=800",
    "410004000": "https://g.nexonstatic.com/maplestory/micro-site/assets/img/thumb-1.b9cb42a5.webp",
    "400000000": "https://cdn.gamemeca.com/trees/0001/631/032/20200430_oldbie76.jpg",
    "410004100": "https://peak-file.nexon.com/uploads/20251228_0243_42b-7988-4900-b446-defeb535a846",
}
LOCAL = {
    "100000000": "弓箭手村.png",
    "120000000": "鯨魚號.png",
    "150000000": "幻影俠盜水晶花園.png",
}
USER_SOURCES = {
    # The original Evan minimap was supplied under a reused filename and is
    # intentionally not read again when that desktop file is replaced by a
    # later upload. The existing generated banner is preserved instead.
    "100030102": Path(r"C:\Users\HolyBear\Desktop\miniMap-evan.canvas.png"),
    "100051000": Path(r"C:\Users\HolyBear\Desktop\canvas.png"),
    "101050000": Path(r"C:\Users\HolyBear\AppData\Local\Temp\codex-clipboard-c28dfa98-44e5-4937-83ef-58c06a68108f.png"),
    "130000000": Path(r"C:\Users\HolyBear\AppData\Local\Temp\codex-clipboard-f31716f4-5709-4460-9796-c294997fbc9e.png"),
    "410000200": Path(r"C:\Users\HolyBear\Desktop\miniMap.canvas2.png"),
    "410004100": Path(r"C:\Users\HolyBear\Desktop\miniMap.canvas3.png"),
    "410004000": Path(r"C:\Users\HolyBear\Desktop\miniMap.canvas4.png"),
    "410000402": Path(r"C:\Users\HolyBear\Desktop\miniMap.canvas5.png"),
    "875010000": Path(r"C:\Users\HolyBear\Desktop\miniMap.canvas6.png"),
    "400000000": Path(r"C:\Users\HolyBear\Desktop\miniMap.canvas7.png"),
    "402000500": Path(r"C:\Users\HolyBear\Desktop\miniMap.canvas.png"),
    "331000000": Path(r"C:\Users\HolyBear\AppData\Local\Temp\codex-clipboard-26747119-f6bd-4b21-8c4f-c050a274aef3.png"),
}
# (left, top, right, bottom) in source pixels.  All windows are deliberately
# wide enough to preserve the landmark while excluding game UI where possible.
CROPS = {
    "100000000": (0, 142, 331, 236),
    "100030102": (0, 175, 420, 295),
    "101050000": (0, 94, 750, 308),
    "120000000": (0, 105, 253, 177),
    "130000000": (0, 60, 800, 289),
    "150000000": (0, 155, 415, 274),
    "400000000": (0, 274, 660, 463),
    "410000200": (0, 92, 480, 229),
    "410004000": (0, 47, 580, 213),
    "410004100": (0, 72, 800, 301),
}
CURATED_USER_SCENE_IDS = set(USER_SOURCES)
CURATED_EXTRA_IDS = {"100051000", "410000402", "875010000", "402000500", "331000000"}
USER_CROP_BOXES = {
    # Keep the Elluel tree and central shrine in frame instead of spending the
    # banner width on the blue forest at the far left of the supplied image.
    "101050000": (150, 80, 1100, 351),
    # The supplied Ereve screenshot's Divine Bird face sits in the lower half;
    # keep that landmark visible in the wide banner.
    "130000000": (0, 290, 835, 519),
    # Keep Kinesis's couch, lamp, shelves, and night skyline while removing
    # the excess ceiling/floor from the supplied 767x337 scene.
    "331000000": (0, 87, 767, 306),
}


def fetch(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "HolyBearTW curated map banner generator"})
    with urlopen(request, timeout=60) as response:
        return response.read()


def download_ark_scene() -> Image.Image:
    """Composite the official Ark scene 07 layers from the Nexon microsite."""
    css_url = "https://g.nexonstatic.com/maplestory/micro-site/assets/css/microsite-ark.b29eaf68.css"
    base = "https://g.nexonstatic.com/maplestory/micro-site/assets/img/"
    css = fetch(css_url).decode("utf-8")
    names = dict(re.findall(r"scene-07-(bg|mg|fg)\.([a-z0-9]+\.(?:png|webp))", css))
    if not names:
        raise RuntimeError("Could not locate Ark scene 07 assets in official CSS")
    canvas = None
    for layer_name in ("bg", "mg", "fg"):
        filename = names.get(layer_name)
        if not filename:
            continue
        with Image.open(BytesIO(fetch(f"{base}scene-07-{layer_name}.{filename}"))) as opened:
            layer = opened.convert("RGBA")
        if canvas is None:
            canvas = Image.new("RGBA", layer.size)
        canvas.alpha_composite(layer)
    if canvas is None:
        raise RuntimeError("Ark scene 07 had no image layers")
    return canvas.convert("RGB")


def source_image(map_id: str) -> Image.Image:
    if map_id == "402000600":
        return download_ark_scene()
    user_source = USER_SOURCES.get(map_id)
    if user_source is not None and user_source.exists():
        return Image.open(user_source).convert("RGBA")
    if map_id in LOCAL:
        path = LOCAL_SCENES / LOCAL[map_id]
        if not path.exists():
            raise FileNotFoundError(f"Missing local source scene: {path}")
        return Image.open(path).convert("RGB")
    return Image.open(BytesIO(fetch(REMOTE[map_id]))).convert("RGB")


def crop_banner(source: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    left, top, right, bottom = box
    left = max(0, min(left, source.width - 1))
    top = max(0, min(top, source.height - 1))
    right = max(left + 1, min(right, source.width))
    bottom = max(top + 1, min(bottom, source.height))
    cropped = source.crop((left, top, right, bottom))
    return cropped.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)


def full_width_banner(source: Image.Image) -> Image.Image:
    """Scale a supplied minimap to the full banner width, cropping only height.

    This removes the side bars introduced by a contain fit.  Wide minimaps keep
    their complete horizontal landmark and use the existing banner background
    above/below; narrow minimaps are cropped vertically after proportional scale.
    """
    if "A" in source.getbands():
        alpha_bounds = source.getchannel("A").getbbox()
        if alpha_bounds is not None:
            source = source.crop(alpha_bounds)
    scaled_height = round(source.height * OUTPUT_SIZE[0] / source.width)
    resized = source.resize((OUTPUT_SIZE[0], scaled_height), Image.Resampling.NEAREST)
    if scaled_height <= OUTPUT_SIZE[1]:
        canvas = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
        canvas.alpha_composite(resized, (0, (OUTPUT_SIZE[1] - scaled_height) // 2))
        return canvas
    top = (scaled_height - OUTPUT_SIZE[1]) // 2
    return resized.crop((0, top, OUTPUT_SIZE[0], top + OUTPUT_SIZE[1]))


def crop_box(map_id: str, source: Image.Image) -> tuple[int, int, int, int]:
    if map_id == "402000600":
        # Official Ark scene 07 is already a full landscape; keep its central
        # purple-crystal ruins as the landmark.
        return (0, 170, source.width, 719)
    if map_id == "410000200" and source.width > 1000:
        # Fallback to the official microsite when the user's supplied crop is
        # not available in a fresh checkout.
        return (0, 220, source.width, 769)
    return CROPS[map_id]


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    map_ids = [*LOCAL, "402000600", *REMOTE, *CURATED_EXTRA_IDS]
    # Preserve insertion order while removing the Ark/remote overlap.
    map_ids = list(dict.fromkeys(map_ids))
    for map_id in map_ids:
        user_source = USER_SOURCES.get(map_id)
        if user_source is not None and not user_source.exists():
            print(f"preserved {map_id}: supplied source is unavailable ({user_source})", flush=True)
            continue
        source = source_image(map_id)
        try:
            if map_id in USER_CROP_BOXES:
                banner = crop_banner(source, USER_CROP_BOXES[map_id])
            elif map_id in CURATED_USER_SCENE_IDS:
                banner = full_width_banner(source)
            else:
                banner = crop_banner(source, crop_box(map_id, source))
            output_path = OUTPUT_DIR / f"{map_id}.webp"
            banner.save(output_path, "WEBP", quality=86, method=6, exact=True)
            print(f"saved {map_id}: {source.width}x{source.height} -> {output_path.stat().st_size:,} bytes", flush=True)
        finally:
            source.close()


if __name__ == "__main__":
    main()
