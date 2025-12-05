// resultView.js (premium/app 공용・안전판 - 한국어 완전 번역)
// ==================================================
// 의존성이 부족해도 동작하도록 폴백(Fallback) 포함
// ==================================================

// === [PATCH-1] Premium 판정 & 취득 ===
window.API_URL = window.API_URL || "https://uk952hkt2e.execute-api.ap-northeast-1.amazonaws.com/prod";
const isPremium = () =>
  (document.body?.dataset?.page === 'premium') ||
  /premium\.html/.test(location.pathname);

// 재시도 포함 fetch (최대 3회 시도)
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 500 && i < retries - 1) {
        console.log(`[Retry] ${i + 1}/${retries - 1} after ${delay}ms (status: ${response.status})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; 
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

// 통계 데이터 가져오기 (도넛 차트용)
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

// 안전한 전역 변수 초기화
(function bootstrapSafeGlobals(){
  // ---- AXES (4축 - 한국어) ----
  const DEFAULT_AXES = [
    { key:'frame',   posLabel:'골격 주도(B)',  negLabel:'육감 주도(M)',  codePos:'B', codeNeg:'M' },
    { key:'surface', posLabel:'프레임 넓음(W)', negLabel:'프레임 좁음(N)', codePos:'W', codeNeg:'N' },
    { key:'balance', posLabel:'상체 중심(U)',       negLabel:'하체 중심(L)',       codePos:'U', codeNeg:'L' },
    { key:'line',    posLabel:'직선(S)',         negLabel:'곡선(C)',         codePos:'S', codeNeg:'C' },
  ];
  window.AXES = Array.isArray(window.AXES) && window.AXES.length ? window.AXES : DEFAULT_AXES;

  // ---- QUESTIONS (질문 데이터 홀더) ----
  if (!window.QUESTIONS) {
    const mk = (n)=> Array.from({length:n}, ()=>({ pos:true }));
    const len = 12;
    window.QUESTIONS = { frame:mk(len), surface:mk(len), balance:mk(len), line:mk(len) };
  }

  window.TYPE_META = window.TYPE_META || {};
  window.BRAND_BY_TYPE = window.BRAND_BY_TYPE || {};

  window.ALL_CODES_ORDERED =
    (Array.isArray(window.ALL_CODES_ORDERED) && window.ALL_CODES_ORDERED.length)
      ? window.ALL_CODES_ORDERED
      : (Object.keys(window.TYPE_META).length
          ? Object.keys(window.TYPE_META)
          : ['BNLS','MNLC','MWLC','MWLS','MNLS','BNLC','BWUC','BWUS','BWLC','BWLS','BNUS','MWUC','MNUC','MNUS','MWUS','BNUC']);

  if (typeof window.sendToSheets !== 'function') {
    window.sendToSheets = async ()=>({ok:true});
  }
})();

// ===== 320가지 팔레트 정의 (타입 × 시즌 × 5색) =====
// (기존 데이터 유지, 색상명은 영어로 두는 것이 자연스러움)
window.PALETTE_BY_TYPE_SEASON = Object.assign({}, window.PALETTE_BY_TYPE_SEASON, {
  /* ============= WAVE 계열 ============= */
  BNLS: { // Romantic Wave 🐨
    SU: [{hex:'#EDEBFF', name:'Lavender Mist'}, {hex:'#D7E4FF', name:'Powder Sky'}, {hex:'#F6D6E8', name:'Powder Pink'}, {hex:'#E9EEF2', name:'Soft Veil'}, {hex:'#CBD7E0', name:'Cool Porcelain'}],
    WI: [{hex:'#E6F0FF', name:'Icy Blue'}, {hex:'#EED9FF', name:'Iris Ice'}, {hex:'#E8F6FF', name:'Crystal Aqua'}, {hex:'#D8E1E8', name:'Steel Fog'}, {hex:'#C5CCDB', name:'Blue Ash'}],
    SP: [{hex:'#FFE9F1', name:'Blush Petal'}, {hex:'#FFF3E0', name:'Vanilla Cream'}, {hex:'#EAF8E6', name:'Mint Cream'}, {hex:'#FFF7D6', name:'Soft Butter'}, {hex:'#F5E6CF', name:'Cream Beige'}],
    AU: [{hex:'#F7EADF', name:'Sand Beige'}, {hex:'#EDE4CE', name:'Oat'}, {hex:'#EAE1D7', name:'Mushroom'}, {hex:'#E1E7DA', name:'Sage Fog'}, {hex:'#EFD9C5', name:'Peach Nude'}]
  },
  MNLC: { // Urban Elegance 🐺
    SU: [{hex:'#E9ECF2', name:'Fog Grey'}, {hex:'#DADDE8', name:'Dove Blue'}, {hex:'#F0E6EB', name:'Dusty Rose'}, {hex:'#EAE6E0', name:'Greige'}, {hex:'#D1D3D6', name:'Stone Mist'}],
    WI: [{hex:'#E3ECFF', name:'Cool Haze'}, {hex:'#D6DDEB', name:'Slate Veil'}, {hex:'#F0DCF0', name:'Muted Mauve'}, {hex:'#C9D2E1', name:'Pale Steel'}, {hex:'#BFC6D4', name:'Blue Flint'}],
    SP: [{hex:'#FFF0E0', name:'Apricot Milk'}, {hex:'#FFE6EE', name:'Dusty Blush'}, {hex:'#F2F5E8', name:'Pistachio Mist'}, {hex:'#FFF6DC', name:'Light Chamomile'}, {hex:'#EFE6D7', name:'Almond Beige'}],
    AU: [{hex:'#ECE3D6', name:'Oatmeal'}, {hex:'#E6DBC8', name:'Wheat'}, {hex:'#DADFD5', name:'Sage Grey'}, {hex:'#E2D8C7', name:'Sesame'}, {hex:'#D2C8BA', name:'Malt'}]
  },
  MWLC: { // Light Wave 🦋
    SU: [{hex:'#E8F0FF', name:'Air Blue'}, {hex:'#EDF6FA', name:'Cloud'}, {hex:'#F6E9F2', name:'Sheer Pink'}, {hex:'#EAF2ED', name:'Light Mint'}, {hex:'#E7EAEF', name:'Feather Grey'}],
    WI: [{hex:'#E1EDFF', name:'Icy Sky'}, {hex:'#E9E1FF', name:'Cool Lilac'}, {hex:'#DAE8F7', name:'Glacier'}, {hex:'#D8E3EA', name:'Pale Steel'}, {hex:'#C9D5DF', name:'Frost Cloud'}],
    SP: [{hex:'#FFEFE2', name:'Apricot Air'}, {hex:'#FFE7F0', name:'Rose Meringue'}, {hex:'#EAF7EE', name:'Mint Foam'}, {hex:'#FFF8E1', name:'Vanilla Air'}, {hex:'#F2E7D8', name:'Light Nougat'}],
    AU: [{hex:'#F1E6DA', name:'Sand Air'}, {hex:'#EAE1CF', name:'Oat Foam'}, {hex:'#E6E8DE', name:'Soft Sage'}, {hex:'#E9DCCD', name:'Peach Oat'}, {hex:'#DCD2C6', name:'Bone'}]
  },
  MWLS: { // Natural Girly 🐹
    SU: [{hex:'#F9EAF2', name:'Petal Cream'}, {hex:'#FDEFE6', name:'Milk Peach'}, {hex:'#EEF3F6', name:'Misty Blue'}, {hex:'#F3EEE8', name:'Porcelain'}, {hex:'#EADFE1', name:'Dusty Shell'}],
    WI: [{hex:'#E8EFFF', name:'Ice Bell'}, {hex:'#F0E3F7', name:'Powder Plum'}, {hex:'#E6F5FF', name:'Clear Aqua'}, {hex:'#DFE5EF', name:'Fog Steel'}, {hex:'#CCD3E0', name:'Blue Pearl'}],
    SP: [{hex:'#FFE8EE', name:'Strawberry Milk'}, {hex:'#FFF3E2', name:'Butter Sugar'}, {hex:'#EAF8EC', name:'Mint Jelly'}, {hex:'#FFF6D8', name:'Lemon Soufflé'}, {hex:'#F2E6D5', name:'Cookie Beige'}],
    AU: [{hex:'#F3E4D7', name:'Warm Sand'}, {hex:'#EAD9C8', name:'Biscuit'}, {hex:'#E6E2D6', name:'Sesame Milk'}, {hex:'#E1E6DC', name:'Herb Mist'}, {hex:'#EBD5C6', name:'Peach Oat'}]
  },
  MNLS: { // Classic Feminine 🕊
    SU: [{hex:'#F3EAF0', name:'Ballet Pink'}, {hex:'#E9EDF7', name:'Blue Veil'}, {hex:'#F5F1EA', name:'Ivory Silk'}, {hex:'#E8ECF0', name:'Pearl Grey'}, {hex:'#E2E6EE', name:'Swan Mist'}],
    WI: [{hex:'#E8EEFF', name:'Crystal Blue'}, {hex:'#F0E2F8', name:'Icy Orchid'}, {hex:'#E6F4FA', name:'Snow Aqua'}, {hex:'#DCE3EE', name:'Silver Fog'}, {hex:'#C8D1E1', name:'Frost Steel'}],
    SP: [{hex:'#FFEBF0', name:'Blossom'}, {hex:'#FFF3E6', name:'Vanilla Rose'}, {hex:'#ECF7EE', name:'Mint Lace'}, {hex:'#FFF8E3', name:'Cream Scone'}, {hex:'#EFE6D9', name:'Porcelain Beige'}],
    AU: [{hex:'#EFE3D6', name:'Cafe au Lait'}, {hex:'#E6DAC9', name:'Oat Latte'}, {hex:'#E2E5DA', name:'Sage Cream'}, {hex:'#E9DDD0', name:'Peach Beige'}, {hex:'#DCD2C6', name:'Pumice'}]
  },
  BNLC: { // Earth Wave 🐻
    SU: [{hex:'#EBE4DA', name:'Warm Porcelain'}, {hex:'#E0E6E3', name:'Fog Sage'}, {hex:'#E9DCD0', name:'Soft Taupe'}, {hex:'#ECE6DE', name:'Pale Linen'}, {hex:'#D5DBD3', name:'Moss Veil'}],
    WI: [{hex:'#E2E8EF', name:'Steel Cloud'}, {hex:'#D6DEE7', name:'Ash Blue'}, {hex:'#E7E0EC', name:'Muted Orchid'}, {hex:'#D5E1E1', name:'Glacier Sage'}, {hex:'#C7D0D6', name:'Blue Flint'}],
    SP: [{hex:'#FFEEDA', name:'Honey Cream'}, {hex:'#FFE6E0', name:'Peach Milk'}, {hex:'#EEF6EA', name:'Leaf Mist'}, {hex:'#FFF5DF', name:'Butter Biscuit'}, {hex:'#F1E4D2', name:'Oat Cream'}],
    AU: [{hex:'#EADCC9', name:'Sandstone'}, {hex:'#E4D3BD', name:'Wheat Husk'}, {hex:'#D9E0D5', name:'Sage Leaf'}, {hex:'#DACFC2', name:'Clay'}, {hex:'#CFC6B9', name:'Shore Pebble'}]
  },

  /* ============= NATURAL 계열 ============= */
  BWUC: { // Urban Natural 🦄
    SU: [{hex:'#F0F2F5', name:'Paper White'}, {hex:'#E7EBEF', name:'Cool Mist'}, {hex:'#DFE3E6', name:'Soft Concrete'}, {hex:'#EEF2F1', name:'Glass Grey'}, {hex:'#EDEFF3', name:'Porcelain Blue'}],
    WI: [{hex:'#E6ECF5', name:'Icy Steel'}, {hex:'#DDE5EF', name:'Blue Slate'}, {hex:'#EDE6F2', name:'Pale Iris'}, {hex:'#DCE3E6', name:'Graphite Mist'}, {hex:'#C9D2DB', name:'Cloud Iron'}],
    SP: [{hex:'#F7F3EC', name:'Almond Milk'}, {hex:'#F0F5F2', name:'Glass Mint'}, {hex:'#F6EFEF', name:'Blush Porcelain'}, {hex:'#FFF7EA', name:'Light Honey'}, {hex:'#EEE8DE', name:'Feather Sand'}],
    AU: [{hex:'#EDE5D8', name:'Light Canvas'}, {hex:'#E6DED2', name:'Putty'}, {hex:'#E1E6E0', name:'Stone Sage'}, {hex:'#DCD4C8', name:'Pale Clay'}, {hex:'#D4CCC0', name:'Bone Grey'}]
  },
  BWUS: { // Fairy Natural 🦅
    SU: [{hex:'#EDF2F6', name:'Sky Veil'}, {hex:'#EDEFF2', name:'Soft Chrome'}, {hex:'#E7F1F6', name:'Silver Mist'}, {hex:'#EEF3F8', name:'Sheer Ice'}, {hex:'#E5E9ED', name:'Steel Powder'}],
    WI: [{hex:'#E3EBF6', name:'Arctic Blue'}, {hex:'#E9EEF5', name:'Frost Glass'}, {hex:'#EDE7F3', name:'Icy Violet'}, {hex:'#DDE4EA', name:'Zinc'}, {hex:'#C9D3DD', name:'Alloy Blue'}],
    SP: [{hex:'#F6F4EF', name:'Dust White'}, {hex:'#F2F7F6', name:'Cloud Mint'}, {hex:'#F9F0F0', name:'Rose Veil'}, {hex:'#FFF7EC', name:'Pale Nectar'}, {hex:'#ECE7DE', name:'Chalk Sand'}],
    AU: [{hex:'#ECE5DB', name:'Sand Chrome'}, {hex:'#E4DED5', name:'Feather Taupe'}, {hex:'#E1E6E2', name:'Fog Sage'}, {hex:'#DBD4CB', name:'Greige Clay'}, {hex:'#D0C9C0', name:'Ash Oat'}]
  },
  BWLC: { // Classic Natural 🦊
    SU: [{hex:'#E9EEF2', name:'Shell Grey'}, {hex:'#EAF4F1', name:'Linen Mint'}, {hex:'#EEF2F6', name:'Blue Cotton'}, {hex:'#F3F1ED', name:'Chalk'}, {hex:'#E3E7EA', name:'Pebble Blue'}],
    WI: [{hex:'#DEE6F0', name:'Polar Steel'}, {hex:'#E6E9F2', name:'Cloud Navy'}, {hex:'#EDE6F0', name:'Mauve Fog'}, {hex:'#D8E0E7', name:'Stone Blue'}, {hex:'#C9D3DB', name:'Cold Flint'}],
    SP: [{hex:'#F4EFE7', name:'Oat Milk'}, {hex:'#ECF5F0', name:'Leaf Water'}, {hex:'#F7F0F0', name:'Soft Rose'}, {hex:'#FFF6E9', name:'Light Honey'}, {hex:'#EDE6DA', name:'Sand Cream'}],
    AU: [{hex:'#E8E0D4', name:'Warm Clay'}, {hex:'#E1D8CA', name:'Linen Beige'}, {hex:'#DEE4DB', name:'Sage Linen'}, {hex:'#D9D0C5', name:'Driftwood'}, {hex:'#CDC5BA', name:'Field Stone'}]
  },
  BWLS: { // Pure Natural 🦌
    SU: [{hex:'#EDF3F0', name:'Moss Mist'}, {hex:'#EAF0ED', name:'Leaf Veil'}, {hex:'#F1F4F6', name:'Pale Fog'}, {hex:'#F2EFEA', name:'Chalk Sand'}, {hex:'#E3EBE6', name:'Soft Fern'}],
    WI: [{hex:'#E1EAF0', name:'Frost Moss'}, {hex:'#DFE8EE', name:'Glacier Grey'}, {hex:'#E6EFEF', name:'Pale Teal'}, {hex:'#DCE4E1', name:'Silver Sage'}, {hex:'#C9D3D1', name:'Cold Lichen'}],
    SP: [{hex:'#F2F6EF', name:'Young Leaf'}, {hex:'#EAF5F0', name:'Water Mint'}, {hex:'#F7F2EC', name:'Oat Foam'}, {hex:'#FFF4E6', name:'Soft Nectar'}, {hex:'#EDE6DC', name:'Shell Sand'}],
    AU: [{hex:'#E7E0D3', name:'Field Oat'}, {hex:'#DEE3DA', name:'Sage Dust'}, {hex:'#E6DED0', name:'Canvas'}, {hex:'#D7D0C6', name:'Boulder'}, {hex:'#CFC7BB', name:'Dry Reed'}]
  },

  /* ============= STRAIGHT 계열 ============= */
  BNUS: { // Sporty Cool 🐆
    SU: [{hex:'#EDEFF4', name:'Cool Chalk'}, {hex:'#DDE3EE', name:'Steel Blue'}, {hex:'#E9E9EA', name:'Chrome'}, {hex:'#F3EDF0', name:'Platinum Rose'}, {hex:'#D5DBE7', name:'Blue Graphite'}],
    WI: [{hex:'#E2E7F2', name:'Icy Steel'}, {hex:'#D6DBE7', name:'Cold Slate'}, {hex:'#F0E6ED', name:'Muted Mauve'}, {hex:'#D0D7E4', name:'Storm Blue'}, {hex:'#B6BFD0', name:'Gunmetal Blue'}],
    SP: [{hex:'#F5F2ED', name:'Ivory Chalk'}, {hex:'#F0F7F4', name:'Glass Mint'}, {hex:'#FAEEF1', name:'Blush Chrome'}, {hex:'#FFF5E8', name:'Nectar'}, {hex:'#EAE4DA', name:'Birch'}],
    AU: [{hex:'#E6DED2', name:'Fawn'}, {hex:'#DDD3C6', name:'Clay Stone'}, {hex:'#D8DED8', name:'Sage Alloy'}, {hex:'#D1C8BC', name:'Drift Clay'}, {hex:'#C6BDB1', name:'Pewter Sand'}]
  },
  MWUC: { // Elegant Straight 🦈
    SU: [{hex:'#EEF0F7', name:'Blue Porcelain'}, {hex:'#E9EDF3', name:'Soft Chrome'}, {hex:'#F1EAF0', name:'Powder Lilac'}, {hex:'#E6F1F4', name:'Aqua Glass'}, {hex:'#DCE2EB', name:'Cold Mist'}],
    WI: [{hex:'#DEE6F3', name:'Glacier Steel'}, {hex:'#E8E1F0', name:'Icy Iris'}, {hex:'#DDEBF1', name:'Crystal Teal'}, {hex:'#D5DCE6', name:'Iron Blue'}, {hex:'#C3CBD8', name:'Blue Graphite'}],
    SP: [{hex:'#F7F1F4', name:'Rose Porcelain'}, {hex:'#EFF7F4', name:'Light Aqua'}, {hex:'#FFF4E8', name:'Pearl Nectar'}, {hex:'#F2ECE4', name:'Silk Beige'}, {hex:'#E7E1DA', name:'Shell'}],
    AU: [{hex:'#E7DED2', name:'Camel Milk'}, {hex:'#DED5C8', name:'Clay Beige'}, {hex:'#D8E0DB', name:'Slate Sage'}, {hex:'#D5CCC0', name:'Warm Pebble'}, {hex:'#CBC3B8', name:'Ash Taupe'}]
  },
  MNUC: { // Glamorous Cool 🐅
    SU: [{hex:'#ECEFF6', name:'Ice Cloud'}, {hex:'#E6EAF2', name:'Blue Smoke'}, {hex:'#F1E9EF', name:'Bare Mauve'}, {hex:'#EDE8E1', name:'Pale Truffle'}, {hex:'#D8DDE8', name:'Storm Grey'}],
    WI: [{hex:'#E1E6F2', name:'Polar Blue'}, {hex:'#DADFEB', name:'Iron Slate'}, {hex:'#EDE4EE', name:'Frost Plum'}, {hex:'#D3DAE6', name:'Steel Mist'}, {hex:'#C1C8D6', name:'Blue Stone'}],
    SP: [{hex:'#F6EFEA', name:'Ivory Truffle'}, {hex:'#F3F7F4', name:'Sea Glass'}, {hex:'#FAEEF2', name:'Rose Ash'}, {hex:'#FFF3E6', name:'Apricot Silk'}, {hex:'#E9E1D7', name:'Almond'}],
    AU: [{hex:'#E6DBCD', name:'Biscotti'}, {hex:'#DDD2C3', name:'Warm Clay'}, {hex:'#D6DED6', name:'Green Alloy'}, {hex:'#D1C7BA', name:'Stone Beige'}, {hex:'#C6BCB0', name:'Taupe Rock'}]
  },
  MNUS: { // Romantic Mode 🦚
    SU: [{hex:'#F0EAF2', name:'Powder Orchid'}, {hex:'#E7EDF6', name:'Blue Veil'}, {hex:'#EFE7EC', name:'Pale Rose'}, {hex:'#ECEFF2', name:'Pearl Chrome'}, {hex:'#D9DEE9', name:'Slate Blue'}],
    WI: [{hex:'#E7ECF7', name:'Crystal Steel'}, {hex:'#EDE4F1', name:'Icy Violet'}, {hex:'#E3EDF2', name:'Cool Aqua'}, {hex:'#D7DEE9', name:'Blue Quartz'}, {hex:'#C5CDDB', name:'Shadow Blue'}],
    SP: [{hex:'#F7EEF2', name:'Silk Rose'}, {hex:'#EFF7F6', name:'Mist Mint'}, {hex:'#FFF2E7', name:'Peach Pearl'}, {hex:'#F1EAE2', name:'Ivory Taupe'}, {hex:'#E8E1DA', name:'Shell Beige'}],
    AU: [{hex:'#E7DDD0', name:'Canvas Beige'}, {hex:'#DED4C6', name:'Oat Clay'}, {hex:'#DCE2DC', name:'Sage Veil'}, {hex:'#D7CEC2', name:'Warm Stone'}, {hex:'#CBC3B7', name:'Dust Taupe'}]
  },
  MWUS: { // Soft Active 🐬
    SU: [{hex:'#E9EFF4', name:'Flow Blue'}, {hex:'#E6F2F3', name:'Aqua Mist'}, {hex:'#EEF1F6', name:'Ice Wave'}, {hex:'#F1ECE9', name:'Pale Shell'}, {hex:'#DBE2EA', name:'Spray Grey'}],
    WI: [{hex:'#DEE9F2', name:'Glacier Aqua'}, {hex:'#D7E2EC', name:'Stream Steel'}, {hex:'#E7E1EE', name:'Cool Lilac'}, {hex:'#D0DAE6', name:'River Blue'}, {hex:'#BCC7D6', name:'Deep Spray'}],
    SP: [{hex:'#F1F7F6', name:'Mint Foam'}, {hex:'#EFF3FA', name:'Blue Vapor'}, {hex:'#FAF0F0', name:'Rose Breeze'}, {hex:'#FFF4E9', name:'Apricot Air'}, {hex:'#EAE5DC', name:'Light Drift'}],
    AU: [{hex:'#E5DCCE', name:'Sand Drift'}, {hex:'#DDD3C5', name:'Clay Mist'}, {hex:'#D7E0DB', name:'Sage Surf'}, {hex:'#D2C9BC', name:'Shore Taupe'}, {hex:'#C8BFB3', name:'Pebble'}]
  },
  BNUC: { // Structural Mode 🦉
    SU: [{hex:'#ECEFF3', name:'Architect White'}, {hex:'#E0E5EF', name:'Blueprint Blue'}, {hex:'#F0E8EE', name:'Quartz Mauve'}, {hex:'#E8ECEF', name:'Concrete Mist'}, {hex:'#D5DCE8', name:'Steel Beam'}],
    WI: [{hex:'#DDE3EF', name:'Polar Steel'}, {hex:'#D3DAE9', name:'Cold Slate'}, {hex:'#E8E1EC', name:'Violet Fog'}, {hex:'#CCD4E1', name:'Graphite Blue'}, {hex:'#B9C3D2', name:'Carbon Blue'}],
    SP: [{hex:'#F4F2EE', name:'Porcelain'}, {hex:'#EEF5F4', name:'Glass Mint'}, {hex:'#F8EEF2', name:'Soft Rose'}, {hex:'#FFF4E7', name:'Ivory Nectar'}, {hex:'#E8E1DA', name:'Limestone'}],
    AU: [{hex:'#E4DACD', name:'Pale Clay'}, {hex:'#DACFBE', name:'Sandstone'}, {hex:'#D6DDD8', name:'Alloy Sage'}, {hex:'#CDC3B6', name:'Ash Taupe'}, {hex:'#C2B9AD', name:'Cement'}]
  }
});

// ===== 유틸리티: 색상 정규화 및 시즌 처리 =====
function normalizeSeason(x){
  const s = String(x||'SU').trim().toLowerCase();
  if (s==='su' || s==='summer' || s==='sum' || s==='여름 쿨톤') return 'SU';
  if (s==='wi' || s==='winter' || s==='win' || s==='겨울 쿨톤') return 'WI';
  if (s==='sp' || s==='spring' || s==='spr' || s==='봄 웜톤') return 'SP';
  if (s==='au' || s==='autumn' || s==='fall' || s==='가을 웜톤') return 'AU';
  return 'SU';
}

function coerceColor(c){
  if (c && typeof c==='object' && Array.isArray(c.colors) && c.colors.length) c = c.colors[0];
  if (typeof c==='string'){
    let h = c.trim();
    if (!h.startsWith('#') && /^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(h)) h = '#'+h;
    return {hex:h, name:h};
  }
  if (c && typeof c==='object'){
    let h = c.hex || c.color || c.value || (c.hex && typeof c.hex==='object' ? c.hex.value : null)
          || (c.color && typeof c.color==='object' ? (c.color.hex||c.color.value) : null);
    h = String(h||'#CCCCCC').trim();
    if (!h.startsWith('#') && /^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(h)) h = '#'+h;
    let n = (c.names && (c.names.ja||c.names.en)) || (c.i18n && (c.i18n.ja||c.i18n.en)) || c.label || c.name || h;
    return {hex:h, name:String(n)};
  }
  return {hex:'#CCCCCC', name:'#CCCCCC'};
}

function getPaletteByCode(code, opts={}){
  const raw = opts.season || window.TYPE_META?.[code]?.season || window.USER_COLOR_SEASON || 'SU';
  const S   = normalizeSeason(raw); 
  const coerceList = (arr)=> (Array.isArray(arr) ? arr.flatMap(x=>{
    if (x && typeof x==='object' && Array.isArray(x.colors)) return x.colors.map(coerceColor);
    return [coerceColor(x)];
  }) : []);

  const t = window.PALETTE_BY_TYPE_SEASON?.[code];
  if (t){
    const bySU = t[S];
    const pal = coerceList(bySU);
    if (pal.length) return pal;
  }

  const seasonMap = {
    SU: ['#E8EDF7','#D9E6F1','#E8E0F3','#F2E6EC','#E3F0EE'],
    WI: ['#DDE3FF','#CDE3FF','#E3DBFF','#F2D9E6','#D9FFF5'],
    SP: ['#FFF1D9','#FFE8C6','#FFEFD6','#FFF4E6','#FFF7DE'],
    AU: ['#F3E3D1','#E9D8C9','#E6DEC8','#F0E2CD','#E6D7C7'],
  };
  return coerceList(seasonMap[S]);
}

function swatchNode(c){
  const hex  = (typeof c === 'string') ? c : (c?.hex || '#CCCCCC');
  const name = (typeof c === 'string') ? hex : (c?.name || hex);
  return `<div class="prm-swatch" title="${name}"><span style="background:${hex}"></span><i>${name}</i></div>`;
}
window.swatchNode = window.swatchNode || swatchNode;

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
        const season = btn.dataset.season || null;
        renderSeason(season);
      });
    });
  });
}

// ==== 사용자 계절 정보 관리 ====
function getUserSeason(){ return localStorage.getItem('km_season') || 'SU'; }
function setUserSeason(season){ try{ localStorage.setItem('km_season', season); }catch(_){} }

function seasonTabsHTML(active){
  const tabs = [
    {k:'SU', label:'여름 쿨톤'}, {k:'WI', label:'겨울 쿨톤'},
    {k:'SP', label:'봄 웜톤'}, {k:'AU', label:'가을 웜톤'}
  ];
  return `
    <div class="season-tabs">
      ${tabs.map(t=>`<button class="pill ${active===t.k?'active':''}" data-season="${t.k}">${t.label}</button>`).join('')}
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

function jsonp(url){
  return new Promise((resolve, reject)=>{
    const cb = '__jp' + Math.random().toString(36).slice(2);
    const s  = document.createElement('script');
    const q  = (url.includes('?')?'&':'?') + 'callback=' + cb;
    window[cb] = (data)=>{ resolve(data); try{ delete window[cb]; }catch(_){ window[cb]=undefined; } s.remove(); };
    s.onerror  = ()=>{ reject(new Error('JSONP failed')); try{ delete window[cb]; }catch(_){ window[cb]=undefined; } s.remove(); };
    s.src = url + q; s.async = true; document.head.appendChild(s);
  });
}
const clamp01 = (x)=> Math.max(0, Math.min(1, x));

// ==================================================
// 호환성 레이어 (한국어)
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
      if (base==='WAVE')     return '육감・두께감이 베이스. 하체 중심이며 부드러운 곡선 요소가 돋보임.';
      if (base==='STRAIGHT') return '두께감과 입체감이 베이스. 상체 중심이며 직선 요소가 깔끔하게 어울림.';
      return '골격감과 프레임 너비가 베이스. 직선 위주×러프한 설계가 잘 어울림.';
    };
  }
  if (typeof window.nickOf !== 'function'){
    window.nickOf = (code)=> TM?.[code]?.nick || TM?.[code]?.name || code;
  }
  if (typeof window.whyOf !== 'function'){
    window.whyOf = (code)=> TM?.[code]?.why || TM?.[code]?.meaning || TM?.[code]?.concept || '타입의 핵심 분위기・라인 설계를 상징.';
  }
  if (typeof window.autoBrands !== 'function'){
    window.autoBrands = (code, base)=>{
      const m = TM?.[code]; if (m?.brandHints?.length) return m.brandHints;
      return ['UNIQLO','COS','ZARA','MARGARET HOWELL','& Other Stories'];
    };
  }
  if (typeof window.autoStyle !== 'function'){
    window.autoStyle = (code)=>{
      const base = TM?.[code]?.base || 'NATURAL';
      if (base==='WAVE') return {
        fabric:['얇은 울','쉬폰','스무스 니트'],
        neck:['라운드/스카프 타이','하트 넥','얕은 V×드레이프'],
        silhouette:['롱×흐르는 하의','A라인','드롭 숄더'],
        lines:['바이어스/드레이프','머메이드','셔링 적당히']
      };
      if (base==='STRAIGHT') return {
        fabric:['중간 두께 코튼','클리어 울','탄탄한 저지'],
        neck:['V넥','보트넥','셔츠 카라'],
        silhouette:['I라인','허리 높게','셋업'],
        lines:['직선 절개','센터 프레스','장식 최소화']
      };
      return {
        fabric:['린넨/코튼','드라이 터치 니트','트윌'],
        neck:['크루','헨리','오픈 카라'],
        silhouette:['박시/스트레이트','어깨선 약간 드롭','와이드/테이퍼드'],
        lines:['직선＋소량 드레이프','세로의 여유','타원 비율']
      };
    };
  }
})();

// ==================================================
// 스코어 계산
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
function _fitProfile(code){
  const pf = axisPercent('frame').pct;
  const ps = axisPercent('surface').pct;
  const pb = axisPercent('balance').pct;
  const pl = axisPercent('line').pct;
  const topsAvg    = averageAllTypes(code, 'tops');
  const bottomsAvg = averageAllTypes(code, 'bottoms');
  const prefer = (topsAvg >= bottomsAvg) ? 'tops' : 'bottoms';
  return {
    pf, ps, pb, pl,
    isStraight : pf >= 60,
    isSoft     : ps >= 60,
    upperHeavy : pb >= 55,
    lowerHeavy : pb <= 45,
    strongLine : pl >= 60,
    softLine   : pl <= 40,
    prefer,
  };
}

function averageAllTypes(code, mode){
  try{
    const all = (mode==='tops' ? (getShareCompatibility(code)?.topsAll||[]) : (getShareCompatibility(code)?.bottomsAll||[]));
    if (!all.length) return 0;
    const sum = all.reduce((s,c)=> s + toPercent( compatCore(code, c, mode) ), 0);
    return sum / all.length;
  }catch(_){ return 0; }
}

// Fit 7 체크리스트 로직 (한국어)
function buildTopsChecklist(code){
  const P0 = profileFromCode(code);
  const topsAvg    = averageAllTypes(code, 'tops');
  const bottomsAvg = averageAllTypes(code, 'bottoms');
  const P = { ...P0, prefer: (topsAvg >= bottomsAvg) ? 'tops' : 'bottoms' };
  const T = (t,h)=>({text:t, hint:h});
  const L = [];

  if (P.isStraight) L.push(T("어깨선이 어깨 끝에 딱 맞는지!","어깨 재봉선이 어깨 끝점. 움직여도 주름이 안 생김"));
  else              L.push(T("어깨의 둥근 라인을 따라 떨어지는지","드롭 숄더/래글런이 잘 어울림"));

  if (P.upperHeavy) L.push(T("목 주변에 여유가 있는지","V/깊은 U/보트넥으로 답답함 해소"));
  else              L.push(T("목 주변이 채워져 있는지","위쪽을 채워도 하체가 무거워 보이지 않음"));

  if (P.strongLine) L.push(T("앞단/절개선이 곧게 뻗었는지!","세로선이 물결치지 않음"));
  else              L.push(T("셔링/드레이프가 '한 곳'에만 있는지","너무 많이 넣으면 옆으로 퍼짐"));

  if (P.upperHeavy) L.push(T("기장이 약간 짧은지!","앞만 넣입(Tuck-in)도 효과적"));
  else              L.push(T("기장이 긴 편인지","당신은 기장이 긴 편이 균형 잡힘!"));

  if (P.isSoft)     L.push(T("부드러운 소재인지","텐셀/사틴 등"));
  else              L.push(T("힘 있는 소재인지","브로드/탄탄한 저지"));

  if (P.softLine)   L.push(T("소매가 팔뚝에 달라붙지 않는지","손가락 1~2개 정도의 여유"));
  else              L.push(T("소매가 툭 떨어지는지","팔꿈치 위에서 울지 않음"));
  return L.slice(0,6);
}

function buildBottomsChecklist(code){
  const P0 = profileFromCode(code);
  const topsAvg    = averageAllTypes(code, 'tops');
  const bottomsAvg = averageAllTypes(code, 'bottoms');
  const P = { ...P0, prefer: (topsAvg >= bottomsAvg) ? 'tops' : 'bottoms' };
  const T = (t,h)=>({text:t, hint:h});
  const L = [];
  if (P.lowerHeavy) L.push(T("하이웨이스트로 다리 길이>다리 굵기 인지","넣입(Tuck-in) 효과적"));
  else              L.push(T("미드~약간 로우웨이스트인지","허리 위치를 낮추면 밸런스 굿"));

  if (P.isSoft)     L.push(T("허벅지에 붙지 않는 흐르는 소재인지","스트레이트/와이드 ◎"));
  else              L.push(T("허벅지 라인이 툭 떨어지는지","센터 프레스로 보정"));

  if (P.strongLine) L.push(T("핀턱/센터 프레스가 곧게 뻗었는지","옆으로 벌어지지 않음"));
  else              L.push(T("엉덩이 라인이 확실히 보이는지","머메이드/바이어스는 과하지 않게"));

  L.push(T("허리 주변이 뜨거나 파고들지 않는지","앉았을 때 아프지 않은 것이 기준"));

  if (P.softLine)   L.push(T("밑단은 풀렝스~약간 길게 선이 이어지는지","발등 보이는 구두와 상성 ◎"));
  else              L.push(T("밑단에서 복사뼈가 살짝 보이는지","컷팅이나 트임도 좋음"));

  if (P.isSoft)     L.push(T("소재가 소프트한지","딱딱한 원단은 옆으로 퍼지기 쉬움"));
  else              L.push(T("힘 있는 소재인지","너무 부드러우면 라인이 흐트러짐"));
  return L.slice(0,6);
}

function renderFit7Block(code){
  const card = (kind, arr)=>`
    <section class="card premium-card fit7-card">
      <h3 class="premium-title">${kind==='tops' ? '👕 TOPS 핏 체크 (6)' : '👖 BOTTOMS 핏 체크 (6)'}</h3>
      <p class="muted small">4개 이상 체크되면 <strong>구매 추천</strong>!</p>
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
        (앞으로 <span class="need-${kind}">4</span>개 더 체크하면 '구매' 라인)
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
              result.textContent = "✅ 4개 이상 클리어! 이건 '사야 해' 😍";
            }else{
              needEl.textContent = 4 - c;
              result.textContent = "(앞으로 " + (4 - c) + "개 더 체크하면 '구매' 라인)";
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
      <h3 class="premium-title">${kind==='tops' ? '👕 TOPS 핏 체크 (6)' : '👖 BOTTOMS 핏 체크 (6)'}</h3>
      <p class="muted small">4개 이상 체크되면 <strong>구매 추천</strong>!</p>
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
        (앞으로 <span class="need-${kind}">4</span>개 더 체크하면 '구매' 라인)
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
              result.textContent = "✅ 4개 이상 클리어! 이건 '사야 해' 😍";
            } else {
              needEl.textContent = 4 - c;
              result.textContent = "(앞으로 " + (4 - c) + "개 더 체크하면 '구매' 라인)";
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
// 궁합 (옷 쉐어)
// ==================================================
const WEIGHTS = { tops:{frame:0.40,surface:0.10,balance:0.30,line:0.20}, bottoms:{frame:0.10,surface:0.30,balance:0.40,line:0.20} };
const KEEP    = { tops:{frame:0.50,surface:0.55,balance:0.35,line:0.60}, bottoms:{frame:0.60,surface:0.45,balance:0.20,line:0.55} };
const BASE_AFFINITY = { WAVE:{WAVE:1.00,NATURAL:0.92,STRAIGHT:0.85}, NATURAL:{WAVE:0.92,NATURAL:1.00,STRAIGHT:0.90}, STRAIGHT:{WAVE:0.85,NATURAL:0.90,STRAIGHT:1.00} };
const _SAFE = {
  ALL: (Array.isArray(window.ALL_CODES_ORDERED) ? window.ALL_CODES_ORDERED.slice() : []),
  TYPE_META: (typeof window.TYPE_META !== 'undefined') ? window.TYPE_META : {},
  axisPercent: (typeof window.axisPercent === 'function') ? window.axisPercent : (key) => ({ pct: 50 }),
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

function getShareCompatibility(code){
  try {
    const ALL = _SAFE.ALL.length ? _SAFE.ALL : (_SAFE.log('ALL_CODES_ORDERED 未 정의'), []);
    const candidates = ALL.filter(c => c && c !== code);

    const topsArr = candidates
      .map(c => ({ code:c, score: toPercent( compatCore(code, c, 'tops') ) }))
      .sort((a,b)=> b.score - a.score);

    const bottomsArr = candidates
      .map(c => ({ code:c, score: toPercent( compatCore(code, c, 'bottoms') ) }))
      .sort((a,b)=> b.score - a.score);

    return {
      topsBest: topsArr[0] || null,
      topsNext: topsArr.slice(1, 6),
      bottomsBest: bottomsArr[0] || null,
      bottomsNext: bottomsArr.slice(1, 6),
      topsAll: topsArr.map(t=>t.code),
      bottomsAll: bottomsArr.map(b=>b.code),
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
            <div class="score">궁합 ${x.score}%</div>
            <div class="match-meter"><i style="width:${x.score}%"></i></div>
            <button class="btn small" onclick="goDetails('${x.code}')">상세 보기</button>
          </div>
        `).join('')}
      </div>
    </div>`;
  return section('👕 TOPS/아우터 궁합 (전체)', compat.topsFull)
       + section('👖 BOTTOMS 궁합 (전체)',      compat.bottomsFull);
}

// ==================================================
// 표시계
// ==================================================
function pill(code){ return `<button class="chip linklike" data-code="${code}" onclick="goDetails('${code}')">${code}</button>`; }
function meter(pct){ return `<div class="match-meter" aria-label="match ${pct}%"><i style="width:${pct}%"></i></div>`; }

function labelOf(code){
  const meta = window.TYPE_META?.[code] || null; 
  if (!meta) return `${code}`;
  const emoji = meta.emoji || '';
  const baseLabel = meta.label || meta.name || code;
  return `${emoji ? (emoji + ' ') : ''}${baseLabel}（${code}）`;
}

const DETAIL_PAGE = 'detail.html'; 
function goDetails(code){
  const url = DETAIL_PAGE ? `${DETAIL_PAGE}?code=${encodeURIComponent(code)}` 
                          : `gallery.html?code=${encodeURIComponent(code)}`;
  location.href = url;
}

// 추가 Tips 룰 (스코어 별 문구 - 한국어)
const TIP_RULES = {
  frame: [
    { when: p => p >= 70, add: {
      diet_do:    ["고단백+저지방 중심으로, 식사는 '면'으로 섭취 (국물+반찬으로 포만감)"],
      train_cardio:["LSD (30–45분)를 주 2~3회. 관절에 무리 없는 부하로 지속"],
      care:       ["견갑골 주변 가동역 UP (Y자 스트레칭/월 엔젤) 매일 3분"],
      quick:      "저녁 탄수화물은 저GI로 바꾸기만 해도 다음 날 붓기가 덜함"
    }},
    { when: p => p <= 30, add: {
      diet_do:    ["미네랄(Mg/K)을 의식. 해조류/콩/견과류를 매일 소량"],
      train_strength:["맨몸+PNF 스트레칭으로 '뼈'의 가동역 넓히기 → 자세 정돈"],
      mobility:   ["흉곽 호흡 (4-4-8)으로 코어 안정감 UP"],
      quick:      "식사는 '씹는 횟수'를 늘려 저작 운동 유래의 코어 활성 유도"
    }},
  ],
  surface: [
    { when: p => p >= 70, add: {
      lines:      ["세로로 '강한 선' 하나(센터 프레스/앞단/롱 목걸이)를 배치"],
      care:       ["골반바지(힙행거) 회피. 벨트 위치로 '면의 분절'을 만듦"],
      quick:      "아우터는 '길이로 지배'. 힙 중간~아래에서 고민되면 긴 쪽을 선택"
    }},
    { when: p => p <= 30, add: {
      lines:      ["옆으로 흘려보내는 드레이프/히든 버튼의 가벼움으로 프레임을 좁아 보이게"],
      train_strength:["외전근/중둔근 활성 (클램쉘 20회×2)으로 허리 너비 보정"],
      quick:      "상의는 짧게·하의는 흐르는 핏으로 'Y자' 의식 (시각적 중심↓)"
    }},
  ],
  balance: [
    { when: p => p >= 70, add: {
      lines:      ["V/보트/깊은 U넥으로 쇄골~가슴에 '탈출구' 만들기"],
      train_strength:["광배근/승모 중부 (래트 풀 다운/페이스 풀)로 상체 중심의 두께감 정돈"],
      quick:      "상의는 앞만 넣어(Tuck-in) 다리를 길게, 복부 두께는 감추기"
    }},
    { when: p => p <= 30, add: {
      lines:      ["하이웨이스트+떨어지는 핏으로 '다리 길이>다리 굵기' 인상을 최우선"],
      care:       ["장요근 스트레칭으로 골반 전경 미세 교정 → 하체 중심의 나른함 해소"],
      quick:      "신발은 발등이 보이고/약간 뾰족한 것으로 '다리 선을 길게' 연출"
    }},
  ],
  line: [
    { when: p => p >= 70, add: {
      lines:      ["센터 프레스/직선 절개/히든 버튼: 곡선을 '상쇄'하는 직선 하나 넣기"],
      accessories:["각진 금속/샤프한 사각형으로 선 강조"],
      quick:      "패턴은 핀스트라이프/윈도우페인 등 가는 직선 선택"
    }},
    { when: p => p <= 30, add: {
      lines:      ["바이어스/셔링은 '한 곳에만' 한정해 지나친 퍼짐 방지"],
      accessories:["둥근/작은/투명 소재로 딱딱함 완화"],
      quick:      "카라는 라운드/하트/스카프 타이 중 '하나'면 충분"
    }},
  ],
};

// ========= Premium Cute Pack =========
function wireFit7(root = document){
  ['tops','bottoms'].forEach(kind=>{
    const boxes  = root.querySelectorAll('.fitcheck-' + kind);
    const result = root.querySelector('.fit7-result-' + kind);
    const needEl = root.querySelector('.need-' + kind);
    if(!boxes.length || !result || !needEl) return;
    const update = ()=>{
      const c = Array.from(boxes).filter(b=>b.checked).length;
      if (c >= 4) result.textContent = "✅ 4개 이상 클리어! 이건 '사야 해' 😍";
      else { needEl.textContent = 4 - c; result.textContent = `(앞으로 ${4-c} 개 더 체크하면 '구매' 라인)`; }
    };
    boxes.forEach(b=>b.addEventListener('change', update));
    update();
  });
}

function heartMeter(score, size='m'){
  const pct = Math.max(0, Math.min(100, Number(score)||0));
  const cls = size==='s' ? 'meter-s' : size==='l' ? 'meter-l' : 'meter-m';
  return `<div class="cute-meter ${cls}" aria-label="match ${pct}%"><div class="cm-track"><div class="cm-fill" style="width:${pct}%"></div></div><div class="cm-label">${pct}%</div></div>`;
}

function pastelBadge(code){
  const key = (code||'').slice(0,2);
  const map = { BN:'linear-gradient(135deg,#ffd6e8,#ffe9f3)', BW:'linear-gradient(135deg,#ffe8d6,#fff3e4)', MN:'linear-gradient(135deg,#e8ffd6,#f2ffe8)', MW:'linear-gradient(135deg,#d6f3ff,#e9f8ff)', BU:'linear-gradient(135deg,#f8e1ff,#f3ebff)', MU:'linear-gradient(135deg,#fff5d6,#fff8e8)' };
  return map[key] || 'linear-gradient(135deg,#f1f3f5,#ffffff)';
}

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
        <div><div class="cc16-code">${otherCode}</div><small class="cc16-name">${name}</small></div>
      </div>
      <div class="cc16-score"><span>TOPS ${scoreT}%</span> ・ <span>BOTTOMS ${scoreB}%</span></div>
    </div>
    <div class="cute-card16-body">
      <div class="mini"><span>TOPS</span>${heartMeter(scoreT,'s')}<b>${scoreT}%</b></div>
      <div class="mini"><span>BOTTOMS</span>${heartMeter(scoreB,'s','blue')}<b>${scoreB}%</b></div>
    </div>
  </div>`;
}

function renderCuteAll16Combined(baseCode, compat){
  const topsAll    = compat?.topsAll    || [];
  const bottomsAll = compat?.bottomsAll || [];
  const seen = new Set();
  const order = [];
  topsAll.forEach(c=>{ if (c && !seen.has(c)) { seen.add(c); order.push(c); }});
  bottomsAll.forEach(c=>{ if (c && !seen.has(c)) { seen.add(c); order.push(c); }});
  const make = arr => arr.map(c => renderCuteCard16Combined(baseCode, c)).join('');

  return `
    <section class="cute-16 onegrid">
      <div class="cute-16-grid" data-pane="both">${make(order)}</div>
      <div class="cute-legend"><span class="cute-dot"></span> TOPS 궁합 <span class="cute-dot b"></span> BOTTOMS 궁합</div>
    </section>
    <script>
      (function(){
        const host   = document.currentScript.previousElementSibling;
        const grid   = host.querySelector('.cute-16-grid[data-pane="both"]');
        const btnT   = host.querySelector('.pill[data-sort="tops"]');
        const btnB   = host.querySelector('.pill[data-sort="bottoms"]');
        const btnA   = host.querySelector('.pill[data-sort="abc"]');
        const search = host.querySelector('input[type="search"]');
        const pills  = [btnT, btnB, btnA].filter(Boolean);
        function sortCards(by){
          const cards = Array.from(grid.children);
          if (by === 'abc') cards.sort((a,b)=> (a.dataset.code||'').localeCompare(b.dataset.code||''));
          else if (by === 'bottoms') cards.sort((a,b)=>{
            const ab = +(a.querySelector('.cute-card16-body .mini:nth-child(2) b')?.textContent.replace('%','')||0);
            const bb = +(b.querySelector('.cute-card16-body .mini:nth-child(2) b')?.textContent.replace('%','')||0);
            return bb - ab;
          });
          else cards.sort((a,b)=>{
            const at = +(a.querySelector('.cute-card16-body .mini:nth-child(1) b')?.textContent.replace('%','')||0);
            const bt = +(b.querySelector('.cute-card16-body .mini:nth-child(1) b')?.textContent.replace('%','')||0);
            return bt - at;
          });
          cards.forEach(c=>grid.appendChild(c));
        }
        sortCards('tops');
        btnT?.addEventListener('click', ()=>{ pills.forEach(x=>x.classList.remove('active')); btnT.classList.add('active'); sortCards('tops'); });
        btnB?.addEventListener('click', ()=>{ pills.forEach(x=>x.classList.remove('active')); btnB.classList.add('active'); sortCards('bottoms'); });
        btnA?.addEventListener('click', ()=>{ pills.forEach(x=>x.classList.remove('active')); btnA.classList.add('active'); sortCards('abc'); });
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
    </script>`;
}

function renderShareCardHTML(code){
  const compat = getShareCompatibility(code) || {};
  const makeRow = ({kind, best, next})=>{
    if (!best) return '';
    const title = kind==='tops' ? '👕 TOPS 궁합' : '👖 BOTTOMS 궁합';
    const lead  = kind==='tops' ? '어깨~카라 설계나 실루엣이 비슷한 타입이에요' : '허리 위치나 떨어지는 느낌・라인 설계가 비슷한 타입이에요';
    const chips = (next||[]).slice(0,6).map(x=>{
      const lbl = labelOf(x.code);
      return `<button class="chip pastel" onclick="goDetails('${x.code}')" title="${lbl}">${x.code}</button>`;
    }).join('');
    return `
      <div class="cute-block">
        <div class="cute-block-head"><div class="cute-title">${title}</div><div class="cute-lead">${lead}</div></div>
        <div class="cute-best">
          <div class="cute-best-main"><div class="cute-best-label">${labelOf(best.code)}</div><div class="cute-best-score">💞 ${best.score}%</div></div>
          ${heartMeter(best.score,'l')}
          <div class="cute-cta"><button class="btn primary small" onclick="goDetails('${best.code}')">이 타입 보기 →</button></div>
        </div>
        ${chips ? `<div class="cute-more"><span class="muted small">그 외 궁합 좋은 타입:</span>${chips}</div>` : ``}
      </div>`;
  };
  const list16 = renderCuteAll16Combined(code, compat);
  return `
    <section class="card share-cute">
      <div class="share-head">
        <div class="share-badge">🫶 옷 쉐어(공유) 궁합</div>
        <p class="muted small">비슷한 골격의 옷도 참고해 보세요! TOPS・BOTTOMS 별로 당신의 스코어를 기반으로 "당신만을 위한" 랭킹을 생성했습니다!</p>
      </div>
      ${makeRow({kind:'tops',    best:compat.topsBest,    next:compat.topsNext})}
      ${makeRow({kind:'bottoms', best:compat.bottomsBest, next:compat.bottomsNext})}
      ${list16}
    </section>`;
}

function wireShareCute(){
  const root = document.querySelector('.share-cute');
  if (!root) return;
  const topTabs = root.querySelectorAll('.share-tabs .tab');
  topTabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      topTabs.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const key = btn.dataset.block;
      root.querySelectorAll('.share-pane').forEach(p=>{ p.classList.toggle('hidden', p.dataset.block !== key); });
    });
  });
  const listTabs = root.querySelectorAll('.cute-16 .tab');
  listTabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      listTabs.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.pane;
      root.querySelectorAll('.cute-16-grid').forEach(p=>{ p.classList.toggle('hidden', p.dataset.pane !== target); });
    });
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

  const hero = `
    <section class="premium-card prm-hero" id="${UID}">
      <div class="prm-hero-left">
        <div class="prm-badge">${emoji} Premium Report</div>
        <h2 class="prm-ttl"><span>${animal}</span>${label}</h2>
        <p class="prm-lead">당신에게 최적화된 퍼스널 컬러를 제안합니다.</p>
        <div class="prm-actions">
          <button class="btn primary" onclick="window.print()">PDF/인쇄</button>
          <button class="btn" onclick="window.scrollTo({top:0,behavior:'smooth'})">타입 개요로</button>
        </div>
        <div class="prm-tabs">
          <button class="pill" data-season="SU">여름 쿨톤</button>
          <button class="pill" data-season="WI">겨울 쿨톤</button>
          <button class="pill" data-season="SP">봄 웜톤</button>
          <button class="pill" data-season="AU">가을 웜톤</button>
        </div>
      </div>
      <div class="prm-hero-right">
        <div class="prm-swatch-grid" id="${UID}-grid">
          ${(Array.isArray(palette) ? palette : []).map(coerceColor).map(window.swatchNode).join('')}
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
        const pal = getPaletteByCode('${code}', { season: S });
        grid.innerHTML = pal.map(window.swatchNode).join('');
      }
      tabs.forEach(btn=>{
        btn.addEventListener('click', ()=>{
          tabs.forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          render(btn.dataset.season);
        });
      });
      const initial = normalizeSeason(window.USER_COLOR_SEASON || (window.TYPE_META?.['${code}']?.season) || 'SU');
      tabs.forEach(b=> b.classList.toggle('active', normalizeSeason(b.dataset.season)===initial));
      render(initial);
    })();
    </script>
  `;
  return hero;
}

function baseLabel(b){
  return b==='WAVE'?'WAVE (부드러움・가벼움・하체중심)'
       : b==='STRAIGHT'?'STRAIGHT (두께감・입체감・상체중심)'
       : b==='NATURAL'?'NATURAL (골격감・직선・러프)' : (b||'');
}

// ==================================================
// 메인 렌더링 함수
// ==================================================
function _renderResultCore(){
  const mountId = window.__RESULT_MOUNT__ || 'app';
  const root = document.getElementById(mountId) || document.body;
  const { code, scores } = buildCode();
  const meta = window.TYPE_META?.[code] || { name:'미정의 타입', base:'NATURAL', emoji:'', animal:'', image:'', concept:'', brandHints:[], styleNotes:[] };
  
  document.body.dataset.theme = meta.base || 'NATURAL';

  if (!state._sentOnce && window.API_URL){
    state._sentOnce = true;
    const sid = localStorage.getItem('km_session') || (localStorage.setItem('km_session',(crypto?.randomUUID?.()||Math.random().toString(36).slice(2))), localStorage.getItem('km_session'));
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
    // 한국판이므로 한국 연예인을 맨 위로
    const group = [
      { label:'🇰🇷 한국',  list:kr },
      { label:'🇯🇵 일본',  list:jp },
      { label:'🌍 글로벌',  list:global }
    ];
    celebHTML = `
      <div class="card guide" style="margin-top:12px">
        <h3>대표적인 연예인</h3>
        ${group.map(g=> g.list?.length ? `<h4>${g.label}</h4><div class="chips">${g.list.map(x=>`<span class="chip">${x}</span>`).join('')}</div>` : '').join('')}
        <p class="small">※ 분류는 참고 예시입니다.</p>
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
        const pctRaw  = data.pct;
        const offset  = pctRaw - 50;
        const absPct  = Math.abs(offset);
        const mainPct = pctRaw >= 50 ? pctRaw : 100 - pctRaw;
        const sideLabel = data.sideLabel.replace(/\(.*?\)/g, ''); // 괄호 제거
        const isRight   = offset >= 0;
        const fillLeft  = isRight ? '50%' : `calc(50% - ${absPct}%)`;
        const fillWidth = `${absPct}%`;
        const thumbLeft = `calc(50% + ${offset}%)`;

        return `
          <div class="trait">
            <div class="row">
              <div class="title">${key}: <span class="${isRight ? 'ok' : 'warn'}">${Math.round(mainPct)}% ${sideLabel}</span></div>
               <div class="percent">${Math.round(mainPct)}%</div>
            </div>
            <div class="central-meter">
              <div class="axis-line"></div>
              <div class="fill"  style="left:${fillLeft}; width:${fillWidth};"></div>
              <div class="thumb" style="left:${thumbLeft};"></div>
            </div>
            <div class="ends"><span>${ax.negLabel}</span><span>${ax.posLabel}</span></div>
          </div>`;
      }).join('')}
    </div>
  `;

  const groupHTML = brandPack ? `
  <div class="brand-groups">
    <div class="brand-group"><h4>🥇하이 브랜드</h4><div class="chips">${brandPack.high.map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>
    <div class="brand-group"><h4>🥈미들 브랜드</h4><div class="chips">${brandPack.middle.map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>
    <div class="brand-group"><h4>🥉SPA/패스트</h4><div class="chips">${brandPack.fast.map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>
  </div>` : '';

  const el = document.createElement('div');
  el.innerHTML = `
    <div class="cols">
    <div class="prm-badge">${meta.emoji || ''} Premium Report</div>
      <div class="card result">
        <h2>진단 결과: <span class="ok">${code}</span> — <span class="em">${meta.emoji||''}</span> ${meta.name||code}</h2>
        <div class="tags">
          <span class="tag">기반 체형: ${baseLabel(meta.base)}</span>
          ${meta.animal?`<span class="tag">motif Animal: ${meta.animal}</span>`:''}
          <span class="tag kind">${nick}</span>
        </div>
        <div class="hero-image" data-base="${meta.base}">
          <img src="${meta.image || `images/${code}.jpg`}" alt="${code} image" loading="lazy" decoding="async" onerror="this.closest('.hero-image')?.classList.add('is-missing')" />
        </div>
        <p class="concept">${meta.concept||''}</p>
        <p class="muted">4축 평균 스코어</p>
        ${barsHTML}

        <div class="card guide" style="margin-top:12px">
          <h3>어떤 골격?</h3>
          <p>${bodyDesc}</p>

          <h3>어울리는 브랜드</h3>
          <div class="chips brand-chips">${brands.map(b=>`<span class="chip" title="${b}">${b}</span>`).join('')}</div>
          ${groupHTML}

          <div class="card guide" style="margin-top:12px">
            <h3>모티브에 담긴 의미</h3>
            <p>${why}</p>
          </div>

          <h3>스타일링 가이드</h3>
          <div class="cols" style="grid-template-columns:1fr 1fr">
            <div>
              <h4>소재/질감</h4><ul>${(auto.fabric||[]).map(x=>`<li>${x}</li>`).join('')}</ul>
              <h4>넥 라인</h4><ul>${(auto.neck||[]).map(x=>`<li>${x}</li>`).join('')}</ul>
            </div>
            <div>
              <h4>실루엣</h4><ul>${(auto.silhouette||[]).map(x=>`<li>${x}</li>`).join('')}</ul>
              <h4>라인 설계</h4><ul>${(auto.lines||[]).map(x=>`<li>${x}</li>`).join('')}</ul>
            </div>
          </div>
          ${notes.length?`<h4>타입 고유 메모</h4><ul>${notes.map(n=>`<li>${n}</li>`).join('')}</ul>`:''}

          ${renderBodyTipsHTML(code)}
          ${celebHTML}
          ${renderShareCardHTML(code)}
          ${renderPremiumCutePack(code)}
          ${renderFit7HTML(code)}
          
          <p class="small">※ 제안은 당신의 각 축 스코어와 타입 고유 정보에서 생성됩니다.</p>
        </div>

         
        <div class="card" style="margin-top:20px; text-align:center;">
          <h3>다른 골격 타입도 보기</h3>
          <p>당신의 타입 이외의 15가지 타입을 비교해 보세요.</p>
          <a href="gallery.html" class="btn" style="display:inline-block;background:#333;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;transition:all .3s;">타입 갤러리 보기 →</a>
        </div>

        <div class="share-box">
          <h3 style="margin-top:0;">결과 공유하기</h3>
          <div class="share-buttons">
            <button class="share-btn" id="btn-x">X(Twitter) 공유</button>
            <button class="share-btn" id="btn-line">LINE 전송</button>
            <button class="share-btn" id="btn-copy">링크 복사</button>
          </div>
        </div>
      </div>
    </div>`;

  root.innerHTML=''; 
  root.appendChild(el);
  
  wireSeasonTabsAll(root); 
  wireFit7(root);
  wirePremiumHero(root);   
  wireShareCute(); // 추가: 쉐어 탭 활성화

  // 공유 버튼 로직
  (function(){
    const meta = window.TYPE_META?.[code] || { name:'', emoji:'' };
    const shareTitle = `${meta.emoji ?? ''} ${meta.name || code} (${code})`.trim();
    const shareUrl   = new URL('index.html', location.href).href;

    const bx = document.getElementById('btn-x');
    bx && (bx.onclick = ()=> {
      const t = encodeURIComponent(`골격 MBTI 진단 결과는 「${shareTitle}」였습니다!`);
      const u = encodeURIComponent(shareUrl);
      window.open(`https://twitter.com/intent/tweet?text=${t}&url=${u}`, '_blank');
    });
    const bl = document.getElementById('btn-line');
    bl && (bl.onclick = ()=> {
      const t = encodeURIComponent(`골격 MBTI 진단 결과는 「${shareTitle}」였습니다!\n${shareUrl}`);
      window.open(`https://line.me/R/msg/text/?${t}`, '_blank');
    });
    const bc = document.getElementById('btn-copy');
    bc && (bc.onclick = ()=> {
      navigator.clipboard.writeText(shareUrl).then(()=>alert('링크를 복사했습니다'));
    });
  })();

  // 구매 버튼 (만약 존재하면)
  const buyBtn = el.querySelector('#buy-premium');
  if (buyBtn){
    buyBtn.addEventListener('click', async ()=>{
      const email = prompt('완전판 URL을 받을 이메일 주소를 입력해주세요📩');
      if (!email) return;
      const { code, scores } = buildCode();
      const answers  = state.answers || {};
      const sessionId= localStorage.getItem('km_session') || (localStorage.setItem('km_session',(crypto?.randomUUID?.()||Math.random().toString(36).slice(2))), localStorage.getItem('km_session'));
      
      const body = { email, sessionId, code, scores, answers, noMail: false };

      try{
        const response = await fetchWithRetry(`${window.API_URL}/premium`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const res = await response.json();
        if (!res?.ok) throw new Error(res?.error || '저장 실패');
        alert('구매해 주셔서 감사합니다! 완전판 URL을 메일로 보냈습니다📩 (스팸 메일함도 확인해 주세요)');
      }catch(e){ console.error(e); alert('메일 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.'); }
    }, { once:false });
  }

  // 재진단 버튼
  const retryBtn = el.querySelector('#retry');
  retryBtn && (retryBtn.onclick = ()=>{
    try { state = { step:0, answers:{ frame:[], surface:[], balance:[], line:[] }, _sentOnce:false }; }
    catch(_){ /* noop */ }
    location.href = 'app.html';
  });

  if (typeof window.renderPremiumStats === 'function') {
    window.renderPremiumStats();
  }
}

function renderResult(){ _renderResultCore(); }