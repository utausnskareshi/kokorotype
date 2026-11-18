"""
4×4マスのタイプ一覧画像から、16タイプ×男女のタイル画像を切り出すスクリプト。

使い方（リポジトリのルートで実行）:
    python tools/crop_images.py boys.png girls.png   （男性用・女性用の順に指定）

出力:
    images/male/ISTJ.webp … images/male/ENTJ.webp     （男性16枚）
    images/female/ISTJ.webp … images/female/ENTJ.webp （女性16枚）
    js/colors.js  … 各タイプ名の文字色（画像から抽出したテーマ色）

仕組み:
    マス同士のすき間（白っぽい行・列）を自動検出してマスの位置を求め、
    各マスの枠線を内側に削ってから縦横比をそろえ、2倍に拡大して保存します。
    画像の並び順は GRID と同じ（上段から ISTJ, ISFJ, INFJ, INTJ …）である必要があります。

必要なもの: Python 3 と Pillow（pip install pillow）
"""
import json
import pathlib
import sys

from PIL import Image, ImageFilter

GRID = [
    ["ISTJ", "ISFJ", "INFJ", "INTJ"],
    ["ISTP", "ISFP", "INFP", "INTP"],
    ["ESTP", "ESFP", "ENFP", "ENTP"],
    ["ESTJ", "ESFJ", "ENFJ", "ENTJ"],
]
INSET = 6            # 枠線を削る幅（px）
ASPECT = 1.72        # 出力の横:縦
OUT_W = 720          # 出力の幅（元のマス幅の約2倍）
OUT_H = round(OUT_W / ASPECT)
WEBP_QUALITY = 84

ROOT = pathlib.Path(__file__).resolve().parent.parent


def is_light(p):
    r, g, b = p[:3]
    mx, mn = max(r, g, b), min(r, g, b)
    return mx > 222 and (mx - mn) < 45


def runs(flags):
    out, start = [], None
    for i, f in enumerate(list(flags) + [False]):
        if f and start is None:
            start = i
        if not f and start is not None:
            out.append((start, i - 1))
            start = None
    return out


def detect_grid(im):
    """マスの外枠 (x0, y0, x1, y1) を 4×4 で返す。"""
    w, h = im.size
    px = im.load()
    ys_sample = range(int(h * 0.13), int(h * 0.97), 2)
    col_light = [sum(is_light(px[x, y]) for y in ys_sample) / len(ys_sample) for x in range(w)]
    gaps_x = runs(v >= 0.8 for v in col_light)
    xs_sample = range(20, w - 20, 2)
    row_light = [sum(is_light(px[x, y]) for x in xs_sample) / len(xs_sample) for y in range(h)]
    gaps_y = [g for g in runs(v >= 0.8 for v in row_light) if g[0] > h * 0.08]

    # 4列・4段のマスには、左右（上下）の端を含めてちょうど5本のすき間がある。
    # 多すぎる（マスの中に白い線がある等）・少なすぎる場合は、間違って切り出さないよう止める
    if len(gaps_x) != 5 or len(gaps_y) != 5:
        raise SystemExit(
            f"マスのすき間を正しく検出できませんでした（縦 {len(gaps_x)} 本・横 {len(gaps_y)} 本、それぞれちょうど5本必要）。"
            "マスの周囲に白っぽい余白があり、マスの中に白い線がない画像を使ってください。"
        )
    if gaps_y[0][0] >= h * 0.13:
        raise SystemExit("タイトル帯と1段目のすき間を検出できませんでした")
    cols = [(gaps_x[i][1] + 1, gaps_x[i + 1][0] - 1) for i in range(4)]
    rows = [(gaps_y[i][1] + 1, gaps_y[i + 1][0] - 1) for i in range(4)]
    # マスの大きさがそろっているか（10%以上違えば、検出の失敗とみなす）
    for name, spans in (("幅", [b - a for a, b in cols]), ("高さ", [b - a for a, b in rows])):
        if min(spans) <= 0 or max(spans) > min(spans) * 1.1:
            raise SystemExit(f"マスの{name}がそろっていません（{spans}）。画像を確認してください。")
    return [[(x0, y0, x1, y1) for (x0, x1) in cols] for (y0, y1) in rows]


def crop_tile(im, box):
    x0, y0, x1, y1 = box
    x0, y0, x1, y1 = x0 + INSET, y0 + INSET, x1 - INSET + 1, y1 - INSET + 1
    w, h = x1 - x0, y1 - y0
    if w / h > ASPECT:      # 横長すぎる → 左右を均等に削る
        new_w = round(h * ASPECT)
        d = w - new_w
        x0 += d // 2
        x1 = x0 + new_w
    else:                   # 縦長すぎる → 下側を削る（左上の文字を守る）
        y1 = y0 + round(w / ASPECT)
    tile = im.crop((x0, y0, x1, y1))
    big = tile.resize((OUT_W, OUT_H), Image.LANCZOS)
    return tile, big.filter(ImageFilter.UnsharpMask(radius=1.2, percent=45, threshold=3))


def text_color(tile):
    """左上のタイプ名の文字色（彩度の高い画素の中央値）を返す。"""
    px = tile.load()
    picked = []
    for y in range(8, 66):
        for x in range(10, 170):
            r, g, b = px[x, y][:3]
            mx, mn = max(r, g, b), min(r, g, b)
            if mx >= 60 and mx <= 250 and (mx - mn) / mx > 0.6:
                picked.append((r, g, b))
    if not picked:
        return (90, 90, 160)
    return tuple(sorted(c[i] for c in picked)[len(picked) // 2] for i in range(3))


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    sources = {"male": pathlib.Path(sys.argv[1]), "female": pathlib.Path(sys.argv[2])}
    for gender, path in sources.items():
        if not path.is_file():
            raise SystemExit(f"画像が見つかりません: {path.resolve()}（リポジトリのルートで実行し、画像のパスを確認してください）")

    # 先に2枚とも検出・切り出しまで済ませ、問題がなければまとめて保存する（途中で失敗して一部だけ上書きされるのを防ぐ）
    outputs = []
    colors = {}
    for gender, path in sources.items():
        im = Image.open(path).convert("RGB")
        grid = detect_grid(im)
        for r, row in enumerate(GRID):
            for c, code in enumerate(row):
                tile, big = crop_tile(im, grid[r][c])
                outputs.append((ROOT / "images" / gender / f"{code}.webp", big))
                colors.setdefault(code, []).append(text_color(tile))
        print(f"{gender}: {path} を検出しました（16マス）")

    for out_path, big in outputs:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        big.save(out_path, "WEBP", quality=WEBP_QUALITY, method=6)
    print(f"images/male, images/female に {len(outputs)} 枚を保存しました（{OUT_W}x{OUT_H}）")

    hexes = {}
    for code, cs in colors.items():
        avg = tuple(round(sum(c[i] for c in cs) / len(cs)) for i in range(3))
        hexes[code] = "#%02x%02x%02x" % avg
    js = (
        "// 各タイプのテーマ色（tools/crop_images.py がイラストのタイプ名の文字色から自動生成）\n"
        "export const TYPE_COLORS = " + json.dumps(hexes, indent=2) + ";\n"
    )
    (ROOT / "js" / "colors.js").write_text(js, encoding="utf-8")
    print("js/colors.js:", hexes)


if __name__ == "__main__":
    main()
