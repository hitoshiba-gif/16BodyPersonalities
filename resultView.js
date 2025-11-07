// resultView.js (premium/app 共有・安全版)
// ==================================================
// 依存が足りなくても落ちないようにフォールバックを同梱
// ==================================================
(function bootstrapSafeGlobals(){
  // ---- AXES（4軸） ----
  const DEFAULT_AXES = [
    { key:'frame',   posLabel:'骨格主導（B）',  negLabel:'肉付き主導（M）',  codePos:'B', codeNeg:'M' },
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
// ====== プロファイル抽出（4軸＆相性からシンプル指標化） ======
function _fitProfile(code){
  const pf = axisPercent('frame').pct;    // 骨格の直線（高い=直線強め）
  const ps = axisPercent('surface').pct;  // 表面のやわらかさ（高い=柔らか）
  const pb = axisPercent('balance').pct;  // 上下バランス（高い=上に寄りやすい）
  const pl = axisPercent('line').pct;     // 縦横ライン（高い=直線/縦ライン効く）

  // 相性（TOPS/BOTTOMS）の強い方を参考に、どちら寄りの話を増やすか決める
  const topsAvg    = averageAllTypes(code, 'tops');
  const bottomsAvg = averageAllTypes(code, 'bottoms');
  const prefer = (topsAvg >= bottomsAvg) ? 'tops' : 'bottoms';

  return {
    pf, ps, pb, pl,
    isStraight : pf >= 60,
    isSoft     : ps >= 60,
    upperHeavy : pb >= 55,   // 上に重心が行きやすい
    lowerHeavy : pb <= 45,   // 下に重心が行きやすい
    strongLine : pl >= 60,   // 直線・縦ラインが効く
    softLine   : pl <= 40,   // 曲線・落ち感が効く
    prefer,                 // “tops” か “bottoms”
  };
}

// 補助：全タイプに対する平均相性（並び順の基準用）
// 平均相性（未定義なら追加）
function averageAllTypes(code, mode){
  try{
    const all = (mode==='tops' ? (getShareCompatibility(code)?.topsAll||[])
                                : (getShareCompatibility(code)?.bottomsAll||[]));
    if (!all.length) return 0;
    const sum = all.reduce((s,c)=> s + toPercent( compatCore(code, c, mode) ), 0);
    return sum / all.length;
  }catch(_){ return 0; }
}

// ← これを丸ごと貼り付け
function renderFit7Block(code){
  const pf = axisPercent('frame').pct;
  const ps = axisPercent('surface').pct;
  const pb = axisPercent('balance').pct;
  const pl = axisPercent('line').pct;

  const topsAvg    = averageAllTypes(code, 'tops');
  const bottomsAvg = averageAllTypes(code, 'bottoms');
  const prefer = (topsAvg >= bottomsAvg) ? 'tops' : 'bottoms';

  const P = {
    isStraight : pf >= 60,
    isSoft     : ps >= 60,
    upperHeavy : pb >= 55,
    lowerHeavy : pb <= 45,
    strongLine : pl >= 60,
    softLine   : pl <= 40,
    prefer
  };
  const T = (t,h)=>({text:t, hint:h});

  function buildTops(){
    const L=[];
    if(P.isStraight) L.push(T("肩線が肩先どんぴしゃ","肩の縫い目が肩先。動いてもシワが寄らない"));
    else             L.push(T("肩の丸みに沿って落ちる","ドロショル/ラグランが馴染みやすい"));
    if(P.upperHeavy) L.push(T("首元に“抜け”があると整う","V/深U/ボートで重心UPしにくい"));
    else             L.push(T("首元が詰まっても苦しく見えない","上を埋めても下が重くならない"));
    if(P.strongLine) L.push(T("前立て/切替がまっすぐ落ちる","縦線が波打たない"));
    else             L.push(T("ギャザー/ドレープは“1か所”","入れ過ぎると横に広がる"));
    if(P.upperHeavy) L.push(T("丈はやや短めがバランス良い","前だけINも効く"));
    else             L.push(T("丈は腰骨〜ヒップ中間が安定","面を残した方が整う"));
    if(P.isSoft)     L.push(T("柔らか素材が“面の波”を整える","テンセル/サテンなど"));
    else             L.push(T("ハリ素材で上半身の芯が立つ","ブロード/度詰めジャージー"));
    if(P.softLine)   L.push(T("袖が二の腕に貼りつかない","指1〜2本のすき間"));
    else             L.push(T("袖がストンと落ちる","肘上でたるまない"));
    return L.slice(0,7);
  }

  function buildBottoms(){
    const L=[];
    if(P.lowerHeavy) L.push(T("ハイウエストで脚長＞脚幅","INが効く"));
    else             L.push(T("ミッド〜ややローで上重心を中和","腰位置を下げるとバランス良い"));
    if(P.isSoft)     L.push(T("太ももに貼りつかない落ち感素材","ストレート/ワイド◎"));
    else             L.push(T("太ももがストンと落ちる","センタープレスで補強"));
    if(P.strongLine) L.push(T("ピンタック/センタープレスがまっすぐ","横に広がらない"));
    else             L.push(T("曲線は“1要素だけ”","マーメイド/バイアスは入れすぎない"));
    L.push(T("腰まわりが浮かない＆食い込まない","座った時に痛くないのが基準"));
    if(P.softLine)   L.push(T("裾はフル〜やや長めで線が伸びる","甲浅の靴が相性◎"));
    else             L.push(T("裾は踝が少し見えると軽い","カッティングやスリットも良い"));
    if(P.isSoft)     L.push(T("柔らか素材が馴染む","硬い生地は横に張りやすい"));
    else             L.push(T("梳毛/デニムのハリが輪郭を作る","柔らかすぎるとボケやすい"));
    return L.slice(0,7);
  }

  const card = (kind, arr)=>`
    <section class="card premium-card fit7-card">
      <h3 class="premium-title">${kind==='tops' ? '👕 TOPS フィットチェック（7）' : '👖 BOTTOMS フィットチェック（7）'}</h3>
      <p class="muted small">5つ以上チェックが付いたら<strong>買い</strong>だよ。</p>
      <div class="fit7-list">
        ${arr.map(it=>`
          <div class="fit7-item">
            <label class="fit7-label">
              <input type="checkbox" class="fitcheck-${kind}">
              <span>${it.text}</span>
            </label>
            ${it.hint ? `<div class="fit7-hint-pop">${it.hint}</div>` : ``}
          </div>
        `).join('')}
      </div>
      <div class="fit7-result fit7-result-${kind}">
        （あと <span class="need-${kind}">5</span> 個で「買い」ライン）
      </div>
    </section>
  `;

  const html = `
    <div class="fit7-grid">
      ${card('tops', buildTops())}
      ${card('bottoms', buildBottoms())}
    </div>
    <script>
      (function(){
        function setup(kind){
          const boxes = document.querySelectorAll('.fitcheck-' + kind);
          const needEl = document.querySelector('.need-' + kind);
          const result = document.querySelector('.fit7-result-' + kind);
          function update(){
            const c = Array.from(boxes).filter(b=>b.checked).length;
            if(c >= 5){
              result.textContent = "✅ 5つ以上クリア！これは『買い』だよ";
            }else{
              needEl.textContent = 5 - c;
              result.textContent = "（あと " + (5 - c) + " 個で「買い」ライン）";
            }
          }
          boxes.forEach(b=>b.addEventListener('change', update));
          update();
        }
        setup('tops'); setup('bottoms');
      })();
    </script>
  `;
  return html;
}

function renderFit7HTML(code){
  const tops    = buildTopsChecklist(code);
  const bottoms = buildBottomsChecklist(code);
  return `
    <section class="fit7-grid">
      ${renderFitCard('tops', tops)}
      ${renderFitCard('bottoms', bottoms)}
    </section>
  `;
}

// ==================================================
// 相性（服シェア）
// ==================================================
const WEIGHTS = { tops:{frame:0.40,surface:0.10,balance:0.30,line:0.20}, bottoms:{frame:0.10,surface:0.30,balance:0.40,line:0.20} };
const KEEP    = { tops:{frame:0.50,surface:0.55,balance:0.35,line:0.60}, bottoms:{frame:0.60,surface:0.45,balance:0.20,line:0.55} };
const BASE_AFFINITY = { WAVE:{WAVE:1.00,NATURAL:0.92,STRAIGHT:0.85}, NATURAL:{WAVE:0.92,NATURAL:1.00,STRAIGHT:0.90}, STRAIGHT:{WAVE:0.85,NATURAL:0.90,STRAIGHT:1.00} };
// ---- safety wrapper ----
const _SAFE = {
  ALL: (Array.isArray(window.ALL_CODES_ORDERED) ? window.ALL_CODES_ORDERED.slice() : []),
  TYPE_META: (typeof window.TYPE_META !== 'undefined') ? window.TYPE_META : {},
  axisPercent: (typeof window.axisPercent === 'function')
    ? window.axisPercent
    : (key) => ({ pct: 50 }),
  log: (...args) => { try { console.warn('[compat]', ...args); } catch(_){} },
};

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
// 既存 getShareCompatibility をこの版に置き換え
function getShareCompatibility(code){
  try {
    const ALL = _SAFE.ALL.length ? _SAFE.ALL : (_SAFE.log('ALL_CODES_ORDERED 未定義'), []);
    const candidates = ALL.filter(c => c && c !== code);

    const topsArr = candidates
      .map(c => ({ code:c, score: toPercent( compatCore(code, c, 'tops') ) }))
      .sort((a,b)=> b.score - a.score);

    const bottomsArr = candidates
      .map(c => ({ code:c, score: toPercent( compatCore(code, c, 'bottoms') ) }))
      .sort((a,b)=> b.score - a.score);

    return {
      // 互換維持（既存UI用）
      topsBest: topsArr[0] || null,
      topsNext: topsArr.slice(1, 6),
      bottomsBest: bottomsArr[0] || null,
      bottomsNext: bottomsArr.slice(1, 6),
      topsAll: topsArr.map(t=>t.code),
      bottomsAll: bottomsArr.map(b=>b.code),

      // ★新規：スコア付きフル配列
      topsFull: topsArr,
      bottomsFull: bottomsArr,
    };
  } catch (e) {
    _SAFE.log('getShareCompatibility error', e);
    return {
      topsBest:null, topsNext:[], bottomsBest:null, bottomsNext:[],
      topsAll:[], bottomsAll:[], topsFull:[], bottomsFull:[]
    };
  }
}
try { window.getShareCompatibility = getShareCompatibility; } catch(_){}
function renderShareAllHTML(code){
  const compat = getShareCompatibility(code);
  const section = (title, arr) => `
    <div class="card" style="margin-top:12px">
      <h3>${title}</h3>
      <div class="compat-grid">
        ${arr.map((x,i)=>`
          <div class="compat-item ${i===0?'is-best':''}">
            <div class="label">${labelOf(x.code)}</div>
            <div class="score">相性 ${x.score}%</div>
            <div class="match-meter"><i style="width:${x.score}%"></i></div>
            <button class="btn small" onclick="goDetails('${x.code}')">詳細を見る</button>
          </div>
        `).join('')}
      </div>
    </div>`;
  return section('👕 TOPS/アウター 相性（全タイプ）', compat.topsFull)
       + section('👖 BOTTOMS 相性（全タイプ）',      compat.bottomsFull);
}
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

const DETAIL_PAGE = 'detail.html'; // 詳細ページがあるなら 'detail.html'
// premium/resultView.js どこかのグローバルに
function goDetails(code){
  // detailsページがない場合はギャラリーにフォールバック
  const url = DETAIL_PAGE ? `${DETAIL_PAGE}?code=${encodeURIComponent(code)}` 
                          : `gallery.html?code=${encodeURIComponent(code)}`;
  location.href = url;
}

// 追加Tipsのルール（スコア帯ごとに出す文言）
const TIP_RULES = {
  frame: [
    { when: p => p >= 70, add: {
      diet_do:    ["高たんぱく＋低脂質を中心に、食事は面で摂る（汁物＋副菜で満腹度）"],
      train_cardio:["LSD（30–45分）を週2〜3。関節に優しい負荷で継続"],
      care:       ["肩甲骨まわりの可動域UP（Y字ストレッチ/壁天使）を毎日3分"],
      quick:      "夜の炭水化物は低GIに寄せるだけで翌朝のむくみが軽くなる"
    }},
    { when: p => p <= 30, add: {
      diet_do:    ["ミネラル（Mg/K）を意識。海藻/豆/ナッツを毎日少量"],
      train_strength:["自重＋PNFストレッチで“骨”の可動域を広げる→姿勢を整える"],
      mobility:   ["胸郭の呼吸エクサ（4-4-8呼吸）で体幹の安定感を出す"],
      quick:      "食事は“噛む回数”を増やして咀嚼由来の体幹活性を誘発"
    }},
  ],
  surface: [
    { when: p => p >= 70, add: {
      lines:      ["縦に1本“強い線”（センタープレス/前立て/ロングネックレス）を置く"],
      care:       ["ヒップハンガーを避け、ベルト位置で“面の分節”をつくる"],
      quick:      "アウターは“丈で支配”。ヒップ中間〜下で迷ったら下を選ぶ"
    }},
    { when: p => p <= 30, add: {
      lines:      ["サイドに逃すドレープ/比翼の軽さでフレームを狭く見せる"],
      train_strength:["外転筋/中殿筋の活性（クラムシェル20回×2）で腰幅の見えを補正"],
      quick:      "上は短く・下は落ち感で“Y字”を意識（視覚重心↓）"
    }},
  ],
  balance: [
    { when: p => p >= 70, add: {
      lines:      ["V/ボート/深めのUで鎖骨〜胸元の“逃げ”を作る"],
      train_strength:["広背筋/僧帽中部（ラットプル/フェイスプル）で上重心の厚みを整える"],
      quick:      "トップスは前だけINで脚を長く、腹部の厚みは見せない"
    }},
    { when: p => p <= 30, add: {
      lines:      ["ハイウエスト＋落ち感で“脚長＞脚幅”の印象を最優先"],
      care:       ["腸腰筋ストレッチで骨盤の前傾を微修正→下重心のダルさ解消"],
      quick:      "靴は甲浅/つま先やや尖りで“足の線を長く”見せる"
    }},
  ],
  line: [
    { when: p => p >= 70, add: {
      lines:      ["センタープレス/直線切替/比翼：曲線を“相殺”する直線を1つ入れる"],
      accessories:["角のある金属/シャープな矩形で線を強調"],
      quick:      "柄はピンスト/ウィンドウペンなど細い直線を選ぶ"
    }},
    { when: p => p <= 30, add: {
      lines:      ["バイアス/ギャザーは“1箇所だけ”に限定し、広がり過ぎを防ぐ"],
      accessories:["丸み/小粒/透け素材で硬さを緩和"],
      quick:      "襟はラウンド/ハート/スカーフタイの“1つ”で十分"
    }},
  ],
};

// BODY_TIPS（ベース）＋ 追加Tips（スコア別）を合成
function buildPersonalizedTips(code){
  const base = (window.BODY_TIPS && BODY_TIPS[code]) || {};
  const add  = { diet_do:[], diet_avoid:[], train_strength:[], train_cardio:[], mobility:[], care:[], lines:[], accessories:[] };
  const pf = axisPercent('frame').pct;
  const ps = axisPercent('surface').pct;
  const pb = axisPercent('balance').pct;
  const pl = axisPercent('line').pct;

  const apply = (list, pct)=>{
    if (!list) return;
    for (const rule of list){
      try{
        if (rule.when(pct)) {
          Object.keys(rule.add).forEach(k=>{
            const v = rule.add[k];
            if (Array.isArray(v)) add[k].push(...v);
            else if (typeof v === 'string') add[k].push(v);
          });
        }
      }catch(_){}
    }
  };
  apply(TIP_RULES.frame,   pf);
  apply(TIP_RULES.surface, ps);
  apply(TIP_RULES.balance, pb);
  apply(TIP_RULES.line,    pl);

  // マージ（重複除去）
  const uniq = arr => Array.from(new Set((arr||[]).filter(Boolean)));
  const merged = {
    goal: base.goal || "",
    diet_do:       uniq([...(base.diet_do||[]),       ...add.diet_do]),
    diet_avoid:    uniq([...(base.diet_avoid||[]),    ...add.diet_avoid]),
    train_strength:uniq([...(base.train_strength||[]),...add.train_strength]),
    train_cardio:  uniq([...(base.train_cardio||[]),  ...add.train_cardio]),
    mobility:      uniq([...(base.mobility||[]),      ...add.mobility]),
    care:          uniq([...(base.care||[]),          ...add.care]),
    lines:         uniq([...(base.lines||[]),         ...add.lines]),
    accessories:   uniq([...(base.accessories||[]),   ...add.accessories]),
    quick:         base.quick || add.quick || ""
  };
  return merged;
}

// 個別Tipsの描画（既存の renderBodyTipsHTML を差し替え）
function renderBodyTipsHTML(code) {
  const t = buildPersonalizedTips(code);
  const li = arr => (arr || []).map(x => `<li>• ${x}</li>`).join('');
  const pastel = { BN:"#ffd6e8", BW:"#ffe8d6", MN:"#e8ffd6", MW:"#d6f3ff", B:"#f8e1ff", M:"#fff5d6" }[code.slice(0,2)] || "#f0f0f0";
  return `
  <div class="card cute-tips" style="--tone:${pastel}">
    <h3>💖 Body Balance Tips（あなた向け）</h3>
    ${t.goal ? `<p class="goal">🎯 ${t.goal}</p>` : ""}
    <div class="tips-row">
      <div class="tips-col">
        <h4>🍎 食事</h4>
        ${t.diet_do?.length ? `<p class="label">食べるべき！</p><ul>${li(t.diet_do)}</ul>` : ""}
        ${t.diet_avoid?.length ? `<p class="label">避けるべき！</p><ul>${li(t.diet_avoid)}</ul>` : ""}
        ${t.accessories?.length ? `<p class="label">アクセ/小物</p><ul>${li(t.accessories)}</ul>` : ""}
      </div>
      <div class="tips-col">
        <h4>🏃‍♀️ 運動・ライン設計</h4>
        ${t.train_strength?.length ? `<p class="label">筋トレ</p><ul>${li(t.train_strength)}</ul>` : ""}
        ${t.train_cardio?.length ? `<p class="label">有酸素</p><ul>${li(t.train_cardio)}</ul>` : ""}
        ${t.lines?.length ? `<p class="label">ライン設計</p><ul>${li(t.lines)}</ul>` : ""}
      </div>
    </div>
    ${(t.mobility?.length || t.care?.length) ? `
      <div class="tips-extra">
        <h4>🧘‍♀️ ケア・姿勢</h4>
        <ul>${li(t.mobility)}${li(t.care)}</ul>
      </div>` : ``}
    ${t.quick ? `<p class="quick"><b>✨Quick Win：</b>${t.quick}</p>` : ""}
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
// ========== cute share UI ==========
// どこでも使える固定幅メーター
// 固定幅のかわいいメーター（SVG不使用）
function heartMeter(score, size='m'){
  const pct = Math.max(0, Math.min(100, Number(score)||0));
  const cls = size==='s' ? 'meter-s' : size==='l' ? 'meter-l' : 'meter-m';
  return `
    <div class="cute-meter ${cls}" aria-label="match ${pct}%">
      <div class="cm-track">
        <div class="cm-fill" style="width:${pct}%"></div>
      </div>
      <div class="cm-label">${pct}%</div>
    </div>
  `;
}
// カードのバッジ色（コード先頭2文字でパステルを変える）
function pastelBadge(code){
  const key = (code||'').slice(0,2);
  const map = {
    BN:'linear-gradient(135deg,#ffd6e8,#ffe9f3)',
    BW:'linear-gradient(135deg,#ffe8d6,#fff3e4)',
    MN:'linear-gradient(135deg,#e8ffd6,#f2ffe8)',
    MW:'linear-gradient(135deg,#d6f3ff,#e9f8ff)',
    BU:'linear-gradient(135deg,#f8e1ff,#f3ebff)',
    MU:'linear-gradient(135deg,#fff5d6,#fff8e8)',
  };
  return map[key] || 'linear-gradient(135deg,#f1f3f5,#ffffff)';
}

// 16タイプの可愛いカード要素生成
// 16タイプのカード（そのまま使える）
// ========== かわいい16カード（TOPS/BOTTOMSを1カードに統合） ==========
function renderCuteCard16Combined(baseCode, otherCode){
  const meta   = (window.TYPE_META && TYPE_META[otherCode]) || {};
  const scoreT = toPercent( compatCore(baseCode, otherCode, 'tops') );
  const scoreB = toPercent( compatCore(baseCode, otherCode, 'bottoms') );
  const emoji  = meta.emoji || '✨';
  const name   = meta.name  || otherCode;

  return `
  <div class="cute-card16" data-code="${otherCode}" onclick="goDetails('${otherCode}')">
    <div class="cute-card16-head">
      <div class="cc16-badge">
        <div class="cc16-emoji" style="--badge-grad:${pastelBadge(otherCode)}">${emoji}</div>
        <div>
          <div class="cc16-code">${otherCode}</div>
          <small class="cc16-name">${name}</small>
        </div>
      </div>
      <div class="cc16-score">
        <span>TOPS ${scoreT}%</span> ・ <span>BOTTOMS ${scoreB}%</span>
      </div>
    </div>
    <div class="cute-card16-body">
      <div class="mini">
        <span>TOPS</span>
        ${heartMeter(scoreT,'s')}
        <b>${scoreT}%</b>
      </div>
      <div class="mini">
        <span>BOTTOMS</span>
        ${heartMeter(scoreB,'s','blue')}
        <b>${scoreB}%</b>
      </div>
    </div>
  </div>`;
}

// ========== 16タイプ一覧（1グリッド統合＋検索・並替） ==========
function renderCuteAll16Combined(baseCode, compat){
  const topsAll    = compat?.topsAll    || [];
  const bottomsAll = compat?.bottomsAll || [];

  // topsAll の順を優先しつつ、bottomsAll の取りこぼしを後ろに追加
  const seen = new Set();
  const order = [];
  topsAll.forEach(c=>{ if (c && !seen.has(c)) { seen.add(c); order.push(c); }});
  bottomsAll.forEach(c=>{ if (c && !seen.has(c)) { seen.add(c); order.push(c); }});

  const make = arr => arr.map(c => renderCuteCard16Combined(baseCode, c)).join('');

  return `
    <section class="cute-16 onegrid">

      <div class="cute-16-grid" data-pane="both">
        ${make(order)}
      </div>

      <div class="cute-legend">
        <span class="cute-dot"></span> TOPS相性
        <span class="cute-dot b"></span> BOTTOMS相性
      </div>
    </section>

    <script>
      (function(){
        const host   = document.currentScript.previousElementSibling; // .cute-16.onegrid
        const grid   = host.querySelector('.cute-16-grid[data-pane="both"]');
        const btnT   = host.querySelector('.pill[data-sort="tops"]');
        const btnB   = host.querySelector('.pill[data-sort="bottoms"]');
        const btnA   = host.querySelector('.pill[data-sort="abc"]');
        const search = host.querySelector('input[type="search"]');
        const pills  = [btnT, btnB, btnA].filter(Boolean);

        function sortCards(by){
          const cards = Array.from(grid.children);
          if (by === 'abc') {
            cards.sort((a,b)=> (a.dataset.code||'').localeCompare(b.dataset.code||''));
          } else if (by === 'bottoms') {
            // BOTTOMSスコア（カード内の b要素の2番目を読む）
            cards.sort((a,b)=>{
              const ab = +(a.querySelector('.cute-card16-body .mini:nth-child(2) b')?.textContent.replace('%','')||0);
              const bb = +(b.querySelector('.cute-card16-body .mini:nth-child(2) b')?.textContent.replace('%','')||0);
              return bb - ab;
            });
          } else {
            // TOPSスコア（カード内の b要素の1番目を読む）
            cards.sort((a,b)=>{
              const at = +(a.querySelector('.cute-card16-body .mini:nth-child(1) b')?.textContent.replace('%','')||0);
              const bt = +(b.querySelector('.cute-card16-body .mini:nth-child(1) b')?.textContent.replace('%','')||0);
              return bt - at;
            });
          }
          cards.forEach(c=>grid.appendChild(c));
        }

        // 初期：TOPSおすすめ順
        sortCards('tops');

        btnT?.addEventListener('click', ()=>{ pills.forEach(x=>x.classList.remove('active')); btnT.classList.add('active'); sortCards('tops'); });
        btnB?.addEventListener('click', ()=>{ pills.forEach(x=>x.classList.remove('active')); btnB.classList.add('active'); sortCards('bottoms'); });
        btnA?.addEventListener('click', ()=>{ pills.forEach(x=>x.classList.remove('active')); btnA.classList.add('active'); sortCards('abc'); });

        // 検索フィルタ（コード/名称）
        function applyFilter(){
          const q = (search.value||'').trim().toLowerCase();
          Array.from(grid.children).forEach(card=>{
            const code = (card.dataset.code||'').toLowerCase();
            const name = (card.querySelector('.cc16-name')?.textContent||'').toLowerCase();
            card.style.display = (!q || code.includes(q) || name.includes(q)) ? '' : 'none';
          });
        }
        search?.addEventListener('input', applyFilter);
      })();
    </script>
  `;
}

// ========== セクション全体：ベスト表示（TOPS/BOTTOMS）＋ 統合16一覧 ==========
function renderShareCardHTML(code){
  const compat = getShareCompatibility(code) || {};

  const makeRow = ({kind, best, next})=>{
    if (!best) return '';
    const title = kind==='tops' ? '👕 TOPS 相性' : '👖 BOTTOMS 相性';
    const lead  = kind==='tops'
      ? '肩〜襟の設計やシルエットが近いタイプだよ'
      : 'ウエスト位置や落ち感・ライン設計が近いタイプだよ';
    const chips = (next||[]).slice(0,6).map(x=>{
      const lbl = labelOf(x.code);
      return `<button class="chip pastel" onclick="goDetails('${x.code}')" title="${lbl}">${x.code}</button>`;
    }).join('');

    return `
      <div class="cute-block">
        <div class="cute-block-head">
          <div class="cute-title">${title}</div>
          <div class="cute-lead">${lead}</div>
        </div>

        <div class="cute-best">
          <div class="cute-best-main">
            <div class="cute-best-label">${labelOf(best.code)}</div>
            <div class="cute-best-score">💞 ${best.score}%</div>
          </div>
          ${heartMeter(best.score,'l')}
          <div class="cute-cta">
            <button class="btn primary small" onclick="goDetails('${best.code}')">このタイプを見る →</button>
          </div>
        </div>

        ${chips ? `<div class="cute-more">
          <span class="muted small">ほかにも相性が良いタイプ：</span>${chips}
        </div>` : ``}
      </div>`;
  };

  // タブは廃止。ベスト2段（TOPS/BOTTOMS）＋ 統合16グリッド
  const list16 = renderCuteAll16Combined(code, compat);

  return `
    <section class="card share-cute">
      <div class="share-head">
        <div class="share-badge">🫶 服シェア相性</div>
        <p class="muted small">上2文字一致＝TOPS／下2文字一致＝BOTTOMS（近さの目安だよ）</p>
      </div>

      ${makeRow({kind:'tops',    best:compat.topsBest,    next:compat.topsNext})}
      ${makeRow({kind:'bottoms', best:compat.bottomsBest, next:compat.bottomsNext})}

      ${list16}
    </section>
  `;
}
// ← HTMLに<script>を埋めても実行されないので、描画後に必ずこれを呼ぶ
function wireShareCute(){
  const root = document.querySelector('.share-cute');
  if (!root) return;

  // 上部タブ
  const topTabs = root.querySelectorAll('.share-tabs .tab');
  topTabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      topTabs.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const key = btn.dataset.block;
      root.querySelectorAll('.share-pane').forEach(p=>{
        p.classList.toggle('hidden', p.dataset.block !== key);
      });
    });
  });

  // 16一覧のタブ
  const listTabs = root.querySelectorAll('.cute-16 .tab');
  listTabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      listTabs.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.pane;
      root.querySelectorAll('.cute-16-grid').forEach(p=>{
        p.classList.toggle('hidden', p.dataset.pane !== target);
      });
    });
  });
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
  const mountId = window.__RESULT_MOUNT__ || 'app';
  const root = document.getElementById(mountId) || document.body;
  const { code, scores } = buildCode();
  const meta = window.TYPE_META?.[code] || { name:'未定義タイプ', base:'NATURAL', emoji:'', animal:'', image:'', concept:'', brandHints:[], styleNotes:[] };

  document.body.dataset.theme = meta.base || 'NATURAL';
root.innerHTML += renderFit7Block(code);
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
　　　　　　${celebHTML}
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
        </div>
      </div>
    </div>`;

  root.innerHTML=''; root.appendChild(el);
  root.insertAdjacentHTML('beforeend', renderFit7Block(code));
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