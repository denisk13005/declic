"""Habille des captures brutes du téléphone en visuels de store (1080x1920, 9:16).

Usage : python make_screenshots.py <dossier_captures_brutes> <dossier_sortie> [fr|en]
Les captures brutes s'appellent 1_calories.png, 2_photo.png ... (voir SCREENS ci-dessous).
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
FONTS = {
    'black': 'C:/Windows/Fonts/seguibl.ttf',
    'semi': 'C:/Windows/Fonts/seguisb.ttf',
}

# nom du fichier brut -> (titre ligne 1, titre ligne 2 en orange, sous-titre)
SCREENS = {
    'fr': [
        ('1_calories', 'Tes calories et tes macros,', 'sans prise de tête', 'Anneaux, repas, objectifs : tout est clair'),
        ('2_photo', 'Cherche parmi', '60 000 aliments', 'Base Ciqual hors-ligne · photo IA, voix, code-barres'),
        ('3_habitudes', 'Des habitudes qui durent', 'grâce aux séries', 'Rappels flexibles et suivi au quotidien'),
        ('4_sport', 'Un programme de muscu', 'fait pour toi', 'Salle, maison ou poids du corps · 45 min minimum'),
        ('5_seance', 'Note tes séries,', 'bats tes records', 'Charges, répétitions et progression'),
        ('6_stats', 'Ta régularité', 'en un coup d\u2019œil', 'Séries, taux de réussite et graphiques 7 et 30 jours'),
    ],
    'en': [
        ('1_calories', 'Your calories and macros,', 'made simple', 'Rings, meals, goals: everything is clear'),
        ('2_photo', 'Search among', '60,000 foods', 'Offline Ciqual database · photo AI, voice, barcode'),
        ('3_habitudes', 'Habits that last', 'thanks to streaks', 'Flexible reminders, tracked every day'),
        ('4_sport', 'A strength program', 'made for you', 'Gym, home or bodyweight · 45 min minimum'),
        ('5_seance', 'Log your sets,', 'beat your records', 'Weights, reps and progress'),
        ('6_stats', 'Your progress', 'at a glance', 'Streaks, success rate and 7 and 30-day charts'),
    ],
}


def font(kind: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONTS[kind], size)


def background() -> Image.Image:
    bg = Image.new('RGB', (W, H), (10, 10, 15))
    px = bg.load()
    for y in range(H):
        t = y / H
        r, g, b = int(26 - 16 * t), int(16 - 6 * t), int(52 - 36 * t)
        for x in range(W):
            px[x, y] = (r, g, b)
    glow = Image.new('RGB', (W, H), (0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((-200, -380, 1280, 560), fill=(88, 40, 170))
    glow = glow.filter(ImageFilter.GaussianBlur(170))
    return Image.blend(bg, glow, 0.32)


def fit_text(draw: ImageDraw.ImageDraw, text: str, kind: str, size: int, max_w: int) -> ImageFont.FreeTypeFont:
    while size > 40 and draw.textlength(text, font=font(kind, size)) > max_w:
        size -= 2
    return font(kind, size)


def compose(raw_path: Path, line1: str, line2: str, sub: str, out_path: Path) -> None:
    img = background()
    d = ImageDraw.Draw(img)
    cx = W // 2
    # Titre
    f1 = fit_text(d, line1, 'black', 74, W - 120)
    f2 = fit_text(d, line2, 'black', 74, W - 120)
    d.text((cx, 96), line1, font=f1, fill=(255, 255, 255), anchor='mm')
    d.text((cx, 186), line2, font=f2, fill=(249, 115, 22), anchor='mm')
    fs = fit_text(d, sub, 'semi', 36, W - 140)
    d.text((cx, 262), sub, font=fs, fill=(190, 188, 210), anchor='mm')

    # Capture : sans barre d'état ni barre de navigation Android
    shot = Image.open(raw_path).convert('RGB')
    sw, sh = shot.size
    top, bottom = int(sh * 0.040), int(sh * 0.948)
    shot = shot.crop((0, top, sw, bottom))
    pw = 880
    ph = int(shot.height * pw / shot.width)
    shot = shot.resize((pw, ph), Image.LANCZOS)
    x, y = (W - pw) // 2, 330

    # Ombre + bord arrondi
    radius = 64
    mask = Image.new('L', (pw, ph), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, pw, ph + radius), radius=radius, fill=255)
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((x - 8, y - 8, x + pw + 8, y + ph + radius + 8), radius=radius + 8, fill=(0, 0, 0, 200))
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    img.paste(shadow, (0, 0), shadow)
    frame = Image.new('RGBA', (pw + 12, ph + 12), (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle((0, 0, pw + 11, ph + 11 + radius), radius=radius + 6, fill=(70, 62, 96, 255))
    img.paste(frame, (x - 6, y - 6), frame)
    img.paste(shot, (x, y), mask)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, quality=95)


def main() -> None:
    raw_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    lang = sys.argv[3] if len(sys.argv) > 3 else 'fr'
    for name, l1, l2, sub in SCREENS[lang]:
        src = raw_dir / f'{name}.png'
        if not src.exists():
            print('absent :', src.name)
            continue
        out = out_dir / f'{name}_{lang}_1080x1920.png'
        compose(src, l1, l2, sub, out)
        print('ok     :', out.name)


if __name__ == '__main__':
    main()
