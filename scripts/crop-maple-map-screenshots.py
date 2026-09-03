from __future__ import annotations

import argparse
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_DIR = REPO_ROOT / "scripts/map-scene-sources"
SOURCE_FALLBACK_DIR = REPO_ROOT / ".vitepress/theme/maplestory/assets/maps"
DEFAULT_OUTPUT_DIR = REPO_ROOT / ".vitepress/theme/maplestory/assets/maps"
OUTPUT_SIZE = (160, 216)


@dataclass(frozen=True)
class SceneCrop:
    map_id: str
    source_name: str
    crop_box: tuple[int, int, int, int]
    resize_to_output: bool = False


# Every scene places the selected walkable surface near y=171, matching the
# visible sole of the rendered 96px character at the desktop equipment-grid
# scale. Most output pixels are cropped directly from the source screenshot;
# explicitly approved wider views keep the 20:27 ratio before downscaling.
SCENE_CROPS = (
    SceneCrop("100000000", "弓箭手村.png", (86, 234, 246, 450)),
    SceneCrop("100051000", "開拓者帕爾達.png", (104, 259, 264, 475)),
    SceneCrop("101000000", "魔法森林.png", (125, 80, 285, 296)),
    SceneCrop("101000200", "夜光塞雷尼提.png", (194, 388, 354, 604)),
    # Center the character on the cherry-tree trunk and use the flat top step.
    SceneCrop("101050000", "櫻花處.png", (170, 171, 430, 522), True),
    SceneCrop("102000000", "勇士之村.png", (220, 185, 380, 401)),
    # Keep the pineapple graffiti centered above the walkable brick ledge.
    SceneCrop("103000000", "墮落城市.png", (2516, 1063, 2676, 1279)),
    SceneCrop("103050100", "影武者墮落城市後街.png", (90, 50, 250, 266)),
    SceneCrop("120000000", "鯨魚號.png", (30, 70, 190, 286)),
    SceneCrop("130000000", "皇家騎士團耶雷弗.png", (103, 107, 263, 323)),
    SceneCrop("140000000", "狂狼勇士瑞恩村.png", (134, 104, 294, 320)),
    SceneCrop("150000000", "幻影俠盜水晶花園.png", (180, 157, 340, 373)),
    SceneCrop("3000300", "重砲指揮官可可島.png", (96, 147, 256, 363)),
    SceneCrop("310000000", "末日反抗軍埃德爾斯坦.png", (75, 202, 235, 418)),
    SceneCrop("320000000", "神之子神殿.png", (102, 161, 262, 377)),
    SceneCrop("331000000", "凱內西斯秘密據點.png", (98, 203, 258, 419)),
    SceneCrop("402000000", "卡蒂娜野蠻之星.png", (230, 351, 390, 567)),
    SceneCrop("402000500", "伊利恩亞修羅姆.png", (200, 229, 360, 445)),
    SceneCrop("402000600", "亞克避難處.png", (90, 226, 250, 442)),
    SceneCrop("410000000", "隱月尖耳狐狸村.png", (340, 263, 500, 479)),
    SceneCrop("410000200", "虎影.png", (230, 202, 390, 418)),
    SceneCrop("410000300", "阿戴爾.png", (160, 285, 320, 501)),
    SceneCrop("410000402", "凱殷.png", (95, 151, 255, 367)),
    SceneCrop("410004000", "菈菈.png", (85, 201, 245, 417)),
    # Keep the horizontal stone ledge at the shared y=171 foothold while placing
    # the character beneath the parasol without centering the parasol post.
    SceneCrop("410004100", "蓮.png", (24, 60, 184, 276)),
    SceneCrop("410007500", "卡莉.png", (119, 213, 279, 429)),
    SceneCrop("807000000", "劍豪陰陽師.png", (124, 200, 284, 416)),
    # The emblem and grass are farther apart than 216 source pixels, so crop a
    # matching 20:27 region and downscale it proportionally without stretching.
    SceneCrop("875000000", "墨玄.png", (88, 191, 368, 569), True),
    SceneCrop("875010000", "琳恩.png", (270, 231, 430, 447)),
)


def crop_scenes(source_dir: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    for scene in SCENE_CROPS:
        source_path = source_dir / scene.source_name
        if not source_path.is_file():
            source_path = SOURCE_FALLBACK_DIR / scene.source_name
        if not source_path.is_file():
            raise FileNotFoundError(f"Missing source screenshot: {source_path}")

        with Image.open(source_path) as source:
            source = source.convert("RGB")
            left, top, right, bottom = scene.crop_box
            if left < 0 or top < 0 or right > source.width or bottom > source.height:
                raise ValueError(
                    f"Crop {scene.crop_box} exceeds {scene.source_name} "
                    f"({source.width}x{source.height})"
                )

            cropped = source.crop(scene.crop_box)
            if scene.resize_to_output:
                if cropped.width * OUTPUT_SIZE[1] != cropped.height * OUTPUT_SIZE[0]:
                    raise ValueError(
                        f"Resize crop {scene.crop_box} for {scene.source_name} "
                        f"does not match the {OUTPUT_SIZE[0]}:{OUTPUT_SIZE[1]} aspect ratio"
                    )
                cropped = cropped.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
            elif cropped.size != OUTPUT_SIZE:
                raise ValueError(
                    f"Crop {scene.crop_box} for {scene.source_name} is "
                    f"{cropped.width}x{cropped.height}; expected {OUTPUT_SIZE[0]}x{OUTPUT_SIZE[1]}"
                )
            output_path = output_dir / f"{scene.map_id}.webp"
            encoded = BytesIO()
            cropped.save(encoded, "WEBP", quality=92, method=6)
            output_bytes = encoded.getvalue()
            if output_path.is_file() and output_path.read_bytes() == output_bytes:
                print(f"unchanged: {output_path.name}")
                continue

            output_path.write_bytes(output_bytes)
            print(f"updated: {scene.source_name} -> {output_path.name} {OUTPUT_SIZE[0]}x{OUTPUT_SIZE[1]}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Crop user-captured MapleStory map scenes.")
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()
    crop_scenes(args.source_dir.resolve(), args.output_dir.resolve())


if __name__ == "__main__":
    main()
