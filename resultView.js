// resultView.js (premium/app 共有・安全版)
// ==================================================
// 依存が足りなくても落ちないようにフォールバックを同梱
// ==================================================
// === [PATCH-1] Premium判定 & 取得 ===
window.API_URL = window.API_URL || "https://uk952hkt2e.execute-api.ap-northeast-1.amazonaws.com/prod";
const isPremium = () =>
  (document.body?.dataset?.page === 'premium') ||
  /premium\.html/.test(location.pathname);

// リトライ付きfetch（最大3回試行、指数バックオフ）
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      // ステータスコードが500番台の場合はリトライ
      if (response.status >= 500 && i < retries - 1) {
        console.log(`[Retry] ${i + 1}/${retries - 1} after ${delay}ms (status: ${response.status})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // 指数バックオフ
        continue;
      }
      return response;
    } catch (error) {
      if (i < retries - 1) {
        console.log(`[Retry] ${i + 1}/${retries - 1} after ${delay}ms (error: ${error.message})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
}

async function fetchStatsForDonut(API_URL){
  try{
    const r = await fetchWithRetry(API_URL + '/stats', { cache:'no-store' });
    if(!r.ok) throw 0;
    const d = await r.json();
    return {
      total: d.total || 0,
      byType: d.byType || {},
      byBase: d.byBase || { WAVE:0, NATURAL:0, STRAIGHT:0 }
    };
  }catch(_){
    return { total:0, byType:{}, byBase:{ WAVE:0, NATURAL:0, STRAIGHT:0 } };
  }
}

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
// ===== 320通りのパレット定義（タイプ×シーズン×5色） =====
// 例：BNLSのみ本定義。他タイプは必要に応じて埋める。
// 5色それぞれに "hex" と "name"（画面に出すラベル）を付けられる。


// ===== 320通りのパレット定義（タイプ×シーズン×5色） =====
// ==== (A) タイプ×シーズン（5色） ====
// まずは BNLS だけ具体定義。他タイプは同じ形で追記していけばOK。
// ===== 16タイプ × 4シーズン × 5色（Q1：厳選5色） =====
// 既存があればマージされる
window.PALETTE_BY_TYPE_SEASON = Object.assign({}, window.PALETTE_BY_TYPE_SEASON, {

  /* ============= WAVE 系（軽やか・やわらか・下重心） ============= */
  BNLS: { // Romantic Wave 🐨
    SU: [
      {hex:'#EDEBFF', name:'Lavender Mist'},
      {hex:'#D7E4FF', name:'Powder Sky'},
      {hex:'#F6D6E8', name:'Powder Pink'},
      {hex:'#E9EEF2', name:'Soft Veil'},
      {hex:'#CBD7E0', name:'Cool Porcelain'},
    ],
    WI: [
      {hex:'#E6F0FF', name:'Icy Blue'},
      {hex:'#EED9FF', name:'Iris Ice'},
      {hex:'#E8F6FF', name:'Crystal Aqua'},
      {hex:'#D8E1E8', name:'Steel Fog'},
      {hex:'#C5CCDB', name:'Blue Ash'},
    ],
    SP: [
      {hex:'#FFE9F1', name:'Blush Petal'},
      {hex:'#FFF3E0', name:'Vanilla Cream'},
      {hex:'#EAF8E6', name:'Mint Cream'},
      {hex:'#FFF7D6', name:'Soft Butter'},
      {hex:'#F5E6CF', name:'Cream Beige'},
    ],
    AU: [
      {hex:'#F7EADF', name:'Sand Beige'},
      {hex:'#EDE4CE', name:'Oat'},
      {hex:'#EAE1D7', name:'Mushroom'},
      {hex:'#E1E7DA', name:'Sage Fog'},
      {hex:'#EFD9C5', name:'Peach Nude'},
    ],
  },

  MNLC: { // Urban Elegance 🐺
    SU: [
      {hex:'#E9ECF2', name:'Fog Grey'},
      {hex:'#DADDE8', name:'Dove Blue'},
      {hex:'#F0E6EB', name:'Dusty Rose'},
      {hex:'#EAE6E0', name:'Greige'},
      {hex:'#D1D3D6', name:'Stone Mist'},
    ],
    WI: [
      {hex:'#E3ECFF', name:'Cool Haze'},
      {hex:'#D6DDEB', name:'Slate Veil'},
      {hex:'#F0DCF0', name:'Muted Mauve'},
      {hex:'#C9D2E1', name:'Pale Steel'},
      {hex:'#BFC6D4', name:'Blue Flint'},
    ],
    SP: [
      {hex:'#FFF0E0', name:'Apricot Milk'},
      {hex:'#FFE6EE', name:'Dusty Blush'},
      {hex:'#F2F5E8', name:'Pistachio Mist'},
      {hex:'#FFF6DC', name:'Light Chamomile'},
      {hex:'#EFE6D7', name:'Almond Beige'},
    ],
    AU: [
      {hex:'#ECE3D6', name:'Oatmeal'},
      {hex:'#E6DBC8', name:'Wheat'},
      {hex:'#DADFD5', name:'Sage Grey'},
      {hex:'#E2D8C7', name:'Sesame'},
      {hex:'#D2C8BA', name:'Malt'},
    ],
  },

  MWLC: { // Light Wave 🦋
    SU: [
      {hex:'#E8F0FF', name:'Air Blue'},
      {hex:'#EDF6FA', name:'Cloud'},
      {hex:'#F6E9F2', name:'Sheer Pink'},
      {hex:'#EAF2ED', name:'Light Mint'},
      {hex:'#E7EAEF', name:'Feather Grey'},
    ],
    WI: [
      {hex:'#E1EDFF', name:'Icy Sky'},
      {hex:'#E9E1FF', name:'Cool Lilac'},
      {hex:'#DAE8F7', name:'Glacier'},
      {hex:'#D8E3EA', name:'Pale Steel'},
      {hex:'#C9D5DF', name:'Frost Cloud'},
    ],
    SP: [
      {hex:'#FFEFE2', name:'Apricot Air'},
      {hex:'#FFE7F0', name:'Rose Meringue'},
      {hex:'#EAF7EE', name:'Mint Foam'},
      {hex:'#FFF8E1', name:'Vanilla Air'},
      {hex:'#F2E7D8', name:'Light Nougat'},
    ],
    AU: [
      {hex:'#F1E6DA', name:'Sand Air'},
      {hex:'#EAE1CF', name:'Oat Foam'},
      {hex:'#E6E8DE', name:'Soft Sage'},
      {hex:'#E9DCCD', name:'Peach Oat'},
      {hex:'#DCD2C6', name:'Bone'},
    ],
  },

  MWLS: { // Natural Girly 🐹
    SU: [
      {hex:'#F9EAF2', name:'Petal Cream'},
      {hex:'#FDEFE6', name:'Milk Peach'},
      {hex:'#EEF3F6', name:'Misty Blue'},
      {hex:'#F3EEE8', name:'Porcelain'},
      {hex:'#EADFE1', name:'Dusty Shell'},
    ],
    WI: [
      {hex:'#E8EFFF', name:'Ice Bell'},
      {hex:'#F0E3F7', name:'Powder Plum'},
      {hex:'#E6F5FF', name:'Clear Aqua'},
      {hex:'#DFE5EF', name:'Fog Steel'},
      {hex:'#CCD3E0', name:'Blue Pearl'},
    ],
    SP: [
      {hex:'#FFE8EE', name:'Strawberry Milk'},
      {hex:'#FFF3E2', name:'Butter Sugar'},
      {hex:'#EAF8EC', name:'Mint Jelly'},
      {hex:'#FFF6D8', name:'Lemon Soufflé'},
      {hex:'#F2E6D5', name:'Cookie Beige'},
    ],
    AU: [
      {hex:'#F3E4D7', name:'Warm Sand'},
      {hex:'#EAD9C8', name:'Biscuit'},
      {hex:'#E6E2D6', name:'Sesame Milk'},
      {hex:'#E1E6DC', name:'Herb Mist'},
      {hex:'#EBD5C6', name:'Peach Oat'},
    ],
  },

  MNLS: { // Classic Feminine 🕊
    SU: [
      {hex:'#F3EAF0', name:'Ballet Pink'},
      {hex:'#E9EDF7', name:'Blue Veil'},
      {hex:'#F5F1EA', name:'Ivory Silk'},
      {hex:'#E8ECF0', name:'Pearl Grey'},
      {hex:'#E2E6EE', name:'Swan Mist'},
    ],
    WI: [
      {hex:'#E8EEFF', name:'Crystal Blue'},
      {hex:'#F0E2F8', name:'Icy Orchid'},
      {hex:'#E6F4FA', name:'Snow Aqua'},
      {hex:'#DCE3EE', name:'Silver Fog'},
      {hex:'#C8D1E1', name:'Frost Steel'},
    ],
    SP: [
      {hex:'#FFEBF0', name:'Blossom'},
      {hex:'#FFF3E6', name:'Vanilla Rose'},
      {hex:'#ECF7EE', name:'Mint Lace'},
      {hex:'#FFF8E3', name:'Cream Scone'},
      {hex:'#EFE6D9', name:'Porcelain Beige'},
    ],
    AU: [
      {hex:'#EFE3D6', name:'Cafe au Lait'},
      {hex:'#E6DAC9', name:'Oat Latte'},
      {hex:'#E2E5DA', name:'Sage Cream'},
      {hex:'#E9DDD0', name:'Peach Beige'},
      {hex:'#DCD2C6', name:'Pumice'},
    ],
  },

  BNLC: { // Earth Wave 🐻
    SU: [
      {hex:'#EBE4DA', name:'Warm Porcelain'},
      {hex:'#E0E6E3', name:'Fog Sage'},
      {hex:'#E9DCD0', name:'Soft Taupe'},
      {hex:'#ECE6DE', name:'Pale Linen'},
      {hex:'#D5DBD3', name:'Moss Veil'},
    ],
    WI: [
      {hex:'#E2E8EF', name:'Steel Cloud'},
      {hex:'#D6DEE7', name:'Ash Blue'},
      {hex:'#E7E0EC', name:'Muted Orchid'},
      {hex:'#D5E1E1', name:'Glacier Sage'},
      {hex:'#C7D0D6', name:'Blue Flint'},
    ],
    SP: [
      {hex:'#FFEEDA', name:'Honey Cream'},
      {hex:'#FFE6E0', name:'Peach Milk'},
      {hex:'#EEF6EA', name:'Leaf Mist'},
      {hex:'#FFF5DF', name:'Butter Biscuit'},
      {hex:'#F1E4D2', name:'Oat Cream'},
    ],
    AU: [
      {hex:'#EADCC9', name:'Sandstone'},
      {hex:'#E4D3BD', name:'Wheat Husk'},
      {hex:'#D9E0D5', name:'Sage Leaf'},
      {hex:'#DACFC2', name:'Clay'},
      {hex:'#CFC6B9', name:'Shore Pebble'},
    ],
  },

  /* ============= NATURAL 系（広フレーム・余白・直線～曲線ミックス） ============= */
  BWUC: { // Urban Natural 🦄
    SU: [
      {hex:'#F0F2F5', name:'Paper White'},
      {hex:'#E7EBEF', name:'Cool Mist'},
      {hex:'#DFE3E6', name:'Soft Concrete'},
      {hex:'#EEF2F1', name:'Glass Grey'},
      {hex:'#EDEFF3', name:'Porcelain Blue'},
    ],
    WI: [
      {hex:'#E6ECF5', name:'Icy Steel'},
      {hex:'#DDE5EF', name:'Blue Slate'},
      {hex:'#EDE6F2', name:'Pale Iris'},
      {hex:'#DCE3E6', name:'Graphite Mist'},
      {hex:'#C9D2DB', name:'Cloud Iron'},
    ],
    SP: [
      {hex:'#F7F3EC', name:'Almond Milk'},
      {hex:'#F0F5F2', name:'Glass Mint'},
      {hex:'#F6EFEF', name:'Blush Porcelain'},
      {hex:'#FFF7EA', name:'Light Honey'},
      {hex:'#EEE8DE', name:'Feather Sand'},
    ],
    AU: [
      {hex:'#EDE5D8', name:'Light Canvas'},
      {hex:'#E6DED2', name:'Putty'},
      {hex:'#E1E6E0', name:'Stone Sage'},
      {hex:'#DCD4C8', name:'Pale Clay'},
      {hex:'#D4CCC0', name:'Bone Grey'},
    ],
  },

  BWUS: { // Fairy Natural 🦅
    SU: [
      {hex:'#EDF2F6', name:'Sky Veil'},
      {hex:'#EDEFF2', name:'Soft Chrome'},
      {hex:'#E7F1F6', name:'Silver Mist'},
      {hex:'#EEF3F8', name:'Sheer Ice'},
      {hex:'#E5E9ED', name:'Steel Powder'},
    ],
    WI: [
      {hex:'#E3EBF6', name:'Arctic Blue'},
      {hex:'#E9EEF5', name:'Frost Glass'},
      {hex:'#EDE7F3', name:'Icy Violet'},
      {hex:'#DDE4EA', name:'Zinc'},
      {hex:'#C9D3DD', name:'Alloy Blue'},
    ],
    SP: [
      {hex:'#F6F4EF', name:'Dust White'},
      {hex:'#F2F7F6', name:'Cloud Mint'},
      {hex:'#F9F0F0', name:'Rose Veil'},
      {hex:'#FFF7EC', name:'Pale Nectar'},
      {hex:'#ECE7DE', name:'Chalk Sand'},
    ],
    AU: [
      {hex:'#ECE5DB', name:'Sand Chrome'},
      {hex:'#E4DED5', name:'Feather Taupe'},
      {hex:'#E1E6E2', name:'Fog Sage'},
      {hex:'#DBD4CB', name:'Greige Clay'},
      {hex:'#D0C9C0', name:'Ash Oat'},
    ],
  },

  BWLC: { // Classic Natural 🦊
    SU: [
      {hex:'#E9EEF2', name:'Shell Grey'},
      {hex:'#EAF4F1', name:'Linen Mint'},
      {hex:'#EEF2F6', name:'Blue Cotton'},
      {hex:'#F3F1ED', name:'Chalk'},
      {hex:'#E3E7EA', name:'Pebble Blue'},
    ],
    WI: [
      {hex:'#DEE6F0', name:'Polar Steel'},
      {hex:'#E6E9F2', name:'Cloud Navy'},
      {hex:'#EDE6F0', name:'Mauve Fog'},
      {hex:'#D8E0E7', name:'Stone Blue'},
      {hex:'#C9D3DB', name:'Cold Flint'},
    ],
    SP: [
      {hex:'#F4EFE7', name:'Oat Milk'},
      {hex:'#ECF5F0', name:'Leaf Water'},
      {hex:'#F7F0F0', name:'Soft Rose'},
      {hex:'#FFF6E9', name:'Light Honey'},
      {hex:'#EDE6DA', name:'Sand Cream'},
    ],
    AU: [
      {hex:'#E8E0D4', name:'Warm Clay'},
      {hex:'#E1D8CA', name:'Linen Beige'},
      {hex:'#DEE4DB', name:'Sage Linen'},
      {hex:'#D9D0C5', name:'Driftwood'},
      {hex:'#CDC5BA', name:'Field Stone'},
    ],
  },

  BWLS: { // Pure Natural 🦌
    SU: [
      {hex:'#EDF3F0', name:'Moss Mist'},
      {hex:'#EAF0ED', name:'Leaf Veil'},
      {hex:'#F1F4F6', name:'Pale Fog'},
      {hex:'#F2EFEA', name:'Chalk Sand'},
      {hex:'#E3EBE6', name:'Soft Fern'},
    ],
    WI: [
      {hex:'#E1EAF0', name:'Frost Moss'},
      {hex:'#DFE8EE', name:'Glacier Grey'},
      {hex:'#E6EFEF', name:'Pale Teal'},
      {hex:'#DCE4E1', name:'Silver Sage'},
      {hex:'#C9D3D1', name:'Cold Lichen'},
    ],
    SP: [
      {hex:'#F2F6EF', name:'Young Leaf'},
      {hex:'#EAF5F0', name:'Water Mint'},
      {hex:'#F7F2EC', name:'Oat Foam'},
      {hex:'#FFF4E6', name:'Soft Nectar'},
      {hex:'#EDE6DC', name:'Shell Sand'},
    ],
    AU: [
      {hex:'#E7E0D3', name:'Field Oat'},
      {hex:'#DEE3DA', name:'Sage Dust'},
      {hex:'#E6DED0', name:'Canvas'},
      {hex:'#D7D0C6', name:'Boulder'},
      {hex:'#CFC7BB', name:'Dry Reed'},
    ],
  },

  /* ============= STRAIGHT 系（直線・厚み・上重心・コントラスト） ============= */
  BNUS: { // Sporty Cool 🐆
    SU: [
      {hex:'#EDEFF4', name:'Cool Chalk'},
      {hex:'#DDE3EE', name:'Steel Blue'},
      {hex:'#E9E9EA', name:'Chrome'},
      {hex:'#F3EDF0', name:'Platinum Rose'},
      {hex:'#D5DBE7', name:'Blue Graphite'},
    ],
    WI: [
      {hex:'#E2E7F2', name:'Icy Steel'},
      {hex:'#D6DBE7', name:'Cold Slate'},
      {hex:'#F0E6ED', name:'Muted Mauve'},
      {hex:'#D0D7E4', name:'Storm Blue'},
      {hex:'#B6BFD0', name:'Gunmetal Blue'},
    ],
    SP: [
      {hex:'#F5F2ED', name:'Ivory Chalk'},
      {hex:'#F0F7F4', name:'Glass Mint'},
      {hex:'#FAEEF1', name:'Blush Chrome'},
      {hex:'#FFF5E8', name:'Nectar'},
      {hex:'#EAE4DA', name:'Birch'},
    ],
    AU: [
      {hex:'#E6DED2', name:'Fawn'},
      {hex:'#DDD3C6', name:'Clay Stone'},
      {hex:'#D8DED8', name:'Sage Alloy'},
      {hex:'#D1C8BC', name:'Drift Clay'},
      {hex:'#C6BDB1', name:'Pewter Sand'},
    ],
  },

  MWUC: { // Elegant Straight 🦈
    SU: [
      {hex:'#EEF0F7', name:'Blue Porcelain'},
      {hex:'#E9EDF3', name:'Soft Chrome'},
      {hex:'#F1EAF0', name:'Powder Lilac'},
      {hex:'#E6F1F4', name:'Aqua Glass'},
      {hex:'#DCE2EB', name:'Cold Mist'},
    ],
    WI: [
      {hex:'#DEE6F3', name:'Glacier Steel'},
      {hex:'#E8E1F0', name:'Icy Iris'},
      {hex:'#DDEBF1', name:'Crystal Teal'},
      {hex:'#D5DCE6', name:'Iron Blue'},
      {hex:'#C3CBD8', name:'Blue Graphite'},
    ],
    SP: [
      {hex:'#F7F1F4', name:'Rose Porcelain'},
      {hex:'#EFF7F4', name:'Light Aqua'},
      {hex:'#FFF4E8', name:'Pearl Nectar'},
      {hex:'#F2ECE4', name:'Silk Beige'},
      {hex:'#E7E1DA', name:'Shell'},
    ],
    AU: [
      {hex:'#E7DED2', name:'Camel Milk'},
      {hex:'#DED5C8', name:'Clay Beige'},
      {hex:'#D8E0DB', name:'Slate Sage'},
      {hex:'#D5CCC0', name:'Warm Pebble'},
      {hex:'#CBC3B8', name:'Ash Taupe'},
    ],
  },

  MNUC: { // Glamorous Cool 🐅
    SU: [
      {hex:'#ECEFF6', name:'Ice Cloud'},
      {hex:'#E6EAF2', name:'Blue Smoke'},
      {hex:'#F1E9EF', name:'Bare Mauve'},
      {hex:'#EDE8E1', name:'Pale Truffle'},
      {hex:'#D8DDE8', name:'Storm Grey'},
    ],
    WI: [
      {hex:'#E1E6F2', name:'Polar Blue'},
      {hex:'#DADFEB', name:'Iron Slate'},
      {hex:'#EDE4EE', name:'Frost Plum'},
      {hex:'#D3DAE6', name:'Steel Mist'},
      {hex:'#C1C8D6', name:'Blue Stone'},
    ],
    SP: [
      {hex:'#F6EFEA', name:'Ivory Truffle'},
      {hex:'#F3F7F4', name:'Sea Glass'},
      {hex:'#FAEEF2', name:'Rose Ash'},
      {hex:'#FFF3E6', name:'Apricot Silk'},
      {hex:'#E9E1D7', name:'Almond'},
    ],
    AU: [
      {hex:'#E6DBCD', name:'Biscotti'},
      {hex:'#DDD2C3', name:'Warm Clay'},
      {hex:'#D6DED6', name:'Green Alloy'},
      {hex:'#D1C7BA', name:'Stone Beige'},
      {hex:'#C6BCB0', name:'Taupe Rock'},
    ],
  },

  MNUS: { // Romantic Mode 🦚
    SU: [
      {hex:'#F0EAF2', name:'Powder Orchid'},
      {hex:'#E7EDF6', name:'Blue Veil'},
      {hex:'#EFE7EC', name:'Pale Rose'},
      {hex:'#ECEFF2', name:'Pearl Chrome'},
      {hex:'#D9DEE9', name:'Slate Blue'},
    ],
    WI: [
      {hex:'#E7ECF7', name:'Crystal Steel'},
      {hex:'#EDE4F1', name:'Icy Violet'},
      {hex:'#E3EDF2', name:'Cool Aqua'},
      {hex:'#D7DEE9', name:'Blue Quartz'},
      {hex:'#C5CDDB', name:'Shadow Blue'},
    ],
    SP: [
      {hex:'#F7EEF2', name:'Silk Rose'},
      {hex:'#EFF7F6', name:'Mist Mint'},
      {hex:'#FFF2E7', name:'Peach Pearl'},
      {hex:'#F1EAE2', name:'Ivory Taupe'},
      {hex:'#E8E1DA', name:'Shell Beige'},
    ],
    AU: [
      {hex:'#E7DDD0', name:'Canvas Beige'},
      {hex:'#DED4C6', name:'Oat Clay'},
      {hex:'#DCE2DC', name:'Sage Veil'},
      {hex:'#D7CEC2', name:'Warm Stone'},
      {hex:'#CBC3B7', name:'Dust Taupe'},
    ],
  },

  MWUS: { // Soft Active 🐬
    SU: [
      {hex:'#E9EFF4', name:'Flow Blue'},
      {hex:'#E6F2F3', name:'Aqua Mist'},
      {hex:'#EEF1F6', name:'Ice Wave'},
      {hex:'#F1ECE9', name:'Pale Shell'},
      {hex:'#DBE2EA', name:'Spray Grey'},
    ],
    WI: [
      {hex:'#DEE9F2', name:'Glacier Aqua'},
      {hex:'#D7E2EC', name:'Stream Steel'},
      {hex:'#E7E1EE', name:'Cool Lilac'},
      {hex:'#D0DAE6', name:'River Blue'},
      {hex:'#BCC7D6', name:'Deep Spray'},
    ],
    SP: [
      {hex:'#F1F7F6', name:'Mint Foam'},
      {hex:'#EFF3FA', name:'Blue Vapor'},
      {hex:'#FAF0F0', name:'Rose Breeze'},
      {hex:'#FFF4E9', name:'Apricot Air'},
      {hex:'#EAE5DC', name:'Light Drift'},
    ],
    AU: [
      {hex:'#E5DCCE', name:'Sand Drift'},
      {hex:'#DDD3C5', name:'Clay Mist'},
      {hex:'#D7E0DB', name:'Sage Surf'},
      {hex:'#D2C9BC', name:'Shore Taupe'},
      {hex:'#C8BFB3', name:'Pebble'},
    ],
  },

  BNUC: { // Structural Mode 🦉
    SU: [
      {hex:'#ECEFF3', name:'Architect White'},
      {hex:'#E0E5EF', name:'Blueprint Blue'},
      {hex:'#F0E8EE', name:'Quartz Mauve'},
      {hex:'#E8ECEF', name:'Concrete Mist'},
      {hex:'#D5DCE8', name:'Steel Beam'},
    ],
    WI: [
      {hex:'#DDE3EF', name:'Polar Steel'},
      {hex:'#D3DAE9', name:'Cold Slate'},
      {hex:'#E8E1EC', name:'Violet Fog'},
      {hex:'#CCD4E1', name:'Graphite Blue'},
      {hex:'#B9C3D2', name:'Carbon Blue'},
    ],
    SP: [
      {hex:'#F4F2EE', name:'Porcelain'},
      {hex:'#EEF5F4', name:'Glass Mint'},
      {hex:'#F8EEF2', name:'Soft Rose'},
      {hex:'#FFF4E7', name:'Ivory Nectar'},
      {hex:'#E8E2DA', name:'Limestone'},
    ],
    AU: [
      {hex:'#E4DACD', name:'Pale Clay'},
      {hex:'#DACFBE', name:'Sandstone'},
      {hex:'#D6DDD8', name:'Alloy Sage'},
      {hex:'#CDC3B6', name:'Ash Taupe'},
      {hex:'#C2B9AD', name:'Cement'},
    ],
  },
});


/* =========================
   1) ベース×シーズンの基準5色（Light / Soft / Accent / Neutral / Dark）
   ここを好みで微調整すれば、全320色が自動で追従します
========================= */
const BASE = {
  WAVE: {
    SU: [
      {hex:'#F2F3FF', name:'Icy Lavender'},
      {hex:'#DCE7FF', name:'Powder Sky'},
      {hex:'#FF9BC9', name:'Rose Accent'},
      {hex:'#E6E9F0', name:'Porcelain'},
      {hex:'#52627A', name:'Ink Blue'},
    ],
    WI: [
      {hex:'#EAF2FF', name:'Crystal Blue'},
      {hex:'#EEDCFF', name:'Frost Lilac'},
      {hex:'#00B8D9', name:'Cool Aqua'},
      {hex:'#DDE2EA', name:'Chrome Veil'},
      {hex:'#2C3A58', name:'Carbon Navy'},
    ],
    SP: [
      {hex:'#FFF4EC', name:'Milk Apricot'},
      {hex:'#FFE6F0', name:'Sheer Rose'},
      {hex:'#00C781', name:'Fresh Mint'},
      {hex:'#EEE7DC', name:'Canvas Beige'},
      {hex:'#6C5E4E', name:'Soft Cocoa'},
    ],
    AU: [
      {hex:'#F4E9DA', name:'Sand Mist'},
      {hex:'#E8E1D2', name:'Oat Foam'},
      {hex:'#D98D3E', name:'Spice Orange'},
      {hex:'#E2D9CC', name:'Clay Greige'},
      {hex:'#5B5046', name:'Deep Umber'},
    ],
  },
  NATURAL: {
    SU: [
      {hex:'#F3F5F7', name:'Paper White'},
      {hex:'#E4EAF0', name:'Fog Grey'},
      {hex:'#6BA8FF', name:'Blue Accent'},
      {hex:'#E9E6DF', name:'Stone Canvas'},
      {hex:'#4A5968', name:'Slate'},
    ],
    WI: [
      {hex:'#ECF0F6', name:'Frost Mist'},
      {hex:'#E6E7F1', name:'Icy Mauve'},
      {hex:'#3BC0BF', name:'Teal Accent'},
      {hex:'#E0E4EA', name:'Steel Veil'},
      {hex:'#2E3B47', name:'Graphite'},
    ],
    SP: [
      {hex:'#F7F3EC', name:'Almond Milk'},
      {hex:'#EEF6F1', name:'Leaf Water'},
      {hex:'#FF8E6E', name:'Coral Accent'},
      {hex:'#EFE7DA', name:'Warm Canvas'},
      {hex:'#5E5A50', name:'Field Taupe'},
    ],
    AU: [
      {hex:'#EFE6D6', name:'Pale Clay'},
      {hex:'#E2D8C8', name:'Linen Beige'},
      {hex:'#7FA37A', name:'Sage Accent'},
      {hex:'#E1DDD3', name:'Bone Grey'},
      {hex:'#51483F', name:'Bark'},
    ],
  },
  STRAIGHT: {
    SU: [
      {hex:'#F4F6FA', name:'Cool Chalk'},
      {hex:'#E1E6F0', name:'Steel Mist'},
      {hex:'#2979FF', name:'Royal Blue'},
      {hex:'#E8EAEF', name:'Chrome Neutral'},
      {hex:'#273244', name:'Navy Ink'},
    ],
    WI: [
      {hex:'#EEF2F8', name:'Polar White'},
      {hex:'#E6E9F5', name:'Icy Iris'},
      {hex:'#E5006E', name:'Fuchsia'},
      {hex:'#DDE2EB', name:'Cold Porcelain'},
      {hex:'#1D2938', name:'Carbon'},
    ],
    SP: [
      {hex:'#F9F4EE', name:'Ivory'},
      {hex:'#EAF6F2', name:'Sea Glass'},
      {hex:'#FF9C2B', name:'Marigold'},
      {hex:'#EDE5DB', name:'Shell Beige'},
      {hex:'#3E3A33', name:'Cocoa Ink'},
    ],
    AU: [
      {hex:'#EFE5D8', name:'Fawn'},
      {hex:'#E2D7C5', name:'Clay'},
      {hex:'#C2562E', name:'Terracotta'},
      {hex:'#DAD4C9', name:'Pewter'},
      {hex:'#3A312A', name:'Earth Brown'},
    ],
  }
};


/* =========================
   2) タイプ→ベース
========================= */

// ===== 取得ヘルパ（欠損時にも安全に5色返す） =====
window.getPaletteByTypeSeason = function getPaletteByTypeSeason(code, season){
  const fallback = [
    {hex:'#F2F2F2', name:'Neutral-1'},
    {hex:'#E6E6E6', name:'Neutral-2'},
    {hex:'#DADADA', name:'Neutral-3'},
    {hex:'#CECECE', name:'Neutral-4'},
    {hex:'#C2C2C2', name:'Neutral-5'},
  ];
  const store = window.PALETTE_BY_TYPE_SEASON || {};
  const pack = store[code] && store[code][season];
  if (Array.isArray(pack) && pack.length >= 5) return pack.slice(0,5);
  return fallback;
};
// ---- プレフィックス別（先頭2文字: BN / BW / MN / MW）フォールバック ----
// ※ 季節タブ未指定時や TYPE_META.palette が無い時に使う「最低限の色」。
//   各配列は 5色 (hex) 固定。必要なら好きな色に差し替えてOK。
window.PALETTE_BY_PREFIX = window.PALETTE_BY_PREFIX || {
  BN: ['#F6D6E8','#EDEBFF','#CFE3F8','#DDE8EA','#C8D8CF'], // B骨格×N狭：柔らかい冷色寄り
  BW: ['#EAF7EF','#D6F3FF','#E3F0EE','#E8EDF7','#E7F0FF'], // B骨格×W広：ニュートラル清潔感
  MN: ['#FFF0DA','#FFE9EC','#FFF7D6','#F5E6CF','#EAF8E6'], // M肉×N狭：ライトで甘め
  MW: ['#F7EADF','#EDE4CE','#EAE1D7','#E1E7DA','#EFD9C5'], // M肉×W広：オータム寄りの落ち着き
};

// どこか共通jsに追加
function normalizeSeason(x){
  const s = String(x||'SU').trim().toLowerCase();
  if (s==='su' || s==='summer' || s==='sum' || s==='ブルベ夏') return 'SU';
  if (s==='wi' || s==='winter' || s==='win' || s==='ブルベ冬') return 'WI';
  if (s==='sp' || s==='spring' || s==='spr' || s==='イエベ春') return 'SP';
  if (s==='au' || s==='autumn' || s==='fall' || s==='イエベ秋') return 'AU';
  return 'SU';
}

function coerceColor(c){
  // もし {colors:[...]} みたいな入れ子なら先頭を採る
  if (c && typeof c==='object' && Array.isArray(c.colors) && c.colors.length){
    c = c.colors[0];
  }
  if (typeof c==='string'){
    let h = c.trim();
    if (!h.startsWith('#') && /^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(h)) h = '#'+h;
    return {hex:h, name:h};
  }
  if (c && typeof c==='object'){
    // hex候補を総当たり
    let h = c.hex || c.color || c.value || (c.hex && typeof c.hex==='object' ? c.hex.value : null)
          || (c.color && typeof c.color==='object' ? (c.color.hex||c.color.value) : null);
    h = String(h||'#CCCCCC').trim();
    if (!h.startsWith('#') && /^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(h)) h = '#'+h;

    // 表示名は ja > en > label > name > hex
    let n = (c.names && (c.names.ja||c.names.en))
         || (c.i18n && (c.i18n.ja||c.i18n.en))
         || c.label || c.name || h;
    return {hex:h, name:String(n)};
  }
  return {hex:'#CCCCCC', name:'#CCCCCC'};
}

function pickFromTypeSeason(code, season){
  const S = normalizeSeason(season);
  if (!code || !S) return null;
  const entry = window.PALETTE_BY_TYPE_SEASON?.[code]?.[S];
  if (!Array.isArray(entry) || entry.length < 1) return null;
  // 返り値を「{hex,name}」の配列に揃える
  return entry.map(v => typeof v === 'string' ? ({ hex:v, name:v }) : v);
}

// ==== (B) 季節フォールバック（タイプ未定義でも5色出す） ====
const BASE_SEASON_SETS = {
  SU: ['#EDEBFF','#CFE3F8','#F6D6E8','#DDE8EA','#C8D8CF'], // 夏
  WI: ['#D9E2FF','#F0D9FF','#E8F6FF','#D8E1E8','#C5CCDB'], // 冬
  SP: ['#FFF0DA','#FFE9EC','#EAF8E6','#FFF7D6','#F5E6CF'], // 春
  AU: ['#F7EADF','#EDE4CE','#EAE1D7','#E1E7DA','#EFD9C5'], // 秋
};
const BASE_COLOR_NAMES = {
  SU: ['Lavender Mist','Baby Blue','Powder Pink','Soft Grey','Seafoam'],
  WI: ['Icy Blue','Iris Ice','Crystal Aqua','Steel Fog','Blue Ash'],
  SP: ['Apricot','Blush','Mint Cream','Vanilla','Cream Beige'],
  AU: ['Sand Beige','Oat','Mushroom','Sage Fog','Peach Nude'],
};
function fallbackSeasonSetObj(season){
  const S = normalizeSeason(season) || 'SU';
  const arr = BASE_SEASON_SETS[S] || BASE_SEASON_SETS.SU;
  const names = BASE_COLOR_NAMES[S] || [];
  return arr.map((hex, i)=>({ hex, name: names[i] || hex }));
}
function getPalette5(code, season){
  const entry = (window.PALETTE_BY_TYPE_SEASON?.[code]?.[season]);
  if (Array.isArray(entry) && entry.length >= 5) return entry.slice(0,5);
  return fallbackSeasonSet(season);
}
function swatchNode(c){
  const hex  = (typeof c === 'string') ? c : (c?.hex || '#CCCCCC');
  const name = (typeof c === 'string') ? hex : (c?.name || hex);
  return `
    <div class="prm-swatch" title="${name}">
      <span style="background:${hex}"></span>
      <i>${name}</i>
    </div>
  `;
}
// 既存 swatchNode 定義のすぐ下に追記
window.swatchNode = window.swatchNode || swatchNode;
// Premiumヒーローの季節タブ配線（innerHTML挿入後に必ず呼ぶ）
function wirePremiumHero(root=document){
  const heroes = root.querySelectorAll('.prm-hero');
  heroes.forEach(hero=>{
    const code = (hero.id || '').replace(/^prm-/,'');
    const grid = hero.querySelector('.prm-swatch-grid');
    const tabs = hero.querySelectorAll('.prm-tabs .pill');
    if (!code || !grid || !tabs.length) return;

    function renderSeason(season){
      const pal = (window.getPaletteByCode && getPaletteByCode(code, { season })) || [];
      const norm = Array.isArray(pal) ? pal.map(coerceColor) : [];
      grid.innerHTML = norm.map(window.swatchNode).join('');
    }

    tabs.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        tabs.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const season = btn.dataset.season || null; // 'summer'|'winter'|'spring'|'autumn'
        let pal = (window.getPaletteByCode && getPaletteByCode(code, { season })) || [];
        if (!Array.isArray(pal)) pal = [];
        grid.innerHTML = pal.map(coerceColor).map(window.swatchNode).join('');
      });
    });
  });
}
// ==== (C) ユーザー季節の保存/読込 ====
function getUserSeason(){ return localStorage.getItem('km_season') || 'SU'; }
function setUserSeason(season){ try{ localStorage.setItem('km_season', season); }catch(_){} }

// ==== (D) 季節タブとスワッチ ====
function seasonTabsHTML(active){
  const tabs = [
    {k:'SU', label:'ブルベ夏'}, {k:'WI', label:'ブルベ冬'},
    {k:'SP', label:'イエベ春'}, {k:'AU', label:'イエベ秋'}
  ];
  return `
    <div class="season-tabs">
      ${tabs.map(t=>`
        <button class="pill ${active===t.k?'active':''}" data-season="${t.k}">
          ${t.label}
        </button>`).join('')}
    </div>`;
}

function renderSeasonPaletteBlock(code){
  const season = normalizeSeason(getUserSeason()) || 'SU';
  const list = getPaletteByCode(code, { season });
  return `
    <div class="prm-season" data-code="${code}">
      ${seasonTabsHTML(season)}
      <div class="prm-swatch-grid">
        ${list.map(swatchNode).join('')}
      </div>
    </div>`;
}

function wireSeasonTabsAll(root=document){
  root.querySelectorAll('.prm-season').forEach(host=>{
    const code = host.getAttribute('data-code') || '';
    host.querySelectorAll('.season-tabs .pill').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const s = btn.dataset.season;
        setUserSeason(s);
        const html = renderSeasonPaletteBlock(code);
        const temp = document.createElement('div');
        temp.innerHTML = html;
        host.replaceWith(temp.firstElementChild);
        wireSeasonTabsAll(root);
      });
    });
  });
}

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
// ---- Personal Color 4-season palettes (5 colors each) ----
const SEASON_PALETTES = {
  summer: [ // ブルベ夏：やわらかい・明度高め・彩度ひかえめ・涼感
    '#E8EDF7', '#D9E6F1', '#E8E0F3', '#F2E6EC', '#E3F0EE'
  ],
  winter: [ // ブルベ冬：高コントラスト・冷たい青み・クリア
    '#DDE3FF', '#CDE3FF', '#E3DBFF', '#F2D9E6', '#D9FFF5'
  ],
  spring: [ // イエベ春：明るい・黄み・クリアで軽い
    '#FFF1D9', '#FFE8C6', '#FFEFD6', '#FFF4E6', '#FFF7DE'
  ],
  autumn: [ // イエベ秋：深み・黄み・落ち着いたくすみ
    '#F3E3D1', '#E9D8C9', '#E6DEC8', '#F0E2CD', '#E6D7C7'
  ],
};
function wireSeasonTabsAll(root=document){
  const blocks = root.querySelectorAll('.prm-season');
  blocks.forEach(host=>{
    const code = host.getAttribute('data-code') || '';
    host.querySelectorAll('.season-tabs .pill').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const s = btn.dataset.season;
        setUserSeason(s);
        // 再描画
        const html = renderSeasonPaletteBlock(code);
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        host.replaceWith(tmp.firstElementChild);
        // 置き換えたので改めて配線
        wireSeasonTabsAll(root);
      });
    });
  });
}
// 明示指定があれば季節パレットを返す（なければnull）
function getSeasonPalette(season){
  const key = String(season||'').toLowerCase();
  return SEASON_PALETTES[key] || null;
}
// 既存 getPaletteByCode をこの形に差し替え（先に貼った版がある前提）
function getPaletteByCode(code, opts={}){
  const raw = opts.season || window.TYPE_META?.[code]?.season || window.USER_COLOR_SEASON || 'SU';
  const S   = normalizeSeason(raw); // SU/WI/SP/AU

  // 受け皿: どの形式でも最終的に [{hex,name},...] で返す
  const coerceList = (arr)=> (Array.isArray(arr) ? arr.flatMap(x=>{
    // 入れ子 [{colors:[...]}, ...] も吸収
    if (x && typeof x==='object' && Array.isArray(x.colors)) return x.colors.map(coerceColor);
    return [coerceColor(x)];
  }) : []);

  // ① 明示登録（16タイプ×4季節）
  const t = window.PALETTE_BY_TYPE_SEASON?.[code];
  if (t){
    // キーが 'SU' でも 'summer' でも拾う
    const bySU = t[S];
    const byWord = t[{SU:'summer',WI:'winter',SP:'spring',AU:'autumn'}[S]];
    const pal = coerceList(bySU||byWord);
    if (pal.length) return pal;
  }

  // ② 季節汎用（4シーズン定義）
  const seasonMap = {
    SU: ['#E8EDF7','#D9E6F1','#E8E0F3','#F2E6EC','#E3F0EE'],
    WI: ['#DDE3FF','#CDE3FF','#E3DBFF','#F2D9E6','#D9FFF5'],
    SP: ['#FFF1D9','#FFE8C6','#FFEFD6','#FFF4E6','#FFF7DE'],
    AU: ['#F3E3D1','#E9D8C9','#E6DEC8','#F0E2CD','#E6D7C7'],
  };
  const seasonPal = coerceList(seasonMap[S]);
  if (seasonPal.length) return seasonPal;

  // ③ 最終フォールバック（タイプ基調）
  const base = window.TYPE_META?.[code]?.base || 'NATURAL';
  const baseMap = {
    WAVE:     ['#FFE7F3','#FFEFF7','#FFE3EE','#FFF4FA','#FFEAF3'],
    STRAIGHT: ['#EAF1FF','#E3EAFF','#EDF2FF','#E7F0FF','#F1F6FF'],
    NATURAL:  ['#EAF7EF','#E4F5EE','#F0FBF5','#E8F9F0','#F2FCF7'],
  }[base] || ['#EEE','#DDD','#CCC','#BBB','#AAA'];
  return coerceList(baseMap);
}
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

// === Color normalizer: 文字列/入れ子オブジェクトを {hex,name} に揃える ===
function coerceColor(c){
  if (typeof c === 'string'){
    let h = c.trim();
    if (!h.startsWith('#') && /^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(h)) h = '#'+h;
    return { hex: h, name: h };
  }
  if (c && typeof c === 'object'){
    // hex候補を総当りで拾う（入れ子にも対応）
    let h = c.hex || c.color || c.value || (typeof c.hex === 'object' ? c.hex.value : null);
    if (h == null && typeof c.color === 'object') h = c.color.hex || c.color.value;
    h = String(h || '#CCCCCC').trim();
    if (!h.startsWith('#') && /^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(h)) h = '#'+h;

    // 表示名は ja > en > label > name > hex の優先
    let n = c.name || c.label || (c.names?.ja || c.names?.en) || (c.i18n?.ja || c.i18n?.en) || h;
    return { hex: h, name: String(n) };
  }
  return { hex:'#CCCCCC', name:'#CCCCCC' };
}

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
function profileFromCode(code){
  const [f,s,b,l] = String(code||'').trim().toUpperCase().split('');
  const pf = (f === 'B') ? 70 : 30;
  const ps = (s === 'W') ? 70 : 30;
  const pb = (b === 'U') ? 60 : 40;
  const pl = (l === 'S') ? 65 : 35;
  return {
    pf, ps, pb, pl,
    isStraight : (f === 'B'),
    isSoft     : (s === 'W'),
    upperHeavy : (b === 'U'),
    lowerHeavy : (b === 'L'),
    strongLine : (l === 'S'),
    softLine   : (l === 'C'),
  };
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
function buildTopsChecklist(code){
  const P0 = profileFromCode(code);
  const topsAvg    = averageAllTypes(code, 'tops');
  const bottomsAvg = averageAllTypes(code, 'bottoms');
  const P = { ...P0, prefer: (topsAvg >= bottomsAvg) ? 'tops' : 'bottoms' };
  const T = (t,h)=>({text:t, hint:h});
  const L = [];

  if (P.isStraight) L.push(T("肩線が肩先どんぴしゃ！","肩の縫い目が肩先。動いてもシワが寄らない"));
  else              L.push(T("肩の丸みに沿って落ちる","ドロショル/ラグランが馴染みやすい"));

  if (P.upperHeavy) L.push(T("首元にゆとりがある","V/深U/ボートで重心UPしにくい"));
  else              L.push(T("首元が詰まってる","上を埋めても下が重くならない"));

  if (P.strongLine) L.push(T("前立て/切替がまっすぐ！","縦線が波打たない"));
  else              L.push(T("ギャザー/ドレープが“1か所”のみ","入れ過ぎると横に広がる"));

  if (P.upperHeavy) L.push(T("丈がやや短め！","前だけINも効く"));
  else              L.push(T("丈が長いか","あなたは丈が長い方が整う！"));

  if (P.isSoft)     L.push(T("柔らかい素材か","テンセル/サテンなど"));
  else              L.push(T("ハリ素材か","ブロード/度詰めジャージー"));

  if (P.softLine)   L.push(T("袖が二の腕に貼りつかない","指1〜2本のすき間"));
  else              L.push(T("袖がストンと落ちる","肘上でたるまない"));
  return L.slice(0,6);
}
function buildBottomsChecklist(code){
  const P0 = profileFromCode(code);
  const topsAvg    = averageAllTypes(code, 'tops');
  const bottomsAvg = averageAllTypes(code, 'bottoms');
  const P = { ...P0, prefer: (topsAvg >= bottomsAvg) ? 'tops' : 'bottoms' };
  const T = (t,h)=>({text:t, hint:h});
  const L = [];
  if (P.lowerHeavy) L.push(T("ハイウエストで脚長＞脚幅か","INが効く"));
  else              L.push(T("ミッド〜ややローウエストか","腰位置を下げるとバランス良い"));

  if (P.isSoft)     L.push(T("太ももに貼りつかない落ち感素材か","ストレート/ワイド◎"));
  else              L.push(T("太ももがストンと落ちるか","センタープレスで補強"));

  if (P.strongLine) L.push(T("ピンタック/センタープレスがまっすぐか","横に広がらない"));
  else              L.push(T("お尻のラインがしっかり見えるか”","マーメイド/バイアスは入れすぎない"));

  L.push(T("腰まわりが浮かない＆食い込まない","座った時に痛くないのが基準"));

  if (P.softLine)   L.push(T("裾はフルレングス〜やや長めで線が伸びるか","甲浅の靴が相性◎"));
  else              L.push(T("裾は踝が少し見えるか","カッティングやスリットも良い"));

  if (P.isSoft)     L.push(T("素材がソフトか","硬い生地は横に張りやすい"));
  else              L.push(T("ハリのある素材か","柔らかすぎるとボケやすい"));
  return L.slice(0,6);
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
  function T(text, hint){ return { text, hint }; }




  const card = (kind, arr)=>`
    <section class="card premium-card fit7-card">
      <h3 class="premium-title">${kind==='tops' ? '👕 TOPS フィットチェック（6）' : '👖 BOTTOMS フィットチェック（6）'}</h3>
      <p class="muted small">4つ以上チェックが付いたら<strong>買い</strong>だよ。</p>
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
        （あと <span class="need-${kind}">4</span> 個で「買い」ライン）
      </div>
    </section>
  `;

  const html = `
    <div class="fit7-grid">
      ${card('tops', buildTopsChecklist(code))}
      ${card('bottoms', buildBottomsChecklist(code))}
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
              result.textContent = "✅ 4つ以上クリア！これは『買い』だよ";
            }else{
              needEl.textContent = 4 - c;
              result.textContent = "（あと " + (4 - c) + " 個で「買い」ライン）";
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

function renderFitCard(kind, items){
  return `
    <section class="card premium-card fit7-card">
      <h3 class="premium-title">${kind==='tops' ? '👕 TOPS フィットチェック（6）' : '👖 BOTTOMS フィットチェック（6）'}</h3>
      <p class="muted small">4つ以上チェックが付いたら<strong>買い</strong>だよ。</p>
      <div class="fit7-list">
        ${items.map(it=>`
          <div class="fit7-item">
            <label class="fit7-label">
              <input type="checkbox" class="fitcheck-${kind}">
              <span>${it.text}</span>
            </label>
            ${it.hint ? `<div class="fit7-pop">${it.hint}</div>` : ``}
          </div>
        `).join('')}
      </div>
      <div class="fit7-result fit7-result-${kind}">
        （あと <span class="need-${kind}">4</span> 個で「買い」ライン）
      </div>
    </section>
  `;
}

function renderFit7HTML(code){
  const tops    = buildTopsChecklist(code);
  const bottoms = buildBottomsChecklist(code);
  return `
    <section class="fit7-grid">
      ${renderFitCard('tops', tops)}
      ${renderFitCard('bottoms', bottoms)}
    </section>
    <script>
      (function(){
        function setup(kind){
          const boxes  = document.querySelectorAll('.fitcheck-' + kind);
          const result = document.querySelector('.fit7-result-' + kind);
          const needEl = document.querySelector('.need-' + kind);
          function update(){
            const c = Array.from(boxes).filter(b=>b.checked).length;
            if (c >= 5){
              result.textContent = "✅ 4つ以上クリア！これは『買い』だよ";
            } else {
              needEl.textContent = 4 - c;
              result.textContent = "（あと " + (4 - c) + " 個で「買い」ライン）";
            }
          }
          boxes.forEach(b=>b.addEventListener('change', update));
          update();
        }
        setup('tops'); setup('bottoms');
      })();
    </script>
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
// ========= Premium Cute Pack =========
// 呼び出し：_renderResultCore の最後で root.insertAdjacentHTML('beforeend', renderPremiumCutePack(code)); するだけ
function wireFit7(root = document){
  ['tops','bottoms'].forEach(kind=>{
    const boxes  = root.querySelectorAll('.fitcheck-' + kind);
    const result = root.querySelector('.fit7-result-' + kind);
    const needEl = root.querySelector('.need-' + kind);
    if(!boxes.length || !result || !needEl) return;
    const update = ()=>{
      const c = Array.from(boxes).filter(b=>b.checked).length;
      if (c >= 4) result.textContent = "✅ 4つ以上クリア！これは『買い』だよ";
      else { needEl.textContent = 4 - c; result.textContent = `（あと ${4-c} 個で「買い」ライン）`; }
    };
    boxes.forEach(b=>b.addEventListener('change', update));
    update();
  });
}
function renderPremiumCutePack(code){
  const meta = (window.TYPE_META?.[code]) || {};
  const label = meta.name || code;
  const animal = meta.animal || '✨';
  const emoji  = meta.emoji || '💎';
  const UID = `prm-${code}`;
  let currentSeason = (window.USER_COLOR_SEASON || (window.TYPE_META?.[code]?.season)) || null;
let palette = getPaletteByCode(code, { season: currentSeason });
  
  
  const sw = (hex)=> `
    <div class="prm-swatch" title="${hex}">
      <span style="background:${hex}"></span><i>${hex}</i>
    </div>
  `;

  const capCard = (title, items)=>`
    <div class="prm-cap">
      <h4>${title}</h4>
      <ul>${items.map(x=>`<li>${x}</li>`).join('')}</ul>
    </div>
  `;

  // 1) ヒーロー（ラベル＋サブ）
  const hero = `
    <section class="premium-card prm-hero" id="${UID}">
      <div class="prm-hero-left">
        <div class="prm-badge">${emoji} Premium Report</div>
        <h2 class="prm-ttl"><span>${animal}</span>${label}</h2>
        <p class="prm-lead">あなたに最適化したカラーを提案。</p>
        <div class="prm-actions">
          <button class="btn primary" onclick="window.print()">PDF/印刷</button>
          <button class="btn" onclick="window.scrollTo({top:0,behavior:'smooth'})">タイプ概要へ戻る</button>
        </div>

        <!-- ← “Default” は出さない。季節だけ -->
<div class="prm-tabs">
  <button class="pill" data-season="SU">ブルベ夏</button>
  <button class="pill" data-season="WI">ブルベ冬</button>
  <button class="pill" data-season="SP">イエベ春</button>
  <button class="pill" data-season="AU">イエベ秋</button>
</div>
      </div>

      <div class="prm-hero-right">
       <div class="prm-swatch-grid" id="${UID}-grid">
  ${ (Array.isArray(palette) ? palette : [])
      .map(coerceColor)
      .map(window.swatchNode)
      .join('') }
</div>
      </div>
    </section>

    <script>
(function(){
  var host = document.getElementById('${UID}');
  if(!host) return;
  var grid = document.getElementById('${UID}-grid');
  if(!grid) return;
  var tabs = host.querySelectorAll('.prm-tabs .pill');

  function render(seasonCode){
  const S = normalizeSeason(seasonCode);
  const pal = getPaletteByCode('${code}', { season: S }); // ここでもう {hex,name} 配列
  grid.innerHTML = pal.map(window.swatchNode).join('');
}

  tabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabs.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.season); // SU/WI/SP/AU が入ってくる
    });
  });

  // 初期表示：ユーザー記憶 or TYPE_META.season or SU
 // 初期表示
const initial = normalizeSeason(window.USER_COLOR_SEASON || (window.TYPE_META?.['${code}']?.season) || 'SU');
tabs.forEach(b=> b.classList.toggle('active', normalizeSeason(b.dataset.season)===initial));
render(initial);
})();
</script>
 
    
  `;
// 季節タブの配線（Premium Packの返すHTMLの後に置く）


  // 2) TOPS / 3) BOTTOMS のフィットチェック（すでに気に入ってた7チェックの分割版）
  
  // 4) カプセル・クローゼット（春夏/秋冬の最小ワードローブ）
  

  // 5) DO / DON’T（超具体）
 

  // 6) お買い物チェックリスト（店頭でそのまま使える）
  

  // 7) 共有/QR（保存・共有）
  

  // まとめて返す
  return hero 
}

// ===== bottoms版 7チェック（具体）
function buildPersonalFitChecklistV2_bottoms(code){
  const p = _fitProfile(code); // 既存のプロフィール関数を活用
  const L = [];
  if (p.lowerHeavy){
    L.push({text:'ヒップ〜太ももで生地が貼りつかない（横から段差が出ない）', hint:'ストンと落ちる直線寄り。張るなら素材orサイズを見直し'});
    L.push({text:'ハイウエスト寄りで「脚長＞脚幅」に見える', hint:'IN無しでも縦比率が作れればOK'});
  } else {
    L.push({text:'ウエスト位置が浮かず、座っても食い込みにくい', hint:'ヒップハンガー回避。ベルト位置で面の分節を'});
    L.push({text:'センタープレスが膝下でまっすぐ落ちる', hint:'S字に曲がるならサイズ/裾幅の調整'});
  }
  if (p.strongLine){
    L.push({text:'裾は暴れず、歩いてもシワが散らない', hint:'ストレート/セミワイドが安全'});
  } else {
    L.push({text:'歩くと生地が“ゆっくり揺れる”。広がり過ぎない', hint:'落ち感重視、ギャザーは1箇所だけ'});
  }
  L.push({text:'靴を合わせると足の甲〜つま先がスッとつながる', hint:'甲浅/先細でラインを中断させない'});
  L.push({text:'後ろ姿でポケット位置が高過ぎ/低過ぎない', hint:'ヒップ中心にくる見え方'});
  L.push({text:'丈はくるぶし〜甲手前。床に触れない', hint:'引きずる丈は重心が下がって見える'});
  return L.slice(0,7);
}

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
          <button class="btn primary small" onclick="goDetails('${best.code}')">このタイプの着こなし/有名人を見る →</button>
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
// どこからでも見える位置（buildTopsChecklistの定義“後”が安全）
function buildPersonalFitChecklistV2(code){
  return buildTopsChecklist(code); // そのまま流用
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
        <p class="muted small">似てる骨格の服も参考にしよう！TOPS・BOTTOMS別であなたのスコアから”あなただけ”のランキングを生成しています！</p>
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

//let isRefreshingCuteStats = false;
//==================================================
//かわいい統計（任意）
//==================================================
//async function refreshCuteStats() {
  //if (!window.GAS_URL) return;

  // すでにリクエスト中なら新しいリクエストは投げない
  //if (isRefreshingCuteStats) return;
  //isRefreshingCuteStats = true;

  //try {
    //const data = await jsonp(window.GAS_URL + '?stats=1');
    //if (!data?.ok) return;

    // TODO: 必要ならここで stats の描画処理を呼ぶ
     //renderCuteStats(data) //みたいなのがあればここで呼ぶ

  //} catch (e) {
    //console.warn('[cuteStats] JSONP error', e);
  //} finally {
    // 終わったらフラグ解除（成功でも失敗でも）
    //isRefreshingCuteStats = false;
  //}
//}
// ==================================================
// メイン描画
// ==================================================
function _renderResultCore(){
  const mountId = window.__RESULT_MOUNT__ || 'app';
  const root = document.getElementById(mountId) || document.body;
  const { code, scores } = buildCode();
  const meta = window.TYPE_META?.[code] || { name:'未定義タイプ', base:'NATURAL', emoji:'', animal:'', image:'', concept:'', brandHints:[], styleNotes:[] };
  const mount = document.getElementById(window.__RESULT_MOUNT__ || 'app');
// 例2: premiumなら
// const mount = document.querySelector('#premium-root');



  document.body.dataset.theme = meta.base || 'NATURAL';

  // 一度だけ計測送信
  if (!state._sentOnce && window.API_URL){
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
      { key:'Frame',   ax:AXES[0], data:pf, cls:'axis-frame'   },
      { key:'Surface', ax:AXES[1], data:ps, cls:'axis-surface' },
      { key:'Balance', ax:AXES[2], data:pb, cls:'axis-balance' },
      { key:'Line',    ax:AXES[3], data:pl, cls:'axis-line'    },
      ].map(({ key, ax, data }) => {
        const pctRaw  = data.pct;          // 0〜100
        const offset  = pctRaw - 50;       // 中央からのズレ（-50〜+50）
        const absPct  = Math.abs(offset);  // ズレの強さ
        const mainPct = pctRaw >= 50 ? pctRaw : 100 - pctRaw;

        const sideLabel = data.sideLabel.replace(/（.*?）/g, '');
        const isRight   = offset >= 0;

        const fillLeft  = isRight ? '50%' : `calc(50% - ${absPct}%)`;
        const fillWidth = `${absPct}%`;
        const thumbLeft = `calc(50% + ${offset}%)`;

        return `
          <div class="trait">
            <div class="row">
              <div class="title">
                ${key}：
                <span class="${isRight ? 'ok' : 'warn'}">
                  ${Math.round(mainPct)}% ${sideLabel}
                </span>
              </div>
               <div class="percent">${Math.round(mainPct)}%</div>
            </div>

            <div class="central-meter">
              <div class="axis-line"></div>
              <div class="fill"  style="left:${fillLeft}; width:${fillWidth};"></div>
              <div class="thumb" style="left:${thumbLeft};"></div>
            </div>

            <div class="ends">
              <span>${ax.negLabel}</span><span>${ax.posLabel}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  const groupHTML = brandPack ? `
  <div class="brand-groups">
    <div class="brand-group"><h4>🥇ハイブランド</h4><div class="chips">${brandPack.high.map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>
    <div class="brand-group"><h4>🥈ミドルブランド</h4><div class="chips">${brandPack.middle.map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>
    <div class="brand-group"><h4>🥉ファスト</h4><div class="chips">${brandPack.fast.map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>
  </div>` : '';

  const el = document.createElement('div');
  el.innerHTML = `
    <div class="cols">
    <div class="prm-badge">${meta.emoji || ''} Premium Report</div>
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
          ${renderPremiumCutePack(code)}

<!-- ✅ Fit チェック（TOPS / BOTTOMS） -->
　　　　　　${renderFit7HTML(code)}
          
          <p class="small">※ 提案はあなたの各軸のスコアとタイプ固有情報から生成しています。</p>
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

  root.innerHTML=''; 
  root.appendChild(el);
  
wireSeasonTabsAll(root); // ← これを追加.  
  wireFit7(root);
  wirePremiumHero(root);   
  // 共有ボタン
  /* ================= Premium Stats (Donut + Lists) ================ */
/* 依存: window.ALL_CODES_ORDERED / window.TYPE_META / GAS_URL(任意) */

(function(){
  // ストローク色（スクショのニュアンス寄せ）
  const RING_COLOR = { WAVE:'#d6a9b7', NATURAL:'#c7b7c2', STRAIGHT:'#c9b6b9' };

  // 16タイプ → ベース判定（TYPE_META.baseが無い場合の保険）
  function baseOf(code){
    const b = (window.TYPE_META?.[code]?.base)||'';
    if (b) return b;
    // 大文字2文字目でざっくり
    const wave = new Set(['BNLS','MNLC','MWLC','MWLS','MNLS','BNLC']);
    const nat  = new Set(['BWUC','BWUS','BWLC','BWLS']);
    const st   = new Set(['BNUS','MWUC','MNUC','MNUS','MWUS','BNUC']);
    if (wave.has(code)) return 'WAVE';
    if (nat.has(code))  return 'NATURAL';
    if (st.has(code))   return 'STRAIGHT';
    return 'NATURAL';
  }

  // 絵文字＆ラベル
  function em(code){ return window.TYPE_META?.[code]?.emoji || '✨'; }
  const ALLC = (Array.isArray(window.ALL_CODES_ORDERED) ? window.ALL_CODES_ORDERED.slice() :
               Object.keys(window.TYPE_META||{}));

  // GASから統計取得（無ければ手元データで近似）
  async function fetchStats(){
    // 既に親ページで stats を持ってるならそれを使う
    if (window.__PREMIUM_STATS__) return window.__PREMIUM_STATS__;

    // API_URL があれば使う
    if (typeof API_URL === 'string' && API_URL.startsWith('http')){
      try{
        const url = API_URL + '/stats';
        const r = await fetch(url, { cache:'no-store' });
        if (r.ok){
          const d = await r.json();
          return {
            total: d.total||0,
            byType: d.byType||{},
            byBase: d.byBase||null,
          };
        }
      }catch(_){}
    }
    // フォールバック（0%表示にならないよう薄いダミー）
    const fake = { total: 0, byType:{}, byBase:null };
    ALLC.forEach((c,i)=> fake.byType[c] = (i===0?10:(i===1?5:2)));
    return fake;
  }

  function computeByBase(byType){
    const out = { WAVE:0, NATURAL:0, STRAIGHT:0 };
    for (const c of ALLC){
      const n = byType[c]||0;
      out[baseOf(c)] += n;
    }
    return out;
  }

  function donutHTML(base, pct){
    return `
      <div class="prm-donut" data-base="${base}">
        <svg viewBox="0 0 120 120" class="prm-ring">
          <circle cx="60" cy="60" r="48" class="prm-track"></circle>
          <circle cx="60" cy="60" r="48" class="prm-prog" data-prog></circle>
        </svg>
        <div class="prm-donut-center">
          <div class="prm-donut-title">${base}</div>
          <div class="prm-donut-num">${pct}%</div>
        </div>
      </div>`;
  }

  function listHTML(base, byType, total){
    // baseに属するタイプだけを％降順で
    const pairs = ALLC
      .filter(c => baseOf(c)===base)
      .map(c => ({ code:c, n:(byType[c]||0) }))
      .sort((a,b)=> b.n - a.n)
      .slice(0,6);

    return `
      <div class="prm-type-pills">
        ${pairs.map(p=>{
          const pct = total ? (p.n/total*100) : 0;
          return `
            <div class="prm-pill">
              <span class="l"><span>${em(p.code)}</span><span class="code">${p.code}</span></span>
              <span class="r">${pct.toFixed(1)}%</span>
            </div>`;
        }).join('')}
      </div>`;
  }

  //function statsSectionHTML(stats){
    //const total  = stats.total || Object.values(stats.byType||{}).reduce((a,b)=>a+b,0);
    //const byType = stats.byType || {};
    //const byBase = stats.byBase || computeByBase(byType);
    //const pct = k => total ? Math.round((byBase[k]||0)/total*100) : 0;

    //return `
      //<section class="prm-stats">
        //<h3>タイプ割合（リアルタイム）</h3>
        //<p class="muted">各骨格の分布割合がリアルタイムで見れちゃう！あなたと同じ骨格の人がどれくらいの割合で存在しているのか見てみよう！</p>
        //<div class="prm-stats-row">
         // ${['WAVE','NATURAL','STRAIGHT'].map(base=>`
            //<div class="prm-stats-card" data-base="${base}">
              //${donutHTML(base, pct(base))}
              //${listHTML(base, byType, total)}
            //</div>
         // `).join('')}
        //</div>
      //</section>`;
  //}

  //function wireDonuts(host){
    //host.querySelectorAll('.prm-donut').forEach(el=>{
      //const base = el.getAttribute('data-base');
      //const prog = el.querySelector('[data-prog]');
     // const ring = 2*Math.PI*48; // r=48
      //const num  = Number(el.querySelector('.prm-donut-num')?.textContent.replace('%',''))||0;
      //const dash = (num/100)*ring;
      //if (prog){
       // prog.style.stroke = RING_COLOR[base] || '#d6a9b7';
       // prog.style.strokeDasharray = `${dash} ${ring-dash}`;
      //}
   // });
 // }

  // 公開：結果カード直後に挿入
  //window.renderPremiumStats = async function(){
    //const rootCard = document.querySelector('.card.result') ||
                    // document.getElementById('premium-root') ||
                    // document.getElementById('app');
    //if (!rootCard) return;
   // const stats = await fetchStats();
   // const html  = statsSectionHTML(stats);
    //rootCard.insertAdjacentHTML('afterend', html);
    //const section = rootCard.nextElementSibling;
   // wireDonuts(section);
 // };
})();
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
  // === [PATCH-3] Premiumのときだけ、ドーナツ・割合表を差し込む ===


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
      if (!window.API_URL) { alert('API_URL が設定されていません'); return; }

      const body = {
        email,
        sessionId,
        code,
        scores,
        answers,
        noMail: false
      };

      try{
        const response = await fetchWithRetry(`${window.API_URL}/premium`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const res = await response.json();
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
  // 結果カードを描いた“後”に呼ぶ
if (typeof window.renderPremiumStats === 'function') {
  window.renderPremiumStats();
}
}

function renderResult(){ _renderResultCore(); }

// 任意：自動で統計更新
//try{
  //document.addEventListener('DOMContentLoaded', ()=>{
    //refreshCuteStats();
    //setInterval(refreshCuteStats, 300000);
 // });
//}catch(_){}
