// tips.personalized.js
// プレミアム用：BODY_TIPS（meta）にスコア連動の追加Tipsを合成して表示
(function(){
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
        mobility:   ["胸郭の呼吸エクサ（4-4-8呼吸）で体幹の安定感UP"],
        quick:      "“噛む回数”を増やして咀嚼由来の体幹活性を誘発"
      }},
    ],
    surface: [
      { when: p => p >= 70, add: {
        lines:      ["縦に1本“強い線”（センタープレス/前立て/ロングネックレス）を置く"],
        care:       ["ヒップハンガー回避。ベルト位置で“面の分節”を作る"],
        quick:      "アウターは“丈で支配”。ヒップ中間〜下で迷ったら下を選ぶ"
      }},
      { when: p => p <= 30, add: {
        lines:      ["サイドへ逃すドレープ/比翼の軽さでフレームを狭く見せる"],
        train_strength:["外転筋/中殿筋（クラムシェル20回×2）で腰幅の見えを補正"],
        quick:      "上は短く・下は落ち感で“Y字”を意識（視覚重心↓）"
      }},
    ],
    balance: [
      { when: p => p >= 70, add: {
        lines:      ["V/ボート/深めのUで鎖骨〜胸元に“逃げ”を作る"],
        train_strength:["広背筋/僧帽中部（ラットプル/フェイスプル）で厚みを整える"],
        quick:      "トップスは前だけINで脚長に、腹部の厚みは見せない"
      }},
      { when: p => p <= 30, add: {
        lines:      ["ハイウエスト＋落ち感で“脚長＞脚幅”の印象を最優先"],
        care:       ["腸腰筋ストレッチで骨盤前傾を微修正→下重心のダルさ解消"],
        quick:      "靴は甲浅/やや尖りで“足の線を長く”見せる"
      }},
    ],
    line: [
      { when: p => p >= 70, add: {
        lines:      ["センタープレス/直線切替/比翼：曲線を“相殺”する直線を1つ"],
        accessories:["角のある金属/シャープな矩形で線を強調"],
        quick:      "柄はピンスト/ウィンドウペンなど“細い直線”を選ぶ"
      }},
      { when: p => p <= 30, add: {
        lines:      ["バイアス/ギャザーは“1箇所だけ”に限定して広がり過ぎを防ぐ"],
        accessories:["丸み/小粒/透け素材で硬さを緩和"],
        quick:      "襟はラウンド/ハート/スカーフタイの“1つ”で十分"
      }},
    ],
  };

  function axisPercent(axisKey){
    // resultView.js 側のを使う（なければ50%）
    if (typeof window.axisPercent === 'function') return window.axisPercent(axisKey);
    return { pct: 50 };
  }

  // BODY_TIPS（ベース）＋ 追加Tips（スコア別）を合成
  function buildPersonalizedTips(code){
    const base = (window.BODY_TIPS && window.BODY_TIPS[code]) || {};
    const add  = { diet_do:[], diet_avoid:[], train_strength:[], train_cardio:[], mobility:[], care:[], lines:[], accessories:[], quick:[] };

    const pf = axisPercent('frame').pct;
    const ps = axisPercent('surface').pct;
    const pb = axisPercent('balance').pct;
    const pl = axisPercent('line').pct;

    const apply = (list, pct)=>{
      if (!list) return;
      for (const rule of list){
        try{
          if (rule.when(pct)) {
            for (const k in rule.add) {
              const v = rule.add[k];
              if (Array.isArray(v)) add[k].push(...v);
              else if (typeof v === 'string') add[k].push(v);
            }
          }
        }catch(_){}
      }
    };
    apply(TIP_RULES.frame,   pf);
    apply(TIP_RULES.surface, ps);
    apply(TIP_RULES.balance, pb);
    apply(TIP_RULES.line,    pl);

    const uniq = arr => Array.from(new Set((arr||[]).filter(Boolean)));
    return {
      goal:          base.goal || "",
      diet_do:       uniq([...(base.diet_do||[]),       ...add.diet_do]),
      diet_avoid:    uniq([...(base.diet_avoid||[]),    ...add.diet_avoid]),
      train_strength:uniq([...(base.train_strength||[]),...add.train_strength]),
      train_cardio:  uniq([...(base.train_cardio||[]),  ...add.train_cardio]),
      mobility:      uniq([...(base.mobility||[]),      ...add.mobility]),
      care:          uniq([...(base.care||[]),          ...add.care]),
      lines:         uniq([...(base.lines||[]),         ...add.lines]),
      accessories:   uniq([...(base.accessories||[]),   ...add.accessories]),
      quick:         (base.quick || add.quick[0] || "")
    };
  }

  // ▼ 最終上書き：renderBodyTipsHTML（必ずこのファイルが最後に読み込まれるように！）
  window.renderBodyTipsHTML = function(code) {
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
  };

  // デバッグ用目印（コンソール確認用）
  window.__personalizedTipsApplied = true;
})();