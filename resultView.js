// /js/resultView.js
// ==================================================
// 結果画面の描画ロジック（app/premium 共通）
// ==================================================

// ---- stateの最低限初期化（premiumで answers を復元する前提） ----
// ==== compat shim (put at very top of resultView.js) ====
// meta.js / types.js が未定義でも落ちないように保険を張る
(function(){
  // デフォルトAXES（appの表示ラベルに合わせて必要なら文言調整してOK）
  const DEFAULT_AXES = [
    { key:'frame',   posLabel:'肉付き主導（M）', negLabel:'骨格主導（B）', codePos:'M', codeNeg:'B' },
    { key:'surface', posLabel:'身体フレーム広（W）', negLabel:'身体フレーム狭（N）', codePos:'W', codeNeg:'N' },
    { key:'balance', posLabel:'上重心（U）',        negLabel:'下重心（L）',        codePos:'U', codeNeg:'L' },
    { key:'line',    posLabel:'直線（S）',          negLabel:'曲線（C）',          codePos:'S', codeNeg:'C' },
  ];

  // AXES を用意
  window.AXES = window.AXES || DEFAULT_AXES;

  // 質問定義が無い場合は長さだけ揃うダミー（全問 pos=true 想定）
  if (!window.QUESTIONS) {
    const mk = (n)=> Array.from({length:n}, ()=>({ pos:true }));
    const len = 12; // appと同じ設問数に合わせて
    window.QUESTIONS = { frame:mk(len), surface:mk(len), balance:mk(len), line:mk(len) };
  }

  // TYPE_META が無いと全ての参照で落ちるので空でも置く
  window.TYPE_META = window.TYPE_META || {};

  // 全16コード配列（meta側に無ければ固定の並びを出す）
  window.ALL_CODES_ORDERED = window.ALL_CODES_ORDERED || Object.keys(window.TYPE_META).length
    ? Object.keys(window.TYPE_META)
    : ['BNLS','MNLC','MWLC','MWLS','MNLS','BNLC','BWUC','BWUS','BWLC','BWLS','BNUS','MWUC','MNUC','MNUS','MWUS','BNUC'];

  // GAS_URL は premium 側で固定しているので触らない（undefinedでもOK）
})();
// ==== compat shim v2: meta関数の足りない分を安全に補う ====
(function(){
  const TM = (typeof TYPE_META !== 'undefined') ? TYPE_META : {};
  const BRAND = (typeof BRAND_BY_TYPE !== 'undefined') ? BRAND_BY_TYPE : {};
  const ALL = (typeof ALL_CODES_ORDERED !== 'undefined') ? ALL_CODES_ORDERED
            : Object.keys(TM).length ? Object.keys(TM) 
            : ['BNLS','MNLC','MWLC','MWLS','MNLS','BNLC','BWUC','BWUS','BWLC','BWLS','BNUS','MWUC','MNUC','MNUS','MWUS','BNUC'];

  // ベース判定（TYPE_META優先、なければ簡易規則）
  function inferBase(code){
    if (TM[code]?.base) return TM[code].base;
    const wave = new Set(['BNLS','MNLC','MWLC','MWLS','MNLS','BNLC']);
    const nat  = new Set(['BWUC','BWUS','BWLC','BWLS']);
    const st   = new Set(['BNUS','MWUC','MNUC','MNUS','MWUS','BNUC']);
    if (wave.has(code)) return 'WAVE';
    if (nat.has(code))  return 'NATURAL';
    if (st.has(code))   return 'STRAIGHT';
    return 'NATURAL';
  }

  // 1) どんな骨格？の本文
  if (typeof window.describeBodyByCode !== 'function'){
    window.describeBodyByCode = function(code){
      const m = TM[code] || {};
      // TYPE_METAに説明項目があるなら優先
      const cand = m.bodyDesc || m.description || m.concept;
      if (cand) return cand;
      // なければベースごとの汎用テキスト
      const base = inferBase(code);
      if (base === 'WAVE') {
        return '肉感・筋肉の厚みがベース。全体は重厚で安定感あり。下重心で下半身に安定が出やすい。輪郭は曲線寄りでソフト。';
      } else if (base === 'STRAIGHT') {
        return '厚みと立体感がベース。上重心で上半身に存在感が出やすい。直線を意識した構成が似合いやすい。';
      } else {
        return '骨感とフレーム幅がベース。ラフで直線寄りの要素が映える。抜け感や肩線の設計でバランスを整えると良い。';
      }
    };
  }

  // 2) タイプのニックネーム
  if (typeof window.nickOf !== 'function'){
    window.nickOf = function(code){
      const m = TM[code] || {};
      return m.nick || m.name || code;
    };
  }

  // 3) モチーフに込めた意味
  if (typeof window.whyOf !== 'function'){
    window.whyOf = function(code){
      const m = TM[code] || {};
      return m.why || m.meaning || m.concept || 'タイプの核となる雰囲気やライン設計を象徴しています。';
    };
  }

  // 4) 自動ブランド候補（TYPE_METAが持つ brandHints が無ければ最低限を返す）
  if (typeof window.autoBrands !== 'function'){
    window.autoBrands = function(code, base){
      const m = TM[code] || {};
      if (m.brandHints && m.brandHints.length) return m.brandHints;
      const b = base || inferBase(code);
      if (b === 'WAVE')     return ['IÉNA','Mila Owen','Plage','N.O.R.C','URBAN RESEARCH','TOMORROWLAND'];
      if (b === 'STRAIGHT') return ['Theory','Max Mara','PLST','FOXEY','CELFORD','UNITED ARROWS'];
      return ['UNIQLO','COS','& Other Stories','ZARA','MARGARET HOWELL','ENFÖLD'];
    };
  }

  // 5) 自動スタイル提案（素材・ネック・シルエット・ライン）
  if (typeof window.autoStyle !== 'function'){
    window.autoStyle = function(code){
      const base = inferBase(code);
      if (base === 'WAVE') {
        return {
          fabric: ['薄手ウール','シフォン/ジョーゼット','スムースニット'],
          neck:   ['ラウンド/スカーフタイ','ハートネック','Vネック＋ドレープ'],
          silhouette: ['ロングトップス×落ち感ボトム','Aライン/フレア','ドロップショルダー'],
          lines:  ['バイアスドレープ','マーメイド/フレア','ギャザー控えめ']
        };
      } else if (base === 'STRAIGHT') {
        return {
          fabric: ['中厚コットン','クリアウール','ハリのあるジャージー'],
          neck:   ['Vネック','ボートネック','シャツカラー'],
          silhouette: ['Iライン','ウエスト位置高め','セットアップ'],
          lines:  ['直線を意識した切替','センタープレス','余計なギャザーなし']
        };
      } else {
        return {
          fabric: ['リネン/コットン','ドライタッチニット','ツイル'],
          neck:   ['クルー','ヘンリーネック','オープンカラー'],
          silhouette: ['ボクシー/ストレート','肩線やや落とす','ワイド/テーパード'],
          lines:  ['直線×少量のドレープ','オーバル比率','縦の抜けを作る']
        };
      }
    };
  }

  // 6) ブランドグループの空ガード
  if (typeof window.BRAND_BY_TYPE === 'undefined'){
    window.BRAND_BY_TYPE = BRAND; // 既にあればそのまま
  }
  if (typeof window.ALL_CODES_ORDERED === 'undefined'){
    window.ALL_CODES_ORDERED = ALL;
  }
})();
window.state = window.state || {
  step: 5,
  answers: { frame:[], surface:[], balance:[], line:[] },
  _sentOnce: false,
};

// ---- 計算系 ----
function computeAxis(axisKey){
  const arr = (state.answers[axisKey] || []).map(Number);
  const qs  = (window.QUESTIONS && QUESTIONS[axisKey]) || [];
  const n   = Math.max(1, arr.length);

  const mapped = arr.map((v,i)=> qs[i]?.pos ? v : (6 - v));
  const total = mapped.reduce((a,b)=>a+b,0);
  const mean5 = total / n;
  const neutral = 3 * n;

  const ax  = AXES.find(a=>a.key===axisKey);
  const pos = total > neutral;
  return { mean: mean5, total, pos, code: pos ? ax.codePos : ax.codeNeg };
}

function buildCode(){
  const f=computeAxis('frame'),
        s=computeAxis('surface'),
        b=computeAxis('balance'),
        l=computeAxis('line');
  return {code:`${f.code}${s.code}${b.code}${l.code}`,scores:{frame:f,surface:s,balance:b,line:l}};
}

// ---- 服シェア相性（安全ガード付き） ----
const PREFIX_GROUPS = {};
const SUFFIX_GROUPS = {};
(window.ALL_CODES_ORDERED || []).forEach(c=>{
  const pre = c.slice(0,2), suf=c.slice(2,4);
  (PREFIX_GROUPS[pre] ||= []).push(c);
  (SUFFIX_GROUPS[suf] ||= []).push(c);
});

const _SAFE = {
  ALL: (Array.isArray(window.ALL_CODES_ORDERED) ? ALL_CODES_ORDERED.slice() : []),
  TYPE_META: (typeof TYPE_META !== 'undefined') ? TYPE_META : {},
  axisPercent: (typeof axisPercent === 'function')
    ? axisPercent
    : (key) => ({ pct: 50 }),
  log: (...args) => { try { console.warn('[compat]', ...args); } catch(_){} },
};

const WEIGHTS = {
  tops:    { frame:0.40, surface:0.10, balance:0.30, line:0.20 },
  bottoms: { frame:0.10, surface:0.30, balance:0.40, line:0.20 },
};
const MISMATCH_KEEP = {
  tops:    { frame:0.50, surface:0.55, balance:0.35, line:0.60 },
  bottoms: { frame:0.60, surface:0.45, balance:0.20, line:0.55 },
};
const BASE_AFFINITY = {
  WAVE:      { WAVE:1.00, NATURAL:0.92, STRAIGHT:0.85 },
  NATURAL:   { WAVE:0.92, NATURAL:1.00, STRAIGHT:0.90 },
  STRAIGHT:  { WAVE:0.85, NATURAL:0.90, STRAIGHT:1.00 },
};

function sameLetter(a,b){ return a===b ? 1 : 0; }
function userFlex(axisKey){
  const { pct } = _SAFE.axisPercent(axisKey);
  const dist = Math.abs((typeof pct === 'number' ? pct : 50) - 50) / 50;
  return 1 - dist;
}
function decompose(code){
  const [a,b,c,d] = (code || 'NNNN').split('');
  const base = _SAFE.TYPE_META?.[code]?.base || 'NATURAL';
  return { frame:a, surface:b, balance:c, line:d, base };
}
function patternBoost(codeA, codeB, mode){
  if(!codeA || !codeB) return 0;
  let match = 0; for (let i=0;i<4;i++) if(codeA[i]===codeB[i]) match++;
  const first2 = (codeA.slice(0,2) === codeB.slice(0,2));
  const last2  = (codeA.slice(2,4) === codeB.slice(2,4));
  const twoBoost =
    mode==='tops'    ? (first2 ? 0.08 : (last2 ? 0.04 : 0))
  : mode==='bottoms' ? (last2  ? 0.08 : (first2 ? 0.04 : 0))
                     : 0;
  const threeBoost = (match>=3) ? 0.06 : 0;
  return twoBoost + threeBoost;
}
function compatCore(codeA, codeB, mode){
  try {
    const wa = WEIGHTS[mode] || WEIGHTS.tops;
    const keep = MISMATCH_KEEP[mode] || MISMATCH_KEEP.tops;
    const A = decompose(codeA), B = decompose(codeB);

    const sF = sameLetter(A.frame,   B.frame)   ? 1 : keep.frame;
    const sS = sameLetter(A.surface, B.surface) ? 1 : keep.surface;
    const sB = sameLetter(A.balance, B.balance) ? 1 : keep.balance;
    const sL = sameLetter(A.line,    B.line)    ? 1 : keep.line;

    const flexF = 0.7 + 0.3 * userFlex('frame');
    const flexS = 0.7 + 0.3 * userFlex('surface');
    const flexB = 0.7 + 0.3 * userFlex('balance');
    const flexL = 0.7 + 0.3 * userFlex('line');

    const num =
        wa.frame   * sF * flexF +
        wa.surface * sS * flexS +
        wa.balance * sB * flexB +
        wa.line    * sL * flexL;

    let core = num / (wa.frame + wa.surface + wa.balance + wa.line || 1);
    const baseMul = (BASE_AFFINITY[A.base]?.[B.base]) ?? 0.92;
    const boost   = patternBoost(codeA, codeB, mode);
    core = core * baseMul + boost;
    return Math.max(0, Math.min(1, core));
  } catch (e) {
    _SAFE.log('compatCore error', e);
    return 0.55;
  }
}
function toPercent(x){
  const p = 55 + 43 * (isFinite(x) ? x : 0);
  return Math.round(Math.max(0, Math.min(100, p)));
}
function getShareCompatibility(code){
  try {
    const ALL = _SAFE.ALL.length ? _SAFE.ALL : (_SAFE.log('ALL_CODES_ORDERED 未定義'), []);
    const candidates = ALL.filter(c => c && c !== code);
    const tops = candidates.map(c => ({ code:c, score: toPercent( compatCore(code, c, 'tops') ) }))
                           .sort((a,b)=> b.score - a.score);
    const bottoms = candidates.map(c => ({ code:c, score: toPercent( compatCore(code, c, 'bottoms') ) }))
                              .sort((a,b)=> b.score - a.score);
    return {
      topsBest: tops[0] || null,
      topsNext: tops.slice(1, 6),
      bottomsBest: bottoms[0] || null,
      bottomsNext: bottoms.slice(1, 6),
      topsAll: tops.map(t=>t.code),
      bottomsAll: bottoms.map(b=>b.code),
    };
  } catch (e) {
    _SAFE.log('getShareCompatibility error', e);
    return { topsBest:null, topsNext:[], bottomsBest:null, bottomsNext:[], topsAll:[], bottomsAll:[] };
  }
}
try { window.getShareCompatibility = getShareCompatibility; } catch(_){}

function pill(code){
  return `<button class="chip linklike" data-code="${code}" onclick="goDetails('${code}')">${code}</button>`;
}
function meter(pct){
  return `<div class="match-meter" aria-label="match ${pct}%"><i style="width:${pct}%"></i></div>`;
}
function labelOf(code){
  const meta = (window.TYPE_META && TYPE_META[code]) || (window.CODE_META && CODE_META[code]) || null;
  if (!meta) return `${code}`;
  const emoji = meta.emoji || (CODE_META?.[code]?.emoji) || '';
  const baseLabel = (CODE_META?.[code]?.label) || meta.name || code;
  return `${emoji ? emoji + ' ' : ''}${baseLabel}（${code}）`;
}

// ---- 詳細ページ（なければギャラリーへ） ----
const DETAIL_PAGE = ''; // 'detail.html' にしたければ設定
function goDetails(code){
  const url = DETAIL_PAGE ? `${DETAIL_PAGE}?code=${encodeURIComponent(code)}`
                          : `gallery.html?code=${encodeURIComponent(code)}`;
  location.href = url;
}

// ---- Tipsカード ----
function renderBodyTipsHTML(code) {
  const t = (window.BODY_TIPS && BODY_TIPS[code]) || null;
  if (!t) return "";
  const li = arr => (arr || []).map(x => `<li>• ${x}</li>`).join('');
  const pastel = { BN:"#ffd6e8", BW:"#ffe8d6", MN:"#e8ffd6", MW:"#d6f3ff", B:"#f8e1ff", M:"#fff5d6" }[code.slice(0,2)] || "#f0f0f0";
  return `
  <div class="card cute-tips" style="--tone:${pastel}">
    <h3>💖 Body Balance Tips</h3>
    <p class="goal">🎯 ${t.goal||''}</p>
    <div class="tips-row">
      <div class="tips-col">
        <h4>🍎 食事</h4>
        <p class="label">食べるべき！</p>
        <ul>${li(t.diet_do)}</ul>
        <p class="label">避けるべき！</p>
        <ul>${li(t.diet_avoid)}</ul>
      </div>
      <div class="tips-col">
        <h4>🏃‍♀️ 運動</h4>
        <p class="label">筋トレ</p>
        <ul>${li(t.train_strength)}</ul>
        <p class="label">有酸素</p>
        <ul>${li(t.train_cardio)}</ul>
      </div>
    </div>
    <div class="tips-extra">
      <h4>🧘‍♀️ ケア・姿勢</h4>
      <ul>${li(t.mobility)}${li(t.care)}</ul>
      <p class="quick"><b>✨Quick Win：</b>${t.quick||''}</p>
    </div>
  </div>`;
}

function shareRow({kind, lead, best, next}){
  if (!best) return '';
  const titleIco = kind === 'tops' ? '👕' : '👖';
  const titleTxt = kind === 'tops' ? 'TOPS 相性' : 'BOTTOMS 相性';
  const bestLabel = labelOf(best.code);
  return `
    <div class="match-row">
      <div class="match-title">${titleIco} ${titleTxt}</div>
      <p class="match-lead">${lead}</p>
      <div class="best-box">
        <div class="best-main">
          <div class="best-label">${bestLabel}</div>
          <div class="best-score">💞 ${best.score}%</div>
        </div>
        ${meter(best.score)}
        <div class="best-cta">
          <button class="btn primary small" onclick="goDetails('${best.code}')">このタイプの着こなしを見る →</button>
        </div>
      </div>
      ${next?.length ? `<div class="match-more muted small">ほかにも相性が良いタイプ：${next.map(x=>pill(x.code)).join('')}</div>` : ``}
    </div>`;
}
function renderShareCardHTML(code){
  const compat = getShareCompatibility(code);
  const topsLead = `この骨格の有名人の <b>トップス/アウター</b> も参考になるよ！シルエットや肩まわり・襟の作りが近いタイプです。`;
  const bottomsLead = `この骨格の有名人の <b>ボトムス</b> も参考になるよ！ウエスト位置や落ち感・ライン設計が近いタイプです。`;
  return `
    <div class="card share-card cute" style="margin-top:16px">
      <h3>🫶 服シェア相性</h3>
      <p class="muted small">上2文字一致＝トップス/アウター相性、下2文字一致＝ボトムス相性</p>
      ${shareRow({kind:'tops',    lead: topsLead,    best: compat.topsBest,    next: compat.topsNext})}
      ${shareRow({kind:'bottoms', lead: bottomsLead, best: compat.bottomsBest, next: compat.bottomsNext})}
    </div>`;
}

function baseLabel(b){
  return b==='WAVE'?'WAVE（柔・軽・下重心）'
       : b==='STRAIGHT'?'STRAIGHT（厚・立体・上重心）'
       : b==='NATURAL'?'NATURAL（骨感・直線・ラフ）' : b;
}

// ---- ％バー用 ----
function axisPercent(axisKey){
  const arr = (state.answers[axisKey] || []).map(Number);
  const qs  = QUESTIONS[axisKey] || [];
  if (!arr.length || !qs.length) return { pct:50, sideLabel: AXES.find(a=>a.key===axisKey)?.negLabel || '', posSide:false };
  const normalized = arr.map((v,i)=>{
    const s = (v-1)/4;
    return qs[i]?.pos ? s : (1-s);
  });
  const avg = normalized.reduce((a,b)=>a+b,0)/normalized.length;
  const pct = Math.round(avg*100);
  const ax = AXES.find(a=>a.key===axisKey);
  const sideLabel = (pct>50) ? ax.posLabel : ax.negLabel;
  return { pct, sideLabel, posSide: pct>50 };
}

// ---- JSONPユーティリティ（GAS用） ----
function jsonp(url){
  return new Promise((resolve, reject)=>{
    const cb = '__jp' + Date.now().toString(36);
    const s = document.createElement('script');
    const q = (url.includes('?')?'&':'?') + 'callback=' + cb;
    s.src = url + q;
    s.async = true;
    window[cb] = (data)=>{ resolve(data); delete window[cb]; s.remove(); };
    s.onerror = ()=>{ reject(new Error('JSONP failed')); delete window[cb]; s.remove(); };
    document.head.appendChild(s);
  });
}

// ---- かわいい統計（不要なら呼ばれないだけ） ----
async function refreshCuteStats(){
  if (!window.GAS_URL) return;
  try{
    const data = await jsonp(GAS_URL + '?stats=1');
    if (!data?.ok) return;
    // …（必要なら app と同じ描画をここに足す）
  }catch(e){ console.warn(e); }
}

// ---- メイン結果描画 ----
function _renderResultCore(){
  const root = document.getElementById('app') || document.body;
  const {code,scores}=buildCode();
  const meta = TYPE_META[code] || {name:'未定義タイプ',base:'NATURAL',emoji:'',animal:'',image:'',concept:'',brandHints:[],styleNotes:[]};
  document.body.dataset.theme = meta.base;

  // 一度だけGASへ
  if (!state._sentOnce && window.GAS_URL){
    state._sentOnce = true;
    const sid = localStorage.getItem('km_session')
      || (localStorage.setItem('km_session', (crypto?.randomUUID?.() ?? String(Math.random()))),
          localStorage.getItem('km_session'));
    sendToSheets?.({ code, scores, userAgent:navigator.userAgent, sessionId:sid, t:Date.now() });
  }

  const bodyDesc=describeBodyByCode(code);
  const brands=meta.brandHints?.length?meta.brandHints:autoBrands(code,meta.base);
  const auto=autoStyle(code);
  const brandPack = BRAND_BY_TYPE[code];
  const groupHTML = brandPack ? `
  <div class="brand-groups">
    <div class="brand-group"><h4>ハイブランド</h4><div class="chips">${brandPack.high.map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>
    <div class="brand-group"><h4>ミドルブランド</h4><div class="chips">${brandPack.middle.map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>
    <div class="brand-group"><h4>ファスト</h4><div class="chips">${brandPack.fast.map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>
  </div>` : '';

  const notes=(meta.styleNotes?.length?meta.styleNotes:[]);
  const nick = nickOf(code);
  const why  = whyOf(code);

  const pf = axisPercent('frame');
  const ps = axisPercent('surface');
  const pb = axisPercent('balance');
  const pl = axisPercent('line');

  let celebHTML = '';
  if (meta.celebrities) {
    const { jp = [], kr = [], global = [] } = meta.celebrities;
    const group = [
      { label: '🇯🇵 日本', list: jp },
      { label: '🇰🇷 韓国', list: kr },
      { label: '🌍 海外', list: global },
    ];
    celebHTML = `
      <div class="card guide" style="margin-top:12px">
        <h3>代表的な芸能人</h3>
        ${group.map(g=> g.list.length
          ? `<h4>${g.label}</h4><div class="chips">${g.list.map(x=>`<span class="chip">${x}</span>`).join('')}</div>`
          : ''
        ).join('')}
        <p class="small">※ 分類は参考例です。</p>
      </div>`;
  }

  const barsHTML = `
    <div class="traits">
      ${[
        {key:'Frame', ax:AXES[0], data:pf},
        {key:'Surface', ax:AXES[1], data:ps},
        {key:'Balance', ax:AXES[2], data:pb},
        {key:'Line', ax:AXES[3], data:pl},
      ].map(({key,ax,data})=>`
        <div class="trait">
          <div class="row">
            <div class="title">${key}：<span class="${data.posSide?'ok':'warn'}">${data.pct}% ${data.sideLabel?.replace?.(/（.*?）/g,'')||''}</span></div>
            <div class="percent">${data.pct}%</div>
          </div>
          <div class="meter">
            <div class="fill" style="width:${data.pct}%;"></div>
            <div class="thumb" style="left:${data.pct}%;"></div>
          </div>
          <div class="ends"><span>${ax.negLabel}</span><span>${ax.posLabel}</span></div>
        </div>
      `).join('')}
    </div>`;

  const el=document.createElement('div');
  el.innerHTML=`
    <div class="cols">
      <div class="card result">
        <h2>診断結果：<span class="ok">${code}</span> — <span class="em">${meta.emoji||''}</span> ${meta.name}</h2>
        <div class="tags">
          <span class="tag">基盤体型：${baseLabel(meta.base)}</span>
          ${meta.animal?`<span class="tag">motif Animal: ${meta.animal}</span>`:''}
          <span class="tag kind">${nick}</span>
        </div>
        <div class="hero-image" data-base="${meta.base}">
          <img src="${meta.image || `images/${code}.jpg`}" alt="${code} image" loading="lazy" decoding="async"
               onerror="this.closest('.hero-image')?.classList.add('is-missing')" />
        </div>
        <p class="concept">${meta.concept||''}</p>
        <p class="muted">4軸の平均スコア</p>
        ${barsHTML}

        <div class="card guide" style="margin-top:12px">
          <h3>どんな骨格？</h3>
          <p>${bodyDesc}</p>

          <h3>似合いやすいブランド</h3>
          <div class="chips brand-chips">
            ${brands.map(b=>`<span class="chip" title="${b}">${b}</span>`).join('')}
          </div>
          ${groupHTML}

          <div class="card guide" style="margin-top:12px">
            <h3>モチーフに込めた意味</h3>
            <p>${why}</p>
          </div>

          <h3>スタイリング指針</h3>
          <div class="cols" style="grid-template-columns:1fr 1fr">
            <div>
              <h4>素材・質感</h4>
              <ul>${(auto.fabric||[]).map(x=>`<li>${x}</li>`).join('')}</ul>
              <h4>ネックライン</h4>
              <ul>${(auto.neck||[]).map(x=>`<li>${x}</li>`).join('')}</ul>
            </div>
            <div>
              <h4>シルエット</h4>
              <ul>${(auto.silhouette||[]).map(x=>`<li>${x}</li>`).join('')}</ul>
              <h4>ライン設計</h4>
              <ul>${(auto.lines||[]).map(x=>`<li>${x}</li>`).join('')}</ul>
            </div>
          </div>
          ${notes.length?`<h4>タイプ固有メモ</h4><ul>${notes.map(n=>`<li>${n}</li>`).join('')}</ul>`:''}

          ${renderBodyTipsHTML(code)}
          ${celebHTML}

          <div class="card" style="margin-top:12px; text-align:center;">
            <h3>完全版レポート</h3>
            <p class="muted small">“あなた専用”の詳しい提案・ブランド・相性・Q&Aなど全部盛り</p>
            <button class="btn" id="buy-premium">完全版を購入（¥100）</button>
          </div>

          ${renderShareCardHTML(code)}
          <p class="small">※ 提案は各軸のスコアとタイプ固有情報から生成しています。</p>
        </div>

        <div class="card" style="margin-top:20px; text-align:center;">
          <h3>他の骨格タイプも見てみる</h3>
          <p>あなたのタイプ以外の15タイプを比較してみましょう。</p>
          <a href="gallery.html" class="btn" style="display:inline-block;background:#333;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;transition:all .3s;">タイプギャラリーを見る →</a>
        </div>

        <div class="share-box">
          <h3 style="margin-top:0;">結果をシェア</h3>
          <div class="share-buttons">
            <button class="share-btn" id="btn-x">Xでシェア</button>
            <button class="share-btn" id="btn-line">LINEで送る</button>
            <button class="share-btn" id="btn-copy">リンクをコピー</button>
          </div>

          <div class="controls" style="margin-top:12px">
            <button id="retry" class="secondary">もう一度</button>
            <button id="export">結果をJSONで保存</button>
          </div>
        </div>

        <div class="card">
          <h3>タイプ群の解説</h3>
          <ul>
            <li><b>WAVE</b>：柔・軽・下重心・曲線（🩰 Airy / Gentle / Dreamlike）</li>
            <li><b>NATURAL</b>：骨感・直線・フレーム広（🌿 Calm / Organic / Minimal）</li>
            <li><b>STRAIGHT</b>：厚・立体・上重心・直線（🖤 Modern / Powerful / Elegant）</li>
          </ul>
        </div>
      </div>
    </div>`;

  root.innerHTML = '';
  root.appendChild(el);

  // 共有ボタン
  (function(){
    const { code } = buildCode();
    const meta = TYPE_META[code] || { name:'', emoji:'' };
    const shareTitle = `${meta.emoji ?? ''} ${meta.name || code}（${code}）`;
    const shareUrl   = new URL('index.html', location.href).href;

    const bx = document.getElementById('btn-x');
    if (bx) bx.onclick = () => {
      const t = encodeURIComponent(`骨格MBTI診断の結果は「${shareTitle}」でした！`);
      const u = encodeURIComponent(shareUrl);
      window.open(`https://twitter.com/intent/tweet?text=${t}&url=${u}`, '_blank');
    };
    const bl = document.getElementById('btn-line');
    if (bl) bl.onclick = () => {
      const t = encodeURIComponent(`骨格MBTI診断の結果は「${shareTitle}」でした！\n${shareUrl}`);
      window.open(`https://line.me/R/msg/text/?${t}`, '_blank');
    };
    const bc = document.getElementById('btn-copy');
    if (bc) bc.onclick = () => {
      navigator.clipboard.writeText(shareUrl).then(()=>alert('リンクをコピーしました'));
    };
  })();

  // 購入ボタン
  const buyBtn = el.querySelector('#buy-premium');
  if (buyBtn){
    buyBtn.addEventListener('click', async () => {
      const email = prompt('完全版のURLを送るメールアドレスを入力してください📩');
      if (!email) return;

      const { code, scores } = buildCode();
      const answers = state.answers || {};
      const sessionId = localStorage.getItem('km_session') ||
                        (localStorage.setItem('km_session',(crypto?.randomUUID?.()||Math.random().toString(36).slice(2))),
                         localStorage.getItem('km_session'));

      if (!window.GAS_URL) {
        alert('GAS_URL が設定されていません（meta.js を確認してください）');
        return;
      }

      const url = GAS_URL
        + '?savePremium=1'
        + '&email='   + encodeURIComponent(email)
        + '&sessionId='+ encodeURIComponent(sessionId)
        + '&code='    + encodeURIComponent(code)
        + '&scores='  + encodeURIComponent(JSON.stringify(scores))
        + '&answers=' + encodeURIComponent(JSON.stringify(answers));

      try{
        const res = await jsonp(url);
        if (!res || !res.ok) throw new Error(res?.error || '保存に失敗');
        alert('購入ありがとうございます！\n完全版URLをメールで送りました📩\n（迷惑メールもご確認ください）');
      }catch(e){
        console.error(e);
        alert('エラー：メール送信に失敗しました。時間を置いてお試しください。');
      }
    }, { once:false });
  }

  // 再診断 / JSON保存
  const retryBtn = el.querySelector('#retry');
  if (retryBtn) retryBtn.onclick = () => {
    try { state = makeInitialState(); } catch(_) {
      state = { step:0, answers:{ frame:[], surface:[], balance:[], line:[] }, _sentOnce:false };
    }
    state.step = 0;
    location.href = 'app.html'; // premiumから診断に戻す
  };

  const exportBtn = el.querySelector('#export');
  if (exportBtn) exportBtn.onclick = () => {
    const { code, scores } = buildCode();
    const meta = TYPE_META[code] || {};
    const payload={code,meta,scores,answers:state.answers};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`kokkaku-mbti-${code}.json`; a.click();
    URL.revokeObjectURL(url);
  };
}

function renderResult(){ _renderResultCore(); }

// （必要なら自動で統計更新）
try{
  document.addEventListener('DOMContentLoaded', ()=>{
    refreshCuteStats();
    setInterval(refreshCuteStats, 60000);
  });
}catch(_){}