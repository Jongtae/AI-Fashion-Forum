#!/usr/bin/env python3
"""
build-agent-avatars.py

Create a local avatar pool for agent identities by cropping the existing
openai-outfit-preview-poc images into square profile images.

Usage:
  python3 scripts/build-agent-avatars.py
  python3 scripts/build-agent-avatars.py --source-dir apps/forum-web/public/openai-outfit-preview-poc --output-dir apps/forum-web/public/agent-avatars
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageOps


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source-dir",
        default="apps/forum-web/public/openai-outfit-preview-poc",
        help="Directory containing source images",
    )
    parser.add_argument(
        "--output-dir",
        default="apps/forum-web/public/agent-avatars",
        help="Directory to write avatar crops",
    )
    return parser.parse_args()


def crop_avatar(image: Image.Image) -> Image.Image:
    width, height = image.size
    target_size = min(width, height)

    # Slightly bias the crop toward the upper portion so faces are more likely
    # to stay inside the avatar frame for portrait-style outfit images.
    center_x = width / 2
    center_y = height * 0.34
    left = max(0, min(width - target_size, int(round(center_x - target_size / 2))))
    top = max(0, min(height - target_size, int(round(center_y - target_size / 2))))
    right = left + target_size
    bottom = top + target_size
    cropped = image.crop((left, top, right, bottom))
    return ImageOps.fit(cropped, (512, 512), method=Image.Resampling.LANCZOS)


def main() -> None:
    args = parse_args()
    source_dir = Path(args.source_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    source_files = sorted(source_dir.glob("*.png"))
    if not source_files:
        raise SystemExit(f"No source images found in {source_dir}")

    written = 0
    for index, source_file in enumerate(source_files, start=1):
        with Image.open(source_file) as image:
            avatar = crop_avatar(image.convert("RGB"))
            output_path = output_dir / f"agent-avatar-{index:02d}.png"
            avatar.save(output_path, format="PNG", optimize=True)
            written += 1

    print(f"[build-agent-avatars] wrote {written} avatar files to {output_dir}")


if __name__ == "__main__":
    main()
