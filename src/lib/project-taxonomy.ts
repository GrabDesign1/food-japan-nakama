// 共創プロジェクトの選択肢定数（表示文言とDB値を分離。NAKAMA_projects指示書 §4,5,9,12）
// サーバー・クライアント両方から import される純粋な定数モジュール。

export const PROJECT_PURPOSES = [
  ["new_product", "新商品を共同開発したい"],
  ["surplus", "余剰食品・副産物を活用したい"],
  ["sales_channel", "販路を共同開拓したい"],
  ["pilot_test", "実証実験を行いたい"],
  ["regional", "地域資源を事業化したい"],
  ["seek_resource", "技術・設備・原料を探したい"],
  ["fjs", "Food Japan Summitの出会いから事業をつくりたい"],
  ["other", "その他の課題を解決したい"],
] as const;

export const PURPOSE_LABEL: Record<string, string> = Object.fromEntries(PROJECT_PURPOSES);

export const PROJECT_STAGES = [
  ["idea", "構想"],
  ["research", "調査"],
  ["prototype", "試作"],
  ["pilot", "実証"],
  ["prelaunch", "販売準備"],
  ["running", "すでに事業化"],
] as const;

export const STAGE_LABEL: Record<string, string> = Object.fromEntries(PROJECT_STAGES);

export const RESOURCE_KINDS = [
  ["material", "原料・商品"],
  ["tech", "技術・ノウハウ"],
  ["facility", "設備・場所"],
  ["channel", "販路・顧客接点"],
  ["people", "人材・運営力"],
  ["data", "データ・研究成果"],
  ["network", "地域ネットワーク"],
  ["pr", "広報・イベント機会"],
  ["fund", "資金"],
  ["other", "その他"],
] as const;

export const RESOURCE_KIND_LABEL: Record<string, string> = Object.fromEntries(RESOURCE_KINDS);

// 報酬・費用負担・売上分配。「未定」と「なし（無償）」は別値（指示書 §5-5）
export const REWARD_POLICIES = [
  ["decided", "決定済み"],
  ["negotiable", "応相談"],
  ["none", "なし（無償）"],
  ["tbd", "未定"],
] as const;

export const REWARD_POLICY_LABEL: Record<string, string> = Object.fromEntries(REWARD_POLICIES);

// Food Japan Summit 連携フラグ（指示書 §5-5, §12）
export const EVENT_FLAGS = [
  ["fjs_origin", "Food Japan Summit発のプロジェクト"],
  ["miyazaki", "宮崎会場で相談したい"],
  ["nagoya", "名古屋会場で相談したい"],
  ["business_meeting", "商談会への参加"],
  ["tasting", "試食・試飲可能"],
  ["tour", "現地視察可能"],
] as const;

export const EVENT_FLAG_LABEL: Record<string, string> = Object.fromEntries(EVENT_FLAGS);

// 応募者ごとの進捗5段階（指示書 §9）＋別状態
export const PROGRESS_STAGES = [
  ["inquiry", "問い合わせ・応募"],
  ["meeting", "面談・検討"],
  ["planning", "企画・条件調整"],
  ["pilot", "実証・試作"],
  ["contract", "契約・事業化"],
] as const;

export const PROGRESS_EXTRAS = [
  ["hold", "保留"],
  ["declined", "見送り"],
  ["done", "完了"],
] as const;

export const PROGRESS_LABEL: Record<string, string> = Object.fromEntries([
  ...PROGRESS_STAGES,
  ...PROGRESS_EXTRAS,
]);

/** 進捗が「進行中」扱いか（保留・見送り・完了は折りたたみ対象） */
export function isActiveProgress(stage: string): boolean {
  return PROGRESS_STAGES.some(([v]) => v === stage);
}

export const MEETING_WISHES = [
  ["yes", "面談を希望する"],
  ["undecided", "まずは情報交換から"],
  ["no", "メッセージのみ希望"],
] as const;

export const MEETING_WISH_LABEL: Record<string, string> = Object.fromEntries(MEETING_WISHES);

/** 募集期限を過ぎているか */
export function isProjectDeadlinePassed(d: Date | null): boolean {
  return !!d && d.getTime() < Date.now();
}

/** 次の行動の期限状態（応募者管理・ダッシュボードで共用） */
export function nextActionDueState(
  progressStage: string,
  due: Date | null
): "overdue" | "soon" | "none" | "ok" {
  if (!isActiveProgress(progressStage)) return "ok";
  if (!due) return "none";
  const now = Date.now();
  if (due.getTime() < now) return "overdue";
  if (due.getTime() < now + 7 * 86_400_000) return "soon";
  return "ok";
}

/** 次回打ち合わせが7日以内か */
export function isMeetingSoon(meeting: Date | null): boolean {
  if (!meeting) return false;
  const now = Date.now();
  return meeting.getTime() > now && meeting.getTime() < now + 7 * 86_400_000;
}

/** 募集期限の表示（Offering の formatDeadline と同思想） */
export function formatProjectDeadline(d: Date | null): string | null {
  if (!d) return null;
  const now = Date.now();
  const days = Math.ceil((d.getTime() - now) / 86_400_000);
  const ymd = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  if (days < 0) return `${ymd}（終了）`;
  if (days <= 7) return `${ymd}（あと${Math.max(days, 0)}日）`;
  return ymd;
}
