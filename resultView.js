// resultView.js (premium/app 共有・安全版)
// ==================================================
// 依存が足りなくても落ちないようにフォールバックを同梱
// ==================================================
(function bootstrapSafeGlobals(){
  // ---- AXES（4軸） ----
  const DEFAULT_AXES = [
    { key:'frame',   posLabel:'肉付き主導（M）',  negLabel:'骨格主導（B）',  codePos:'M', codeNeg:'B' },
    { key:'surface', posLabel:'身体フレーム広（W）', negLabel:'身体フレーム狭（N）', codePos:'W', codeNeg:'N' },
    { key:'balance', posLabel:'上重心（U）',       negLabel:'下重心（L）',       codePos:'U', codeNeg:'L' },
    { key:'line',    posLabel:'直線（S）',         negLabel:'曲線（C）',         codePos:'S', codeNeg:'C' },
  ];
  window.AXES = Array.isArray(window.AXES) && window.AXES.length ? window.AXES : DEFAULT_AXES;

  // ---- QUESTIONS（設問） ----
  if (!window.QUESTIONS) {
    const mk = (n)=> Array.from({length:n}, ()=>({ pos:true }));
    const len = 12;
    window.QUESTIONS = { frame:mk(len), surface:mk(len), balance:mk(len), line:mk(len) };
  }

  // ---- TYPE_META / BRAND_BY_TYPE ----
  window.TYPE_META = window.TYPE_META || {};
  window.BRAND_BY_TYPE = window.BRAND_BY_TYPE || {};

  // ---- 全タイプの配列 ----
  window.ALL_CODES_ORDERED =
    (Array.isArray(window.ALL_CODES_ORDERED) && window.ALL_CODES_ORDERED.length)
      ? window.ALL_CODES_ORDERED
      : (Object.keys(window.TYPE_META).length
          ? Object.keys(window.TYPE_META)
          : ['BNLS','MNLC','MWLC','MWLS','MNLS','BNLC','BWUC','BWUS','BWLC','BWLS','BNUS','MWUC','MNUC','MNUS','MWUS','BNUC']);

  // ---- sendToSheets フォールバック ----
  if (typeof window.sendToSheets !== 'function') {
    window.sendToSheets = async ()=>({ok:true});
  }
})();

// ==================================================
// 小ユーティリティ
// ==================================================
function jsonp(url){
  return new Promise((resolve, reject)=>{
    const cb = '__jp' + Math.random().toString(36).slice(2);
    const s  = document.createElement('script');
    const q  = (url.includes('?')?'&':'?') + 'callback=' + cb;
    window[cb] = (data)=>{ resolve(data); cleanup(); };
    s.onerror  = ()=>{ reject(new Error('JSONP failed')); cleanup(); };
    s.src = url + q; s.async = true; document.head.appendChild(s);
    function cleanup(){ try{ delete window[cb]; }catch(_){ window[cb]=undefined; } s.remove(); }
  });
}
const clamp01 = (x)=> Math.max(0, Math.min(1, x));

// ==================================================
// 互換レイヤ（足りない関数を補う）
// ==================================================
(function shimMeta(){
  const TM = window.TYPE_META;

  function inferBase(code){
    if (TM?.[code]?.base) return TM[code].base;
    const wave = new Set(['BNLS','MNLC','MWLC','MWLS','MNLS','BNLC']);
    const nat  = new Set(['BWUC','BWUS','BWLC','BWLS']);
    const st   = new Set(['BNUS','MWUC','MNUC','MNUS','MWUS','BNUC']);
    if (wave.has(code)) return 'WAVE';
    if (nat.has(code))  return 'NATURAL';
    if (st.has(code))   return 'STRAIGHT';
    return 'NATURAL';
  }

  if (typeof window.describeBodyByCode !== 'function'){
    window.describeBodyByCode = (code)=>{
      const m = TM?.[code] || {};
      const cand = m.bodyDesc || m.description || m.concept;
      if (cand) return cand;
      const base = inferBase(code);
      if (base==='WAVE')     return '肉感・厚みがベース。下重心寄りで柔らかな曲線要素が映える。';
      if (base==='STRAIGHT') return '厚みと立体がベース。上重心寄りで直線要素がキレイにハマる。';
      return '骨感とフレーム幅がベース。直線寄り×ラフな設計が似合いやすい。';
    };
  }
  if (typeof window.nickOf !== 'function'){
    window.nickOf = (code)=> TM?.[code]?.nick || TM?.[code]?.name || code;
  }
  if (typeof window.whyOf !== 'function'){
    window.whyOf = (code)=> TM?.[code]?.why || TM?.[code]?.meaning || TM?.[code]?.concept || 'タイプの核となる雰囲気・ライン設計を象徴。';
  }
  if (typeof window.autoBrands !== 'function'){
    window.autoBrands = (code, base)=>{
      const m = TM?.[code]; if (m?.brandHints?.length) return m.brandHints;
      const b = base || inferBase(code);
      if (b==='WAVE')     return ['IÉNA','Mila Owen','Plage','N.O.R.C','TOMORROWLAND'];
      if (b==='STRAIGHT') return ['Theory','Max Mara','PLST','CELFORD','UNITED ARROWS'];
      return ['UNIQLO','COS','ZARA','MARGARET HOWELL','& Other Stories'];
    };
  }
  if (typeof window.autoStyle !== 'function'){
    window.autoStyle = (code)=>{
      const base = TM?.[code]?.base || 'NATURAL';
      if (base==='WAVE') return {
        fabric:['薄手ウール','シフォン','スムースニット'],
        neck:['ラウンド/スカーフタイ','ハートネック','浅V×ドレープ'],
        silhouette:['ロング×落ち感ボトム','Aライン','ドロップショルダー'],
        lines:['バイアス/ドレープ','マーメイド','ギャザー控えめ']
      };
      if (base==='STRAIGHT') return {
        fabric:['中厚コットン','クリアウール','ハリのあるジャージー'],
        neck:['Vネック','ボートネック','シャツカラー'],
        silhouette:['Iライン','ウエスト高め','セットアップ'],
        lines:['直線切替','センタープレス','余計な装飾なし']
      };
      return {
        fabric:['リネン/コットン','ドライタッチニット','ツイル'],
        neck:['クルー','ヘンリー','オープンカラー'],
        silhouette:['ボクシー/ストレート','肩線やや落とす','ワイド/テーパード'],
        lines:['直線＋少量ドレープ','縦の抜け','オーバル比率']
      };
    };
  }
})();

// ==================================================
// スコア計算
// ==================================================
window.state = window.state || { step:5, answers:{ frame:[], surface:[], balance:[], line:[] }, _sentOnce:false };

function computeAxis(axisKey){
  const arr = (state.answers[axisKey] || []).map(Number);
  const qs  = (window.QUESTIONS?.[axisKey]) || [];
  const n   = Math.max(1, arr.length);
  const mapped = arr.map((v,i)=> qs[i]?.pos ? v : (6 - v));
  const total  = mapped.reduce((a,b)=> a+b, 0);
  const mean5  = total / n;
  const neutral= 3 * n;
  const ax  = window.AXES.find(a=>a.key===axisKey) || { codePos:'M', codeNeg:'B' };
  const pos = total > neutral;
  return { mean: mean5, total, pos, code: pos ? ax.codePos : ax.codeNeg };
}
function buildCode(){
  const f=computeAxis('frame'), s=computeAxis('surface'), b=computeAxis('balance'), l=computeAxis('line');
  return { code:`${f.code}${s.code}${b.code}${l.code}`, scores:{ frame:f, surface:s, balance:b, line:l } };
}

// ==================================================
// 相性（服シェア）
// ==================================================
const WEIGHTS = { tops:{frame:0.40,surface:0.10,balance:0.30,line:0.20}, bottoms:{frame:0.10,surface:0.30,balance:0.40,line:0.20} };
const KEEP    = { tops:{frame:0.50,surface:0.55,balance:0.35,line:0.60}, bottoms:{frame:0.60,surface:0.45,balance:0.20,line:0.55} };
const BASE_AFFINITY = { WAVE:{WAVE:1.00,NATURAL:0.92,STRAIGHT:0.85}, NATURAL:{WAVE:0.92,NATURAL:1.00,STRAIGHT:0.90}, STRAIGHT:{WAVE:0.85,NATURAL:0.90,STRAIGHT:1.00} };

function sameLetter(a,b){ return a===b ? 1 : 0; }
function axisPercent(axisKey){
  const arr = (state.answers[axisKey] || []).map(Number);
  const qs  = window.QUESTIONS?.[axisKey] || [];
  if (!arr.length || !qs.length) {
    const ax = window.AXES.find(a=>a.key===axisKey) || {};
    return { pct:50, sideLabel: ax.negLabel || '', posSide:false };
  }
  const normalized = arr.map((v,i)=> (qs[i]?.pos ? (v-1)/4 : 1-((v-1)/4)) );
  const avg = normalized.reduce((a,b)=>a+b,0)/normalized.length;
  const pct = Math.round(avg*100);
  const ax  = window.AXES.find(a=>a.key===axisKey) || {};
  return { pct, sideLabel: (pct>50?ax.posLabel:ax.negLabel)||'', posSide: pct>50 };
}
function userFlex(axisKey){ const { pct } = axisPercent(axisKey); return 1 - Math.abs((pct-50)/50); }
function decompose(code){ const [a,b,c,d]=(code||'NNNN').split(''); const base=window.TYPE_META?.[code]?.base || 'NATURAL'; return {frame:a,surface:b,balance:c,line:d,base}; }
function patternBoost(codeA, codeB, mode){
  if(!codeA||!codeB) return 0;
  let same=0; for(let i=0;i<4;i++) if(codeA[i]===codeB[i]) same++;
  const first2 = codeA.slice(0,2)===codeB.slice(0,2);
  const last2  = codeA.slice(2,4)===codeB.slice(2,4);
  const two = mode==='tops' ? (first2?0.08:(last2?0.04:0)) : (mode==='bottoms' ? (last2?0.08:(first2?0.04:0)) : 0);
  const three = same>=3 ? 0.06 : 0;
  return two + three;
}
function compatCore(codeA, codeB, mode){
  try{
    const wa = WEIGHTS[mode] || WEIGHTS.tops;
    const keep = KEEP[mode] || KEEP.tops;
    const A=decompose(codeA), B=decompose(codeB);
    const sF = sameLetter(A.frame,B.frame)?1:keep.frame;
    const sS = sameLetter(A.surface,B.surface)?1:keep.surface;
    const sB = sameLetter(A.balance,B.balance)?1:keep.balance;
    const sL = sameLetter(A.line,B.line)?1:keep.line;
    const num = wa.frame*sF*(0.7+0.3*userFlex('frame'))
              + wa.surface*sS*(0.7+0.3*userFlex('surface'))
              + wa.balance*sB*(0.7+0.3*userFlex('balance'))
              + wa.line*sL*(0.7+0.3*userFlex('line'));
    let core = num / (wa.frame+wa.surface+wa.balance+wa.line || 1);
    const baseMul = (BASE_AFFINITY[A.base]?.[B.base]) ?? 0.92;
    core = core*baseMul + patternBoost(codeA,codeB,mode);
    return clamp01(core);
  }catch(_){ return 0.55; }
}
function toPercent(x){ return Math.round( 55 + 43 * (isFinite(x)?x:0) ); }
function getShareCompatibility(code){
  const ALL = Array.isArray(window.ALL_CODES_ORDERED) ? window.ALL_CODES_ORDERED : [];
  const candidates = ALL.filter(c=> c && c!==code);
  const tops    = candidates.map(c=>({ code:c, score:toPercent( compatCore(code,c,'tops') ) })).sort((a,b)=>b.score-a.score);
  const bottoms = candidates.map(c=>({ code:c, score:toPercent( compatCore(code,c,'bottoms') ) })).sort((a,b)=>b.score-a.score);
  return {
    topsBest: tops[0] || null,
    topsNext: tops.slice(1,6),
    bottomsBest: bottoms[0] || null,
    bottomsNext: bottoms.slice(1,6),
    topsAll: tops.map(t=>t.code),
    bottomsAll: bottoms.map(b=>b.code),
  };
}
try{ window.getShareCompatibility = getShareCompatibility; }catch(_){}

// ==================================================
// 表示系
// ==================================================
function pill(code){ return `<button class="chip linklike" data-code="${code}" onclick="goDetails('${code}')">${code}</button>`; }
function meter(pct){ return `<div class="match-meter" aria-label="match ${pct}%"><i style="width:${pct}%"></i></div>`; }

function labelOf(code){
  const meta = window.TYPE_META?.[code] || null; // ← CODE_META 未使用
  if (!meta) return `${code}`;
  const emoji = meta.emoji || '';
  const baseLabel = meta.label || meta.name || code;
  return `${emoji ? (emoji + ' ') : ''}${baseLabel}（${code}）`;
}

const DETAIL_PAGE = ''; // 詳細ページがあるなら 'detail.html'
function goDetails(code){
  const url = DETAIL_PAGE ? `${DETAIL_PAGE}?code=${encodeURIComponent(code)}`
                          : `gallery.html?code=${encodeURIComponent(code)}`;
  location.href = url;
}

function renderBodyTipsHTML(code){
  const t = (window.BODY_TIPS?.[code]) || null;
  if (!t) return '';
  const li = (arr)=> (arr||[]).map(x=>`<li>• ${x}</li>`).join('');
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
  const topsLead    = `この骨格の有名人の <b>トップス/アウター</b> も参考になるよ！肩線・襟・上半身の設計が近いタイプです。`;
  const bottomsLead = `この骨格の有名人の <b>ボトムス</b> も参考になるよ！ウエスト位置・落ち感・ライン設計が近いタイプです。`;
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
       : b==='NATURAL'?'NATURAL（骨感・直線・ラフ）' : (b||'');
}

// ==================================================
// かわいい統計（任意）
// ==================================================
async function refreshCuteStats(){
  if (!window.GAS_URL) return;
  try{
    const data = await jsonp(window.GAS_URL + '?stats=1');
    if (!data?.ok) return;
    // 必要なら描画を追加
  }catch(e){ console.warn(e); }
}

// ==================================================
// メイン描画
// ==================================================
function _renderResultCore(){
  const root = document.getElementById('app') || document.body;
  const { code, scores } = buildCode();
  const meta = window.TYPE_META?.[code] || { name:'未定義タイプ', base:'NATURAL', emoji:'', animal:'', image:'', concept:'', brandHints:[], styleNotes:[] };

  document.body.dataset.theme = meta.base || 'NATURAL';

  // 一度だけ計測送信
  if (!state._sentOnce && window.GAS_URL){
    state._sentOnce = true;
    const sid = localStorage.getItem('km_session')
      || (localStorage.setItem('km_session',(crypto?.randomUUID?.()||Math.random().toString(36).slice(2))), localStorage.getItem('km_session'));
    window.sendToSheets?.({ code, scores, userAgent:navigator.userAgent, sessionId:sid, t:Date.now() });
  }

  const bodyDesc = window.describeBodyByCode(code);
  const brands   = (meta.brandHints?.length ? meta.brandHints : window.autoBrands(code, meta.base));
  const auto     = window.autoStyle(code);
  const brandPack= window.BRAND_BY_TYPE?.[code];

  const pf = axisPercent('frame');
  const ps = axisPercent('surface');
  const pb = axisPercent('balance');
  const pl = axisPercent('line');

  const notes = Array.isArray(meta.styleNotes) ? meta.styleNotes : [];
  const nick  = window.nickOf(code);
  const why   = window.whyOf(code);

  let celebHTML = '';
  if (meta.celebrities) {
    const { jp = [], kr = [], global = [] } = meta.celebrities;
    const group = [
      { label:'🇯🇵 日本',  list:jp },
      { label:'🇰🇷 韓国',  list:kr },
      { label:'🌍 海外',  list:global }
    ];
    celebHTML = `
      <div class="card guide" style="margin-top:12px">
        <h3>代表的な芸能人</h3>
        ${group.map(g=> g.list?.length ? `<h4>${g.label}</h4><div class="chips">${g.list.map(x=>`<span class="chip">${x}</span>`).join('')}</div>` : '').join('')}
        <p class="small">※ 分類は参考例です。</p>
      </div>`;
  }

  const barsHTML = `
    <div class="traits">
      ${[
        {key:'Frame',   ax:window.AXES[0], data:pf},
        {key:'Surface', ax:window.AXES[1], data:ps},
        {key:'Balance', ax:window.AXES[2], data:pb},
        {key:'Line',    ax:window.AXES[3], data:pl},
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
          <div class="ends"><span>${ax?.negLabel||''}</span><span>${ax?.posLabel||''}</span></div>
        </div>
      `).join('')}
    </div>`;

  const groupHTML = brandPack ? `
  <div class="brand-groups">
    <div class="brand-group"><h4>ハイブランド</h4><div class="chips">${brandPack.high.map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>
    <div class="brand-group"><h4>ミドルブランド</h4><div class="chips">${brandPack.middle.map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>
    <div class="brand-group"><h4>ファスト</h4><div class="chips">${brandPack.fast.map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>
  </div>` : '';

  const el = document.createElement('div');
  el.innerHTML = `
    <div class="cols">
      <div class="card result">
        <h2>診断結果：<span class="ok">${code}</span> — <span class="em">${meta.emoji||''}</span> ${meta.name||code}</h2>
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

  root.innerHTML=''; root.appendChild(el);

  // 共有ボタン
  (function(){
    const meta = window.TYPE_META?.[code] || { name:'', emoji:'' };
    const shareTitle = `${meta.emoji ?? ''} ${meta.name || code}（${code}）`.trim();
    const shareUrl   = new URL('index.html', location.href).href;

    const bx = document.getElementById('btn-x');
    bx && (bx.onclick = ()=> {
      const t = encodeURIComponent(`骨格MBTI診断の結果は「${shareTitle}」でした！`);
      const u = encodeURIComponent(shareUrl);
      window.open(`https://twitter.com/intent/tweet?text=${t}&url=${u}`, '_blank');
    });
    const bl = document.getElementById('btn-line');
    bl && (bl.onclick = ()=> {
      const t = encodeURIComponent(`骨格MBTI診断の結果は「${shareTitle}」でした！\n${shareUrl}`);
      window.open(`https://line.me/R/msg/text/?${t}`, '_blank');
    });
    const bc = document.getElementById('btn-copy');
    bc && (bc.onclick = ()=> {
      navigator.clipboard.writeText(shareUrl).then(()=>alert('リンクをコピーしました'));
    });
  })();

  // 購入ボタン
  const buyBtn = el.querySelector('#buy-premium');
  if (buyBtn){
    buyBtn.addEventListener('click', async ()=>{
      const email = prompt('完全版のURLを送るメールアドレスを入力してください📩');
      if (!email) return;
      const { code, scores } = buildCode();
      const answers  = state.answers || {};
      const sessionId= localStorage.getItem('km_session')
                    || (localStorage.setItem('km_session',(crypto?.randomUUID?.()||Math.random().toString(36).slice(2))), localStorage.getItem('km_session'));
      if (!window.GAS_URL) { alert('GAS_URL が設定されていません'); return; }
      const url = window.GAS_URL
        + '?savePremium=1'
        + '&email='    + encodeURIComponent(email)
        + '&sessionId='+ encodeURIComponent(sessionId)
        + '&code='     + encodeURIComponent(code)
        + '&scores='   + encodeURIComponent(JSON.stringify(scores))
        + '&answers='  + encodeURIComponent(JSON.stringify(answers));
      try{
        const res = await jsonp(url);
        if (!res?.ok) throw new Error(res?.error || '保存に失敗');
        alert('購入ありがとうございます！完全版URLをメールで送りました📩（迷惑メールもご確認ください）');
      }catch(e){ console.error(e); alert('メール送信に失敗しました。時間を置いて再度お試しください。'); }
    }, { once:false });
  }

  // 再診断 / JSON保存
  const retryBtn = el.querySelector('#retry');
  retryBtn && (retryBtn.onclick = ()=>{
    try { state = { step:0, answers:{ frame:[], surface:[], balance:[], line:[] }, _sentOnce:false }; }
    catch(_){ /* noop */ }
    location.href = 'app.html';
  });

  const exportBtn = el.querySelector('#export');
  exportBtn && (exportBtn.onclick = ()=>{
    const payload = { code, meta, scores, answers: state.answers };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `kokkaku-mbti-${code}.json`; a.click();
    URL.revokeObjectURL(url);
  });
}

function renderResult(){ _renderResultCore(); }

// 任意：自動で統計更新
try{
  document.addEventListener('DOMContentLoaded', ()=>{
    refreshCuteStats();
    setInterval(refreshCuteStats, 60_000);
  });
}catch(_){}