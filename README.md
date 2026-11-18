# ココロタイプ（16タイプの性格診断）PWA

質問に答えると16タイプの性格タイプを判定し、男性・女性のイラストで結果を表示するWebアプリです。
iPhone・Androidのホーム画面に追加でき、オフラインでも動作します。

- 公開URL: https://utausnskareshi.github.io/kokorotype/
- 外部サービスやライブラリは使っていません。HTML / CSS / JavaScript だけで動きます（ビルド作業は不要）。

## 主な機能

| 機能 | 内容 |
|---|---|
| 診断 | しっかり診断（48問・約5分）／かんたん診断（24問・約2分）。5段階で回答し、途中保存・再開ができます |
| 結果 | タイプ・男女イラスト（切り替え可）・4指標の割合・境界タイプ・前回との比較・性格の解説 |
| 恋愛スタイル | 恋愛の傾向と、相性のよい異性のタイプをイラスト付きで紹介（お相手のイラストも男女を切り替え可） |
| 16タイプ図鑑 | 全タイプの解説を男女イラスト付きで閲覧 |
| 相性チェック | 2つのタイプの相性（★5段階）と、相性ランキング |
| 履歴 | 端末内に最新50件まで保存 |
| シェア | 共有ボタン、LINE、X、結果画像（PNG）の作成 |
| PWA | ホーム画面に追加、オフライン動作、新しいバージョンのお知らせ |

回答・結果・設定は、端末の中（localStorage）だけに保存されます。外部への送信はありません。

---

## GitHub Pages で公開する手順

### 1. リポジトリを作る
1. GitHub にサインインし、右上の「＋」→「New repository」を選びます。
2. **Repository name** に `kokorotype` と入力します（公開URLの一部になります。別の名前にする場合は、下の「公開URLを変えるとき」も参照）。
3. **Public** を選びます（無料プランで GitHub Pages を使うには Public が必要です）。
4. README・.gitignore・ライセンスは**追加せずに**（このフォルダに用意してあります）、「Create repository」を押します。

### 2. ファイルを送る（push）
このフォルダで次を実行します。初めて push するときは、ブラウザで GitHub へのサインインを求められます。

```bash
git remote add origin https://github.com/utausnskareshi/kokorotype.git
```

```bash
git push -u origin main
```

### 3. GitHub Pages を有効にする
1. リポジトリの「**Settings**」→ 左メニューの「**Pages**」を開きます。
2. 「Build and deployment」の **Source** で「**Deploy from a branch**」を選びます。
3. **Branch** で `main`、フォルダで `/ (root)` を選び、「**Save**」を押します。
4. 1〜数分で https://utausnskareshi.github.io/kokorotype/ に公開されます（進み具合は「Actions」タブで確認できます）。

### 4. スマートフォンで確認する
- **iPhone**：Safari で公開URLを開く →「…」→「共有」→「ホーム画面に追加」→「追加」
- **Android**：Chrome で公開URLを開く →「アプリをインストール」（または「︙」→「ホーム画面に追加」）

ホーム画面から起動すると、説明ページを飛ばしてアプリのトップが表示されます。
一度起動したあとは、機内モードでも動くことを確認してください。

---

## アプリを更新するとき（重要）

PWAはファイルを端末に保存して動くため、**バージョン番号を上げないと利用者の端末に更新が届きません。**

1. ファイルを編集します。
2. `sw.js` の `const VERSION = '1.0.0';` を上げます（例：`1.0.0` → `1.0.1`）。
   画面に表示されるバージョン番号も、ここから自動で取得されます。
3. 新しいファイルを追加した場合は、`sw.js` の `ASSETS` にも追記します。
4. （任意）Node.js が入っていれば、次のコマンドで設定漏れやファイル名の間違いを確認できます。

   ```bash
   node tools/check.mjs
   ```

5. GitHub にアップロード（push）します。
6. 利用者がアプリを開くと「新しいバージョンがあります」と表示され、「更新する」で最新版に切り替わります。

## ローカルで動作確認する

```bash
python tools/serve.py
```

ブラウザで http://localhost:8080/kokorotype/ を開きます（停止は Ctrl + C）。
本番と同じく `/kokorotype/` の下で配信し、ファイル名の大文字・小文字も区別するので、公開前にパスの間違いに気づけます。
GitHub Pages と同じキャッシュ設定（10分）で更新の動きを確かめたいときは、`python tools/serve.py --pages` で起動します。

> `index.html` をダブルクリックして直接開くと、ブラウザの仕組みでプログラムが動きません（画面に注意書きが出ます）。必ず上のサーバーか公開URLで開いてください。

## 画像を作り直すとき

元画像（4×4マスの一覧画像。男性用・女性用）をこのフォルダに置いて、次を実行します。
並び順は上段から ISTJ, ISFJ, INFJ, INTJ / ISTP, ISFP, INFP, INTP / ESTP, ESFP, ENFP, ENTP / ESTJ, ESFJ, ENFJ, ENTJ です。

```bash
python tools/crop_images.py boys.png girls.png
```

（ファイル名は例です。男性用、女性用の順に指定します）

```bash
python tools/make_assets.py
```

- `crop_images.py`：タイル画像32枚（`images/male`・`images/female`）と、タイプ色（`js/colors.js`）を作ります。
- `make_assets.py`：アプリアイコン（`icons/`）、SNS共有用画像（`images/ogp.jpg`）、QRコード（`images/qr.svg`）を作ります。
  QRコードの作成には `pip install segno` が必要です。
  フォントは Windows の Noto Sans JP（`C:\Windows\Fonts\NotoSansJP-VF.ttf`）を使います。別の場所にある場合は、環境変数 `APP_FONT` にフォントのパスを指定してください。
- どちらも Python と Pillow（`pip install pillow`）が必要です。画像を変えたら、上の「更新するとき」の手順でバージョンを上げてください。

## フォルダ構成

```
index.html            説明ページ（ブラウザで開いたとき）＋アプリ本体
manifest.json         PWAの設定（アプリ名・アイコン・色）
sw.js                 Service Worker（オフライン対応・更新管理）
.nojekyll             GitHub Pages でファイルをそのまま公開するための空ファイル
.gitignore            GitHub に送らないファイルの指定
LICENSE               ライセンス（MIT License）
css/style.css         デザイン
js/app.js             画面・診断ロジック・シェア・インストール・更新のお知らせ
js/questions.js       質問（48問）と、同点時の二択質問
js/types.js           16タイプの解説・恋愛スタイル・相性データ
js/colors.js          タイプごとの色（自動生成）
images/male/*.webp    男性イラスト（16枚）
images/female/*.webp  女性イラスト（16枚）
images/ogp.jpg        SNS共有用画像
images/qr.svg         公開URLのQRコード
icons/                アプリアイコン
tools/                画像生成・ローカル確認・整合性チェック用のスクリプト（アプリの動作には使いません）
```

## 公開URLを変えるとき

リポジトリ名（公開URL）を `kokorotype` 以外にする場合は、次の場所のURLも書き換えてから、画像を作り直してください。

- `index.html`（`og:url`・`og:image`・QRコードの下のURL・注意書き）
- `js/app.js`（`SITE_URL`）
- `tools/make_assets.py`（`SITE_URL`。QRコードと共有用画像に入ります）
- `tools/serve.py`（`PREFIX`）、この README

## 名前・文章・画像についてのご注意

- アプリ名や画面の表示に、**他社の商標**（ほかの性格検査・診断サービスの名称など）を使わないでください。
- ほかの診断サービスの質問文・解説文・イラストを**コピーしない**でください（著作権の侵害になるおそれがあります）。
- アプリ名や機能名を変えるときは、特許庁の「J-PlatPat（特許情報プラットフォーム）」で、同じ・似た名前が商標登録されていないか確認してください。

このアプリは、ユングの心理学的タイプ論などを参考に独自に作成した簡易的な性格診断です。
特定の団体・企業が提供する公式の性格検査とは関係ありません。結果は自己理解やお楽しみのための目安で、医学的・心理学的な診断ではありません。

iPhone、iPad、Safari は、米国およびその他の国で登録された Apple Inc. の商標です。iPhone の商標は、アイホン株式会社のライセンスにもとづき使用されています。
Android、Google Chrome は Google LLC の商標です。その他、記載されている会社名・サービス名は、各社の商標または登録商標です。

## ライセンス

[MIT License](LICENSE) で公開しています。© 2026 歌うＬＩＮＥ彼氏
