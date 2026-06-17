"""Gera favicon e ícones PWA a partir de public/logo-clutchclube.png"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SOURCE = PUBLIC / "logo-clutchclube.png"

SIZES = {
    "favicon.ico": [(16, 16), (32, 32), (48, 48)],
    "icon1.png": (96, 96),
    "apple-icon.png": (180, 180),
    "web-app-manifest-192x192.png": (192, 192),
    "web-app-manifest-512x512.png": (512, 512),
}


def load_square_logo() -> Image.Image:
    src = Image.open(SOURCE).convert("RGBA")
    w, h = src.size
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 255))
    canvas.paste(src, ((side - w) // 2, (side - h) // 2), src)
    return canvas


def resize(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    return img.resize(size, Image.Resampling.LANCZOS)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing source: {SOURCE}")

    square = load_square_logo()

    ico_images = [resize(square, s) for s in SIZES["favicon.ico"]]
    ico_path = PUBLIC / "favicon.ico"
    ico_images[0].save(
        ico_path,
        format="ICO",
        sizes=SIZES["favicon.ico"],
        append_images=ico_images[1:],
    )
    print(f"[generate-favicons] {ico_path.name}")

    for name, size in SIZES.items():
        if name == "favicon.ico":
            continue
        out = PUBLIC / name
        resize(square, size).save(out, format="PNG", optimize=True)
        print(f"[generate-favicons] {name} ({size[0]}x{size[1]})")


if __name__ == "__main__":
    main()
