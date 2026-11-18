"""
アプリアイコン・SNS共有用画像（OGP）・QRコードを生成するスクリプト。

使い方（リポジトリのルートで実行。先に tools/crop_images.py でタイル画像を作っておく）:
    python tools/make_assets.py

出力:
    icons/icon-192.png, icons/icon-512.png      … 通常アイコン（角丸）
    icons/icon-maskable-512.png                  … Android用（全面・セーフゾーン内に配置）
    icons/apple-touch-icon.png                   … iPhone用 180×180（全面・不透明）
    icons/favicon-32.png                         … ブラウザのタブ用
    images/ogp.jpg                               … LINE / X などで共有したときのプレビュー画像
    images/qr.svg                                … 公開URLのQRコード（segno が入っている場合のみ）

必要なもの: Python 3 と Pillow。フォントは Noto Sans JP（可変フォント NotoSansJP-VF.ttf）を使用。
Windows 以外やフォントの場所が違う場合は、環境変数 APP_FONT にフォントファイルのパスを指定してください。
QRコードには segno（pip install segno）が必要です。
"""
import math
import os
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_PATH = os.environ.get("APP_FONT", r"C:\Windows\Fonts\NotoSansJP-VF.ttf")
SITE_URL = "https://utausnskareshi.github.io/kokorotype/"
APP_NAME = "ココロタイプ"

ICON_STOPS = [(0.0, "#5b9dff"), (0.5, "#8a6dff"), (1.0, "#ff7ab8")]
OGP_STOPS = [(0.0, "#e6f0ff"), (0.5, "#efe8ff"), (1.0, "#ffe6f2")]
TITLE_STOPS = [(0.0, "#3f6bff"), (0.5, "#8a4dff"), (1.0, "#ff5fa8")]


def font(size, weight):
    try:
        f = ImageFont.truetype(FONT_PATH, size)
    except OSError:
        sys.exit(f"フォントが見つかりません: {FONT_PATH}\n"
                 "Noto Sans JP（NotoSansJP-VF.ttf）を用意し、環境変数 APP_FONT にそのパスを指定してください。")
    try:
        f.set_variation_by_axes([weight])
    except (OSError, AttributeError):
        pass  # 可変フォントでない場合は、フォント本来の太さで描く
    return f


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def gradient(w, h, stops, mode="diag"):
    stops = [(p, rgb(c)) for p, c in stops]
    n = w + h if mode == "diag" else w
    line = []
    for i in range(n):
        t = i / (n - 1)
        for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
            if t <= p1:
                k = (t - p0) / (p1 - p0)
                line.append(tuple(round(c0[j] + (c1[j] - c0[j]) * k) for j in range(3)))
                break
    img = Image.new("RGB", (w, h))
    if mode == "diag":
        img.putdata([line[x + y] for y in range(h) for x in range(w)])
    else:
        img.putdata([line[x] for y in range(h) for x in range(w)])
    return img


def sparkle(draw, cx, cy, r, fill):
    pts = []
    for k in range(8):
        ang = math.pi / 4 * k - math.pi / 2
        rad = r if k % 2 == 0 else r * 0.28
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    draw.polygon(pts, fill=fill)


def heart(draw, cx, cy, size, fill):
    pts = []
    for i in range(120):
        t = 2 * math.pi * i / 120
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * size / 34, cy - y * size / 34))
    draw.polygon(pts, fill=fill)


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return m


# ---------------------------------------------------------------- icons
def icon_master(n=1024):
    base = gradient(n, n, ICON_STOPS).convert("RGBA")

    d = ImageDraw.Draw(base)
    for cx, cy, r, a in [(0.17, 0.2, 0.06, 230), (0.83, 0.17, 0.04, 200), (0.86, 0.8, 0.05, 210),
                         (0.14, 0.8, 0.035, 180), (0.73, 0.3, 0.022, 170)]:
        sparkle(d, cx * n, cy * n, r * n, (255, 255, 255, a))

    # アプリ名を2行で入れる（文字, 横幅の割合, 中心の高さの割合）。
    # Android の丸く切り抜かれるアイコンでも欠けないよう、中央の円（直径80%）の中に収めている
    sw = int(n * 0.009)
    placed = []
    for text, width, cy in (("ココロ", 0.64, 0.36), ("タイプ", 0.46, 0.585)):
        f = font(int(n * 0.3), 900)
        bbox = d.textbbox((0, 0), text, font=f, stroke_width=sw)
        f = font(int(n * 0.3 * (n * width) / (bbox[2] - bbox[0])), 900)
        bbox = d.textbbox((0, 0), text, font=f, stroke_width=sw)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        placed.append(((n - tw) / 2 - bbox[0], n * cy - th / 2 - bbox[1], text, f))

    shadow = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    for x, y, text, f in placed:
        sd.text((x, y + n * 0.02), text, font=f, fill=(48, 30, 130, 150), stroke_width=sw, stroke_fill=(48, 30, 130, 150))
    base.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(n * 0.018)))
    d = ImageDraw.Draw(base)
    for x, y, text, f in placed:
        d.text((x, y), text, font=f, fill=(255, 255, 255, 255), stroke_width=sw, stroke_fill=(70, 60, 190, 255))

    hy, hs = n * 0.79, n * 0.11
    hl = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    heart(ImageDraw.Draw(hl), n / 2, hy + n * 0.01, hs, (120, 40, 140, 110))
    base.alpha_composite(hl.filter(ImageFilter.GaussianBlur(n * 0.01)))
    d = ImageDraw.Draw(base)
    heart(d, n / 2, hy, hs, (255, 255, 255, 255))
    heart(d, n / 2, hy + n * 0.003, hs * 0.7, (255, 110, 170, 255))
    return base


def make_icons():
    out = ROOT / "icons"
    out.mkdir(exist_ok=True)
    master = icon_master()
    full = master.convert("RGB")
    full.resize((512, 512), Image.LANCZOS).save(out / "icon-maskable-512.png", optimize=True)
    full.resize((180, 180), Image.LANCZOS).save(out / "apple-touch-icon.png", optimize=True)

    rounded = master.copy()
    rounded.putalpha(rounded_mask(master.size, int(master.size[0] * 0.22)))
    for s in (512, 192):
        rounded.resize((s, s), Image.LANCZOS).save(out / f"icon-{s}.png", optimize=True)
    rounded.resize((32, 32), Image.LANCZOS).save(out / "favicon-32.png", optimize=True)
    print("icons: done")


# ---------------------------------------------------------------- OGP
def gradient_text(canvas, xy, text, f, stops):
    mask = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(mask).text(xy, text, font=f, fill=255)
    bbox = mask.getbbox()
    grad = gradient(bbox[2] - bbox[0], bbox[3] - bbox[1], stops, mode="horiz")
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    layer.paste(grad, (bbox[0], bbox[1]))
    canvas.paste(layer, (0, 0), mask)


def make_ogp():
    W, H = 1200, 630
    img = gradient(W, H, OGP_STOPS).convert("RGBA")
    d = ImageDraw.Draw(img)
    for cx, cy, r, c in [(70, 560, 16, (255, 255, 255, 230)), (540, 70, 14, (255, 255, 255, 230)),
                         (548, 598, 10, (255, 180, 215, 255)), (35, 50, 9, (150, 170, 255, 255))]:
        sparkle(d, cx, cy, r, c)

    # 右側：イラストのタイル 2列×3段（男女交互）
    tiles = [("male", "ENFP"), ("female", "INFP"), ("female", "ESFP"),
             ("male", "ISFJ"), ("male", "ENTP"), ("female", "ENFJ")]
    tw, gap = 282, 16
    th = round(tw / 1.7184)
    gx0 = W - 44 - (tw * 2 + gap)
    gy0 = (H - (th * 3 + gap * 2)) // 2
    for i, (g, code) in enumerate(tiles):
        x = gx0 + (i % 2) * (tw + gap)
        y = gy0 + (i // 2) * (th + gap)
        tile = Image.open(ROOT / "images" / g / f"{code}.webp").convert("RGB").resize((tw, th), Image.LANCZOS)
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((x - 2, y + 4, x + tw + 2, y + th + 8), 18, fill=(80, 60, 140, 70))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)))
        ImageDraw.Draw(img).rounded_rectangle((x - 5, y - 5, x + tw + 5, y + th + 5), 20, fill=(255, 255, 255, 255))
        img.paste(tile, (x, y), rounded_mask((tw, th), 15))

    d = ImageDraw.Draw(img)
    # バッジ
    bf = font(28, 800)
    label = "16タイプの性格診断"
    bb = d.textbbox((0, 0), label, font=bf)
    bw, bh = bb[2] - bb[0] + 48, 54
    pill = gradient(bw, bh, TITLE_STOPS, mode="horiz")
    img.paste(pill, (60, 74), rounded_mask((bw, bh), bh // 2))
    d.text((60 + 24 - bb[0], 74 + (bh - (bb[3] - bb[1])) / 2 - bb[1]), label, font=bf, fill="white")

    # タイトル（右のイラストに重ならない幅まで、文字の大きさを自動で調整する）
    size = 100
    while True:
        tf = font(size, 900)
        bb = d.textbbox((0, 0), APP_NAME, font=tf)
        if bb[2] - bb[0] <= 490 or size <= 60:
            break
        size -= 2
    gradient_text(img, (54, 150 + (100 - size) // 2), APP_NAME, tf, TITLE_STOPS)

    # 特長
    lf = font(31, 700)
    lines = ["男女イラストでタイプがわかる", "恋愛スタイルと相性もチェック", "オフライン対応・登録不要"]
    y = 318
    for line in lines:
        heart(d, 78, y + 21, 26, (255, 95, 168, 255))
        d.text((104, y), line, font=lf, fill=(52, 46, 96))
        y += 62
    d.text((62, 538), SITE_URL.replace("https://", "").rstrip("/"), font=font(25, 500), fill=(110, 104, 150))

    out = ROOT / "images" / "ogp.jpg"
    img.convert("RGB").save(out, quality=88, optimize=True, progressive=True)
    print("ogp:", out)


# ---------------------------------------------------------------- QR
def make_qr():
    try:
        import segno
    except ImportError:
        print("qr: segno が見つからないためスキップしました（pip install segno）")
        return
    qr = segno.make(SITE_URL, error="m")
    out = ROOT / "images" / "qr.svg"
    qr.save(str(out), kind="svg", scale=1, border=2, dark="#2d2a5a", light="#ffffff",
            xmldecl=False, omitsize=True, title=f"{APP_NAME}のQRコード")
    print("qr:", out, "version", qr.version, qr.error)


if __name__ == "__main__":
    make_icons()
    make_ogp()
    make_qr()
