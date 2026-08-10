// 共創プロジェクトの掲載申請時の必須チェック（純関数。actions と編集画面のバナーで共用）。
// 新規申請時（draft/closed → pending）だけ適用する。既存の公開中案件には適用しない。
// 販売・提供できる商品（offering-publish.ts）と同じ思想。

export type ProjectPublishCheckInput = {
  title: string;
  oneLiner: string | null;
  purposeMain: string | null;
  challengeIssue: string | null;
  coCreationGoal: string | null;
  stage: string | null;
  deadline: Date | null;
  publicRoleCount: number; // 公開の募集役割の数
};

export function missingForProjectPublish(p: ProjectPublishCheckInput): string[] {
  const missing: string[] = [];
  if (!p.title) missing.push("プロジェクト名");
  if (!p.oneLiner) missing.push("一言で表す目的");
  if (!p.purposeMain) missing.push("主目的");
  if (!p.challengeIssue) missing.push("どのような課題がありますか");
  if (!p.coCreationGoal) missing.push("共創によって何を実現したいですか");
  if (!p.stage) missing.push("現在の段階");
  if (!p.deadline) missing.push("募集期限");
  else if (p.deadline.getTime() < Date.now()) missing.push("募集期限（過去の日付です）");
  if (p.publicRoleCount < 1) missing.push("募集する相手・役割（1件以上）");
  return missing;
}
