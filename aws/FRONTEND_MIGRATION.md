# フロントエンド移行ガイド

GASからAWS APIへの切り替え手順

## 概要

以下のファイルでGAS URLを使用している箇所を、新しいAWS API Gatewayエンドポイントに置き換えます。

## 修正対象ファイル

### 1. app.html (診断アプリ)

#### 修正箇所1: GAS_URL定義 (70行目)

**変更前:**
```javascript
const GAS_URL = "https://script.google.com/macros/s/AKfycbyXIJtmz6TIUVPmZ_KcwKiQ1ZjueMvhrV5UC_F3FkiWZkwfi-WwYpUvIXiK8p_Ta-5E/exec"
```

**変更後:**
```javascript
const API_BASE_URL = "https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod";
```

#### 修正箇所2: 診断結果送信 (73行目)

**変更前:**
```javascript
return fetch(GAS_URL, {
  method: 'POST',
  mode: 'no-cors',
  body: JSON.stringify(payload)
});
```

**変更後:**
```javascript
return fetch(`${API_BASE_URL}/diagnoses`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
}).then(res => res.json());
```

#### 修正箇所3: 統計取得 (1737行目)

**変更前:**
```javascript
const r = await fetch(GAS_URL + '?stats=1', { cache:'no-store' });
```

**変更後:**
```javascript
const r = await fetch(`${API_BASE_URL}/stats`, {
  method: 'GET',
  cache: 'no-store'
});
```

---

### 2. index.html (トップページ)

#### 修正箇所: GAS_URL定義と統計取得 (149-258行目)

**変更前:**
```javascript
const GAS_URL = "https://script.google.com/macros/s/AKfycby2H5KNrr2prVQqs4pNCWTmw2U0FJ-_dDs6wg0A6qWsV9JjujZLGvvbBIn14Xt34RpO/exec";

async function fetchStats(){
  const url = GAS_URL + '?stats=1';
  const res = { total:0, byType:{}, byBase:{WAVE:0,NATURAL:0,STRAIGHT:0} };
  try{
    const r = await fetch(url, { cache:'no-store' });
    if (!r.ok) return res;
    const data = await r.json();
    // ...
  }
}
```

**変更後:**
```javascript
const API_BASE_URL = "https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod";

async function fetchStats(){
  const url = `${API_BASE_URL}/stats`;
  const res = { total:0, byType:{}, byBase:{WAVE:0,NATURAL:0,STRAIGHT:0} };
  try{
    const r = await fetch(url, {
      method: 'GET',
      cache: 'no-store'
    });
    if (!r.ok) return res;
    const data = await r.json();
    // data.ok が true の場合、data から total, byType, byBase を取得
    res.total = data.total || 0;
    res.byType = data.byType || {};
    res.byBase = data.byBase || { WAVE:0, NATURAL:0, STRAIGHT:0 };
  } catch(e){
    console.warn('[index] fetch stats error:', e);
  }
  return res;
}
```

---

### 3. premium.html (プレミアムレポート)

#### 修正箇所1: GAS_URL定義 (163行目)

**変更前:**
```javascript
const GAS_URL="https://script.google.com/macros/s/AKfycbyXIJtmz6TIUVPmZ_KcwKiQ1ZjueMvhrV5UC_F3FkiWZkwfi-WwYpUvIXiK8p_Ta-5E/exec";
```

**変更後:**
```javascript
const API_BASE_URL = "https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod";
```

#### 修正箇所2: メール再送信 (249行目)

**変更前:**
```javascript
const r = await jsonp(`${GAS_URL}?sendMail=1&email=${encodeURIComponent(email)}&code=${encodeURIComponent(code||'')}`);
```

**変更後:**
```javascript
const r = await fetch(`${API_BASE_URL}/premium/resend`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: email,
    code: code || ''
  })
}).then(res => res.json());
```

#### 修正箇所3: レポート取得 (400行目)

**変更前:**
```javascript
res = await jsonp(`${GAS_URL}?report=1&token=${encodeURIComponent(token)}`);
```

**変更後:**
```javascript
res = await fetch(`${API_BASE_URL}/premium/${encodeURIComponent(token)}`, {
  method: 'GET'
}).then(r => r.json());
```

---

### 4. premium-thanks.html (購入完了)

#### 修正箇所: GAS_URL定義とプレミアム保存 (187-299行目)

**変更前:**
```javascript
const GAS_URL = "https://script.google.com/macros/s/AKfycbyXIJtmz6TIUVPmZ_KcwKiQ1ZjueMvhrV5UC_F3FkiWZkwfi-WwYpUvIXiK8p_Ta-5E/exec";

const url = GAS_URL
  + '?savePremium=1&noMail=1'
  + '&sessionId='+encodeURIComponent(payload.sessionId)
  + '&code='+encodeURIComponent(payload.code)
  + '&scores='+encodeURIComponent(JSON.stringify(payload.scores||{}))
  + '&answers='+encodeURIComponent(JSON.stringify(payload.answers||{}))
  + (stripeSessionId ? '&stripe_session='+encodeURIComponent(stripeSessionId) : '');

const res = await jsonp(url);
```

**変更後:**
```javascript
const API_BASE_URL = "https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod";

const res = await fetch(`${API_BASE_URL}/premium`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId: payload.sessionId,
    code: payload.code,
    scores: payload.scores || {},
    answers: payload.answers || {},
    stripe_session: stripeSessionId || '',
    noMail: true
  })
}).then(r => r.json());
```

---

### 5. contact.html (お問い合わせ)

#### 修正箇所: フォーム送信 (240行目)

**変更前:**
```javascript
const res = await fetch("https://script.google.com/macros/s/AKfycbwduui6FJMJ7fCa0sP_F4JsuR3GHT42NWfGX0xK5gseWVG232j_U4IVca6h_rX6tE7rxg/exec", {
  method: "POST",
  mode: "no-cors",
  body: JSON.stringify(data)
});
```

**変更後:**
```javascript
const res = await fetch(`${API_BASE_URL}/contact`, {
  method: "POST",
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});

// レスポンスチェック
if (!res.ok) {
  throw new Error('送信に失敗しました');
}

const result = await res.json();
if (!result.ok) {
  throw new Error(result.error || '送信に失敗しました');
}
```

**HTML上部に追加:**
```javascript
const API_BASE_URL = "https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod";
```

---

### 6. resultView.js (結果表示共通)

#### 修正箇所1: GAS_URL定義 (6行目)

**変更前:**
```javascript
window.GAS_URL = window.GAS_URL || "https://script.google.com/macros/s/AKfycbyXIJtmz6TIUVPmZ_KcwKiQ1ZjueMvhrV5UC_F3FkiWZkwfi-WwYpUvIXiK8p_Ta-5E/exec";
```

**変更後:**
```javascript
window.API_BASE_URL = window.API_BASE_URL || "https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod";
```

#### 修正箇所2: 統計取得 (2230-2232行目)

**変更前:**
```javascript
if (typeof GAS_URL === 'string' && GAS_URL.startsWith('http')){
  try{
    const url = GAS_URL + (GAS_URL.includes('?') ? '&' : '?') + 'stats=1';
    const r = await fetch(url, { cache:'no-store' });
```

**変更後:**
```javascript
if (typeof API_BASE_URL === 'string' && API_BASE_URL.startsWith('http')){
  try{
    const url = `${API_BASE_URL}/stats`;
    const r = await fetch(url, {
      method: 'GET',
      cache: 'no-store'
    });
```

#### 修正箇所3: プレミアム保存 (2376-2377行目)

**変更前:**
```javascript
if (!window.GAS_URL) { alert('GAS_URL が設定されていません'); return; }
const url = window.GAS_URL
  + '?savePremium=1'
  + '&email='    + encodeURIComponent(email)
  // ...
```

**変更後:**
```javascript
if (!window.API_BASE_URL) { alert('API_BASE_URL が設定されていません'); return; }
const response = await fetch(`${window.API_BASE_URL}/premium`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: email,
    sessionId: sessionId,
    code: code,
    scores: scores,
    answers: answers
  })
});

const res = await response.json();
```

---

## JSONP → fetch への変更点

GASでは`mode: 'no-cors'`やJSONPを使用していましたが、AWS API Gatewayでは標準のfetchで動作します。

### JSONP関数の削除

以下のjsonp関数は不要になります（削除してOK）:

```javascript
function jsonp(url){
  return new Promise((resolve, reject)=>{
    const cb = '__jp' + Math.random().toString(36).slice(2);
    // ...
  });
}
```

### エラーハンドリング

AWS APIはJSON形式でエラーを返すため、以下のように処理:

```javascript
try {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'API Error');
  }

  // 成功時の処理
} catch (error) {
  console.error('API Error:', error);
  alert('エラーが発生しました: ' + error.message);
}
```

---

## 一括置換スクリプト

以下のスクリプトで一括置換できます（要確認）:

```bash
#!/bin/bash

# API_BASE_URLを設定
API_URL="https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod"

# GAS_URLをAPI_BASE_URLに置換
find . -name "*.html" -o -name "*.js" | xargs sed -i '' \
  -e "s|const GAS_URL = \"https://script.google.com/macros/s/[^\"]*\"|const API_BASE_URL = \"${API_URL}\"|g" \
  -e "s|window.GAS_URL|window.API_BASE_URL|g"

echo "置換完了！ファイルを確認してください。"
```

---

## テスト手順

### 1. ローカルテスト

```bash
# 簡易HTTPサーバー起動
python3 -m http.server 8000

# ブラウザで開く
open http://localhost:8000/app.html
```

### 2. 動作確認項目

- [ ] 診断完了後、結果が表示される
- [ ] 統計情報が正しく表示される（index.html）
- [ ] 購入ボタンをクリック→Stripe→premium-thanks.htmlで正常にリンク発行
- [ ] プレミアムレポートがtoken付きURLで表示される
- [ ] メール再送信が動作する
- [ ] お問い合わせフォームが送信できる

### 3. ブラウザコンソール確認

- ネットワークタブでAPI呼び出しを確認
- CORSエラーがないか確認
- レスポンスが正しいJSON形式か確認

---

## トラブルシューティング

### CORSエラーが発生する

```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**対処法:**
- AWS API GatewayのCORS設定を確認
- `template.yaml` の `Cors` セクションを確認

### レスポンス形式が異なる

GAS: `{ ok: true, ... }`
AWS: `{ ok: true, ... }` (同じだが、一部フィールドが異なる可能性)

**対処法:**
- `console.log(response)` でレスポンスを確認
- 必要に応じてマッピングコードを追加

---

## リリース手順

1. **ステージング環境でテスト**
2. **本番環境にデプロイ**
3. **GASとAWSを並行運用**（一定期間）
4. **問題なければGASを完全停止**

---

以上でフロントエンドの移行は完了です！

© 2025 16BodyPersonalities Project
