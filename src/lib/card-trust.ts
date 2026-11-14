import { currentStrength, MAX_STRENGTH } from "@/lib/card-relationship";

/**
 * ⚠️⚠️ **「成約」の定義（ユーザー決定 2026-11-06）＝「商談が実施された時点」。受注ではない。**
 *
 *    支払いと報酬は、**商談が実施された時点**で発生する。契約が取れたかどうかは問わない。
 *    コード中の `settled` / `settledDeals` / `pointsForDeal` はすべてこの意味。
 *    ⚠️ 「成約」という語は普通は受注を指すので、**読み違えると報酬の意味が変わる**。
 *       画面に出す日本語は必ず**「商談実施」**と書くこと。「成約」とは書かない。
 */

/**
 * 関係の種類（関係係数）と、信用残高。
 *
 * 考え方（ユーザー指示 2026-11-06）：
 *   「友達、上司、取引先、知り合い、名刺交換しただけの人。その関係係数をだして、
 *     他の方の紹介時にそのスコアがでる。本人も信用残高を削って紹介するわけなので、
 *     そこを分かったうえで提出する」
 *
 * 紹介には**コスト**がある。現実でも、人を紹介するということは自分の信用を預けること。
 * 雑な紹介を重ねれば、紹介した相手からの信用が減る。それをそのまま数値にする。
 *
 * ⚠️ これが**質の担保そのもの**。紹介にコストが無いマーケットは、数を出した者勝ちになって必ず質が落ちる。
 *    信用残高を削る形にすると濫発が自分の損になるので、自動的に止まる。**この仕組みを外さないこと。**
 *
 * ⚠️ **関係の種類は、相手本人には絶対に見せない。** 「あの人は私を"知り合い"と登録している」が
 *    見えると人間関係を壊す。企業に見せるのも**段階（強い／中くらい／弱い）までで、
 *    種類そのものと生の数値は出さない**。「上司」と出すと対象者の勤務関係という
 *    個人データを、本人の同意なく企業に知らせることになる。
 */

/** 関係の種類。紹介者の自己申告。並び順は係数の高い順 */
export type RelationTier = {
  code: "inner" | "friend" | "client" | "colleague" | "boss" | "acquaintance" | "card_only";
  label: string;
  /** 関係係数の上限（0〜1）。「頼めば会ってくれる確からしさ」の目安 */
  coefficient: number;
  /**
   * 関係係数の**下限**。どれだけ間が空いても、ここより下にはならない。
   * ⚠️ 下限が無いと「5年連絡していない親友」が「ほぼ面識のみ」と同じ扱いになる。
   *    現実には親友は5年空いても親友なので、種類ごとに床を置いている。
   */
  floor: number;
  hint: string;
};

export const RELATION_TIERS: RelationTier[] = [
  { code: "inner",        label: "家族・親友",        coefficient: 1.0,  floor: 0.50, hint: "いつでも連絡が取れる。" },
  { code: "friend",       label: "友人",              coefficient: 0.85, floor: 0.30, hint: "気軽に声をかけられる。" },
  { code: "client",       label: "取引先",            coefficient: 0.75, floor: 0.15, hint: "仕事の関係が続いている。" },
  { code: "colleague",    label: "同僚・元同僚",      coefficient: 0.7,  floor: 0.15, hint: "一緒に働いた（いる）。" },
  { code: "boss",         label: "上司・元上司",      coefficient: 0.6,  floor: 0.10, hint: "頼めるが、気を遣う相手。" },
  { code: "acquaintance", label: "知り合い",          coefficient: 0.35, floor: 0.05, hint: "何度か話したことがある。" },
  { code: "card_only",    label: "名刺を交換しただけ", coefficient: 0.1,  floor: 0.00, hint: "まだ関係はこれから。" },
];

export const DEFAULT_TIER: RelationTier = RELATION_TIERS[RELATION_TIERS.length - 1];

export function tierByCode(code: string | null | undefined): RelationTier {
  return RELATION_TIERS.find((t) => t.code === code) ?? DEFAULT_TIER;
}

/**
 * 関係係数（0〜1）＝ 種類の係数 × 関係性の強さ。ただし種類ごとの**床**を下回らない。
 *
 * 種類がどれだけ近くても、何年も連絡していなければ下がる。
 * 「親友だが5年会っていない」は「最近よく話す取引先」より低く出る。これは正しい。
 * ただし床があるので、親友が「名刺を交換しただけ」の人と同列にはならない。
 */
export function relationCoefficient(
  tierCode: string | null | undefined,
  strengthAtLastContact: number,
  lastContactAt: Date,
  now: Date = new Date()
): number {
  const tier = tierByCode(tierCode);
  const strength = currentStrength(strengthAtLastContact, lastContactAt, now);
  const decayed = tier.coefficient * (strength / MAX_STRENGTH);
  // 種類ごとの床を下回らせない（5年空いた親友が「ほぼ面識のみ」にならないように）
  return Math.round(Math.max(tier.floor, decayed) * 1000) / 1000;
}

/** 企業に見せる段階。**生の数値と種類は出さない** */
export type ScoreBand = { code: "high" | "mid" | "low" | "thin"; label: string; note: string };

export function scoreBand(coefficient: number): ScoreBand {
  if (coefficient >= 0.6) return { code: "high", label: "強いつながり", note: "紹介者が直接声をかけられる関係です。" };
  if (coefficient >= 0.3) return { code: "mid",  label: "つながりあり", note: "面識があり、連絡は取れる関係です。" };
  if (coefficient >= 0.1) return { code: "low",  label: "ゆるいつながり", note: "面識はありますが、間が空いています。" };
  return { code: "thin", label: "ほぼ面識のみ", note: "名刺を交換した程度の関係です。" };
}

// ───────────────────────── 信用残高 ─────────────────────────

/** 登録時の信用残高 */
export const INITIAL_TRUST = 100;
/** 信用残高の上限。青天井にしない（上位者が無制限に紹介を出せると質が落ちる） */
export const MAX_TRUST = 300;
/** これを下回ると新しい紹介を出せない */
export const MIN_TRUST_TO_INTRODUCE = 10;

/**
 * 紹介1件を出すときに**仮に押さえる**信用（＝削られる分）。
 *
 * ⚠️ **関係が近いほどコストが高い。** 近い相手を紹介するということは、
 *    それだけ大きい信用を預けること。雑に使えば本当に失う。
 *    逆にしないこと（近いほど安くすると、親しい人から順に消費されて関係が焼ける）。
 */
export function introductionCost(coefficient: number): number {
  return Math.max(3, Math.round(coefficient * 40));
}

/** 信用残高の増減の理由 */
export type TrustEntryType =
  | "initial"      // 登録時の付与
  | "hold"         // 紹介を出した（仮押さえ・マイナス）
  | "release"      // 紹介が取り下げ・不成立で戻った（プラス）
  | "settled"      // **商談が実施された**（戻し＋上乗せ）。受注ではない
  | "declined"     // 紹介先に断られた（戻らない分がある）
  | "complaint"    // 迷惑・無断だと申告された（没収）
  | "admin_adjust";

/** 商談が**実施された**ときに戻ってくる量（押さえた分＋2割）。受注とは無関係 */
export function settledGain(heldCost: number): number {
  return Math.round(heldCost * 1.2);
}

/** 断られたとき。半分は戻る（断られること自体は悪ではない） */
export function declinedGain(heldCost: number): number {
  return Math.round(heldCost * 0.5);
}

/**
 * 迷惑・無断紹介と判定されたとき。押さえた分は戻らず、さらに同額を引く。
 * ⚠️ 判定は事務局が行う。自動にしないこと（相手の一方的な申告で信用が消える作りは危険）。
 */
export function complaintPenalty(heldCost: number): number {
  return -heldCost;
}

export function clampTrust(value: number): number {
  return Math.max(0, Math.min(MAX_TRUST, Math.round(value)));
}

/** いま何件くらい紹介を出せるか（目安表示用） */
export function remainingIntroductions(trust: number, coefficient: number): number {
  return Math.floor(trust / introductionCost(coefficient));
}

// ──────────────── 紹介の結果（傷は両方向に出る） ────────────────

/**
 * 紹介がどう終わったか。
 *
 * ⚠️ **傷は両方向に出る**（ユーザー指示 2026-11-06）。
 *    変な人を紹介すれば、企業は「なんだこれ？」となる。
 *    同時に、紹介された側も「何だあの人の紹介は？」となる。
 *    片側だけ数えると、紹介者にとって**企業に嫌われるコストしか無い**ことになり、
 *    「自分のつながりを雑に差し出す」のが得になってしまう。そうさせない。
 *
 * ⚠️ もっとも重いのは `target_complaint`（紹介された相手が迷惑だったと言っている）。
 *    信用残高が減るだけでなく、**その相手との関係性そのものを焼く**。現実と同じ。
 */
export type IntroductionOutcome =
  | "settled"            // **商談が実施された**（受注ではない）。ここで支払いと報酬が発生する
  | "declined"           // 紹介先に断られた（よくあること。罰ではない）
  | "no_response"        // 返事が無いまま期限切れ
  | "abandoned"          // つないだきり、紹介者が一度も関与しなかった
  | "company_complaint"  // 企業から「頼んだ条件と違う」
  | "target_complaint";  // 紹介された相手から「勝手に話を回された」

export type OutcomeEffect = {
  /** 信用残高の増減 */
  trustDelta: number;
  /** 紹介した相手との関係性の強さへの加算（マイナス＝関係が傷つく） */
  relationDelta: number;
  /** 画面に出す説明 */
  note: string;
};

/**
 * 結果ごとの効き方。`heldCost` は紹介を出したときに押さえた分。
 *
 * ⚠️ 判定（とくに2つの complaint）は**事務局が行う**。自動にしないこと。
 *    相手の一方的な申告だけで信用が消える作りは、嫌がらせに使われる。
 */
export function outcomeEffect(outcome: IntroductionOutcome, heldCost: number): OutcomeEffect {
  switch (outcome) {
    case "settled":
      return {
        trustDelta: settledGain(heldCost),
        relationDelta: +20,
        note: "商談が実施されました。報酬をお支払いします。信用が戻り、上乗せされます。",
      };
    case "declined":
      return {
        trustDelta: declinedGain(heldCost),
        relationDelta: 0,
        note: "今回は見送りでした。断られること自体は減点ではありません。",
      };
    case "no_response":
      return {
        trustDelta: 0,
        relationDelta: -5,
        note: "返事がないまま期限を過ぎました。押さえた分は戻りません。",
      };
    case "abandoned":
      return {
        // 押さえた分は戻らない。自分の責任を回して降りる使い方を割に合わなくする
        trustDelta: 0,
        relationDelta: -15,
        note: "つないだあと、やり取りに一度も参加されませんでした。押さえた信用は戻りません。",
      };
    case "company_complaint":
      return {
        trustDelta: complaintPenalty(heldCost),
        relationDelta: 0,
        note: "依頼した条件と違う、と企業から申告がありました。",
      };
    case "target_complaint":
      return {
        // 押さえた分が戻らないうえ、さらに同額の2倍を引く（いちばん重い）
        trustDelta: complaintPenalty(heldCost) * 2,
        // 関係性をほぼゼロまで焼く。MAX_STRENGTH 分を引くので、どの状態からでも底に落ちる
        relationDelta: -MAX_STRENGTH,
        note: "紹介された方から、話を勝手に回されたという申告がありました。この方との関係はリセットされます。",
      };
  }
}

/**
 * 紹介を出す前に本人へ見せる内容。
 * 「そこを分かったうえで提出する」ための画面文言の素。
 */
export type IntroductionPreview = {
  coefficient: number;
  band: ScoreBand;
  cost: number;
  trustAfter: number;
  canSubmit: boolean;
  /** 出せない理由。出せるときは null */
  blockedReason: string | null;
  /** いちばん重い結果になったときに失う信用 */
  worstCaseTrustLoss: number;
};

export function previewIntroduction(trust: number, coefficient: number): IntroductionPreview {
  const cost = introductionCost(coefficient);
  const band = scoreBand(coefficient);
  const trustAfter = clampTrust(trust - cost);
  const worst = outcomeEffect("target_complaint", cost);

  let blockedReason: string | null = null;
  if (trust < MIN_TRUST_TO_INTRODUCE) {
    blockedReason = "信用残高が不足しています。既に出している紹介が成立すると回復します。";
  } else if (trust < cost) {
    blockedReason = "この紹介に必要な信用残高が足りません。関係の近い方ほど多く必要になります。";
  }

  return {
    coefficient,
    band,
    cost,
    trustAfter,
    canSubmit: blockedReason === null,
    blockedReason,
    worstCaseTrustLoss: cost - worst.trustDelta,
  };
}

// ──────────── 「自分が逃げるための紹介」を抑える ────────────

/**
 * 紹介は、自分の責任を回避する手段にも使える（ユーザー指示 2026-11-06）。
 * 面倒な話を「この人に聞いてください」と他人に回し、自分は降りる。
 * 回された側は損をするが、角が立つので**表立った苦情は出さない**。
 * だから `target_complaint` では捕まらない。静かに捕まえる必要がある。
 *
 * 手当ては3つ。どれか1つでは効かないので、3つ揃えて使うこと。
 *   (1) 同じ相手に回し続けるとコストが上がる  … repeatMultiplier
 *   (2) つないで降りると信用が戻らない        … "abandoned"
 *   (3) 紹介先が非公開で静かに評価できる      … QuietFeedback
 */

/**
 * (1) 直近90日に同じ相手へ出した紹介の件数に応じて、コストを引き上げる。
 * 「あの人に回しておけばいい」を割に合わなくする。
 */
export function repeatMultiplier(introductionsToSameTargetInLast90Days: number): number {
  const n = Math.max(0, introductionsToSameTargetInLast90Days);
  if (n === 0) return 1;
  if (n === 1) return 1.6;
  if (n === 2) return 2.5;
  return 4;
}

/** 同じ相手への回し過ぎを織り込んだ、実際のコスト */
export function introductionCostWithRepeat(
  coefficient: number,
  introductionsToSameTargetInLast90Days: number
): number {
  return Math.max(
    3,
    Math.round(introductionCost(coefficient) * repeatMultiplier(introductionsToSameTargetInLast90Days))
  );
}

/**
 * (3) 紹介先が、紹介ごとに静かに答える評価。
 * ⚠️ **紹介者にも企業にも、誰が何と答えたかは見せない。** 見える形にすると
 *    気を遣って全員 helpful を押すので、意味が無くなる。集計だけを内部で使う。
 */
export type QuietFeedback = "helpful" | "neutral" | "not_helpful";

export const QUIET_FEEDBACK_EFFECT: Record<QuietFeedback, { trustDelta: number; relationDelta: number }> = {
  helpful:     { trustDelta: +5, relationDelta: +10 },
  neutral:     { trustDelta: 0,  relationDelta: 0 },
  // 苦情ほど重くはしない。黙って押せる重さにしておくのが肝
  not_helpful: { trustDelta: -8, relationDelta: -15 },
};

// ─────────── 「近いほど良い」は紹介の価値には当てはまらない ───────────

/**
 * ⚠️ **この設計でいちばん大きい修正（2026-11-06・文献確認の結果）。**
 *
 * 当初、関係係数が高い（＝近い）ほど紹介として良い、という単調な作りにしていた。
 * これは**実証研究と逆**だった。
 *
 *   Rajkumar et al., "A Causal Test of the Strength of Weak Ties",
 *   Science 377, 1304-1310 (2022). LinkedIn で2000万人・5年・20億のつながり・
 *   60万件の転職を対象にした無作為化実験。結果は**逆U字**で、
 *   もっとも効くのは「いちばん弱いつながり」ではなく**中くらいに弱いつながり**。
 *   強いつながりはむしろ効きが弱い。
 *   （ただし産業による差があり、デジタル度の低い産業では強いつながりが効いた。
 *     食品・農業はむしろ後者寄りの可能性があるので、**自社のデータで必ず検証すること**。）
 *
 * なので2つに分ける。混ぜない。
 *   - reachability（頼めば会ってくれるか）… 近いほど高い。**信用コストの基礎**
 *   - novelty（新しい機会になるか）      … 中くらいに弱い関係が最良。**逆U字**
 *
 * 紹介の期待値 ＝ reachability × novelty。
 * これで「会ってくれるが、既に知っている相手」と「新しいが、会ってくれない相手」が
 * どちらも低く出て、中間がいちばん高くなる。
 */

/** そのまま関係係数。頼めば会ってくれるかの目安（近いほど高い） */
export function reachability(coefficient: number): number {
  return coefficient;
}

/**
 * 新しい機会としての価値。逆U字で、**0.4 あたりが最大**。
 * r^2 * (1-r)^3 を最大値で正規化したもの（ピークが 2/(2+3) = 0.4 に来る）。
 */
export function noveltyValue(coefficient: number): number {
  const r = Math.max(0, Math.min(1, coefficient));
  const peak = Math.pow(0.4, 2) * Math.pow(0.6, 3); // 0.03456
  return Math.round((Math.pow(r, 2) * Math.pow(1 - r, 3)) / peak * 1000) / 1000;
}

/** 紹介の期待値（0〜1）。企業へのマッチ度の基礎に使う */
export function expectedIntroductionValue(coefficient: number): number {
  return Math.round(reachability(coefficient) * noveltyValue(coefficient) * 1000) / 1000;
}

/**
 * ⚠️ **金銭報酬を近い関係に出さないこと。**
 *
 *   Heyman & Ariely, "Effort for Payment: A Tale of Two Markets",
 *   Psychological Science 15(11), 787-793 (2004).
 *   社会的な関係に金銭の手がかりを混ぜると、人はその関係を**取引として見るようになる**。
 *   少額の支払いは、無償のときより努力を下げる。社会的手がかりと金銭的手がかりが
 *   混ざった市場は、金銭市場とほぼ同じように受け取られる。
 *   ⚠️ この論文には Expression of Concern が付いている版がある。**引用前に確認すること。**
 *
 * 「友人を紹介して3万円」は、友情を取引に変えてしまう危険がある。
 * さいわい、上の逆U字と結論が一致する：**報酬は中くらいに弱い関係に集中させるのが、
 * 機会価値の点でも、関係を壊さない点でも正しい。**
 *
 * 近い関係（家族・親友・友人）には、金銭ではない形を選べるようにする。
 */
export function rewardMode(coefficient: number): { mode: "cash" | "choice"; note: string } {
  if (coefficient >= 0.6) {
    return {
      mode: "choice",
      note: "近しい間柄の紹介です。報酬は現金のほか、寄付やサミット参加権からお選びいただけます。",
    };
  }
  return { mode: "cash", note: "紹介が成立した場合、報酬をお支払いします。" };
}

// ───── 近い関係は輪の中にある。失うと輪ごと失う（居場所がなくなる） ─────

/**
 * ⚠️ **この設計でいちばん重い指摘（ユーザー 2026-11-06）。**
 *   「近いと信用残高が削られた時に嫌われたり、居場所がなくなるからです」
 *   「信用を逃すのは一瞬です」
 *
 * 近い相手は、**共通の知り合いが多い輪の中**にいる。だから紹介が失敗したとき、
 * 傷つくのはその1人との関係だけではなく、**輪ごと**になる。これが「居場所がなくなる」。
 * 弱いつながりは橋で、共通の知り合いがほとんどいないので、失敗しても波及しない。
 * （Granovetter が「強いつながりは閉じた三角形の中にあり、弱いつながりが橋になる」と
 *   整理したのと同じ構造。LinkedIn の実験で弱いつながりが効いたのも、橋だから。）
 *
 * ⚠️ 波及を入れないと、近い関係を紹介に出すコストを**実態より軽く見せる**ことになる。
 *    それは利用者に嘘をつくことなので、入れないという選択肢は無い。
 */

/**
 * 埋め込み度（0〜1）。共通の知り合いがどれだけいるか。
 * 高いほど「輪の中」の相手で、失敗が波及する。
 */
export function embeddedness(mutualConnections: number, myConnections: number): number {
  if (myConnections <= 0) return 0;
  return Math.min(1, mutualConnections / Math.max(5, myConnections * 0.25));
}

/** 失敗したとき、共通の知り合い**1人あたり**に波及する関係性の傷 */
export function spilloverPerMutual(relationDamage: number, embed: number): number {
  return Math.round(relationDamage * embed * 0.35);
}

/** 失敗したときに影響が及ぶ人数の見込み（本人へ事前に見せる） */
export function spilloverReach(mutualConnections: number, embed: number): number {
  return Math.round(mutualConnections * embed);
}

/**
 * 信用の非対称性。**積むのは何件分、失うのは一度。**
 *
 * ⚠️ 1件の成立で戻る量に**上限**を置く。失敗の側には上限を置かない。
 *    これを対称にすると「失敗しても数こなせば取り返せる」になり、濫発が復活する。
 */
export const MAX_TRUST_GAIN_PER_SETTLEMENT = 40;

export function cappedTrustGain(raw: number): number {
  return Math.min(MAX_TRUST_GAIN_PER_SETTLEMENT, raw);
}

/**
 * 一度の失敗を取り返すのに必要な、成立の件数。
 *
 * ⚠️ 取り返す側は「**普通の紹介**」で数えること。同じ重さの紹介で割ると、
 *    損失も戻りもコストに比例するため**どの関係でも同じ件数**になってしまい、
 *    「近い人を失うほど取り返しにくい」という肝心のことが表現できない（2026-11-06に実測して発覚）。
 *    実際、一度信用を失った人が、いきなり同じ重さの紹介を出せるわけがない。
 */
/** 取り返すときに使える「普通の紹介」の目安コスト（中くらいに弱い関係＝係数0.4相当） */
const TYPICAL_COST = 16;

export function settlementsToRecover(trustLoss: number): number {
  const perSettlement = cappedTrustGain(settledGain(TYPICAL_COST));
  return Math.max(1, Math.ceil(Math.abs(trustLoss) / Math.max(1, perSettlement)));
}

/** 提出前に本人へ見せる「失うもの」の全体像 */
export type DownsidePreview = {
  /** 最悪の場合に失う信用 */
  trustLoss: number;
  /** それを取り返すのに必要な成立件数 */
  settlementsToRecover: number;
  /** 影響が及ぶ共通の知り合いの人数 */
  spilloverPeople: number;
  /** 本人に見せる一文 */
  message: string;
};

export function downsidePreview(
  coefficient: number,
  mutualConnections: number,
  myConnections: number,
  repeatCount = 0
): DownsidePreview {
  const cost = introductionCostWithRepeat(coefficient, repeatCount);
  const worst = outcomeEffect("target_complaint", cost);
  const trustLoss = cost - worst.trustDelta;
  const embed = embeddedness(mutualConnections, myConnections);
  const people = spilloverReach(mutualConnections, embed);
  const recover = settlementsToRecover(trustLoss);

  const parts = [
    `この紹介がうまくいかなかった場合、信用を ${trustLoss} 失います。`,
    `取り返すには、紹介が成立するところまで ${recover} 件ぶん必要です。`,
  ];
  if (people > 0) {
    parts.push(`共通の知り合い ${people} 名との関係にも影響します。`);
  }

  return {
    trustLoss,
    settlementsToRecover: recover,
    spilloverPeople: people,
    message: parts.join(""),
  };
}
