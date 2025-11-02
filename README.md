# 骨格MBTI Web診断 – GitHub Pages 版

このフォルダを **GitHub** にアップロードすると、そのまま **GitHub Pages** で公開できます。

## 公開手順（最短）

1. GitHubで新しいリポジトリを作成（例: `kokkaku-mbti`）。
2. このZIPを解凍して、**中身（index.html/404.html/.nojekyll/images/**）を丸ごとドラッグ&ドロップでアップロード。
3. リポジトリの **Settings → Pages** を開く。
4. **Build and deployment**: Source を **Deploy from a branch** に。
5. **Branch** を `main`、**Folder** を `/ (root)` にして **Save**。
6. 数十秒～数分で、上に公開URL（例: `https://ユーザー名.github.io/kokkaku-mbti/`）が出ます。

## 画像の追加（任意）

- `images` フォルダに以下のようなファイル名で画像を置くと、診断結果に表示されます。
  - `images/BNLS.jpg`
  - `images/MNLC.jpg`
  - `images/MWLC.jpg`
  - …（HTMLに記載された `TYPE_META[CODE].image` に対応）
- 拡張子は .jpg 推奨。ファイル名はHTML内の `TYPE_META` 設定と一致させてください。

## URLの例

公開後のURL（例）: `https://ユーザー名.github.io/リポジトリ名/`

- 直リンクに失敗しても `404.html` が 2 秒でトップに戻します。
- `.nojekyll` により、`images/` などの静的ファイルがそのまま配信されます。

---

**ヒント**: リポジトリ名を `ユーザー名.github.io` にすると、ルート直下のURLで公開されます。複数サイト運用なら通常のリポジトリ名でOKです。