"use client";

// 共創プロジェクトの登録・編集フォーム（2026-08-10 共創プロジェクト改修）。
// - 「目的と基本情報」「背景と実現したいこと」「現在地」「持っているもの・足りないもの」「条件・イベント連携」の章立て
// - 質問に答える形式（入力例つき）
// - 右側に「公開ページの見え方」ライブプレビュー（未入力は「入力する→」で該当欄へジャンプ）
// - id が null のときは新規作成モード（保存時に初めてDBレコードを作る。売りたい（提供したい）と同方式）
import { useActionState, useState } from "react";
import {
  saveProject,
  createProject,
  type ProjectState,
  type ProjectRoleInput,
  type ProjectResourceInput,
} from "../actions";
import { ProjectImageUploader } from "./ProjectImageUploader";
import { ProjectTempImageUploader } from "./ProjectTempImageUploader";
import { ProjectBodyImage } from "./ProjectBodyImage";
import { CATEGORY_L1, PREFECTURES } from "@/lib/member-taxonomy";
import {
  PROJECT_PURPOSES,
  PURPOSE_LABEL,
  PROJECT_STAGES,
  STAGE_LABEL,
  RESOURCE_KINDS,
  RESOURCE_KIND_LABEL,
  REWARD_POLICIES,
  EVENT_FLAGS,
} from "@/lib/project-taxonomy";
import { btn } from "@/lib/ui";

export type ProjectData = {
  id: string | null; // null = 新規作成（保存時にレコード作成）
  title: string;
  body: string | null;
  fromRole: string | null;
  area: string | null;
  budget: string | null;
  tags: string[];
  imageUrls: string[];
  bodyImageUrl: string | null;
  // 目的と基本情報
  purposeMain: string | null;
  purposeSub: string[];
  oneLiner: string | null;
  deadline: string | null; // YYYY-MM-DD
  targetTiming: string | null;
  leaderName: string | null;
  // 背景と実現したいこと
  challengeIssue: string | null;
  challengeWhy: string | null;
  challengeWho: string | null;
  coCreationGoal: string | null;
  futureVision: string | null;
  // 現在地
  stage: string | null;
  stageDone: string | null;
  stageLearned: string | null;
  stageIssues: string | null;
  stageSchedule: string | null;
  existingPartners: string | null;
  // 条件・イベント連携
  period: string | null;
  place: string | null;
  rewardPolicy: string | null;
  contractNote: string | null;
  eventFlags: string[];
  supportRequested: boolean;
  // 子テーブル
  roles: ProjectRoleInput[];
  resources: ProjectResourceInput[];
};

const labelCls = "flex flex-col gap-1 text-[12px] text-[var(--ink-2)]";
const inputCls =
  "rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]";

function Req() {
  return <span className="ml-1 text-[11px] text-[var(--red)]">必須</span>;
}
function Opt() {
  return <span className="ml-1 text-[11px] text-[var(--muted)]">任意</span>;
}

// プレビューの本文ブロック（空なら非表示・3行で省略）
function PreviewBlock({ label, text }: { label: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <div className="mt-3">
      <div className="text-[11px] font-bold text-[var(--muted)]">{label}</div>
      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[12px] leading-5 text-[var(--ink-2)]">
        {text.trim()}
      </p>
    </div>
  );
}

function SectionHead({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="border-t border-[var(--line)] pt-5">
      <h2 className="text-[16px] font-bold text-[var(--ink)]">{title}</h2>
      {desc ? <p className="mt-0.5 text-[12px] text-[var(--muted)]">{desc}</p> : null}
    </div>
  );
}

const EMPTY_ROLE: ProjectRoleInput = {
  name: "",
  request: "",
  requirement: "",
  headcount: "",
  period: "",
  reward: "",
  isPublic: true,
};

const EMPTY_RESOURCE: ProjectResourceInput = {
  kind: "material",
  description: "",
  condition: "",
};

export function ProjectForm({ project }: { project: ProjectData }) {
  const isCreate = project.id === null;
  const action = isCreate ? createProject : saveProject.bind(null, project.id as string);
  const [state, formAction, pending] = useActionState<ProjectState, FormData>(action, {});

  // ── プレビュー用の制御state ──
  const [title, setTitle] = useState(project.title);
  const [oneLiner, setOneLiner] = useState(project.oneLiner ?? "");
  const [purposeMain, setPurposeMain] = useState(project.purposeMain ?? "");
  const [area, setArea] = useState(project.area ?? "");
  const [deadline, setDeadline] = useState(project.deadline ?? "");
  const [challengeIssue, setChallengeIssue] = useState(project.challengeIssue ?? "");
  const [challengeWhy, setChallengeWhy] = useState(project.challengeWhy ?? "");
  const [challengeWho, setChallengeWho] = useState(project.challengeWho ?? "");
  const [coCreationGoal, setCoCreationGoal] = useState(project.coCreationGoal ?? "");
  const [futureVision, setFutureVision] = useState(project.futureVision ?? "");
  const [stage, setStage] = useState(project.stage ?? "");
  const [stageDone, setStageDone] = useState(project.stageDone ?? "");
  const [tags, setTags] = useState(project.tags.join(", "));
  const [tempImages, setTempImages] = useState<string[]>([]);
  const [roles, setRoles] = useState<ProjectRoleInput[]>(
    project.roles.length ? project.roles : []
  );
  const [resources, setResources] = useState<ProjectResourceInput[]>(
    project.resources.length ? project.resources : []
  );
  const [eventFlags, setEventFlags] = useState<string[]>(project.eventFlags);

  function updateRole(i: number, patch: Partial<ProjectRoleInput>) {
    setRoles((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function updateResource(i: number, patch: Partial<ProjectResourceInput>) {
    setResources((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const deadlineDate = /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? new Date(`${deadline}T23:59:59+09:00`) : null;
  const previewDeadline = deadlineDate
    ? `${deadlineDate.getFullYear()}年${deadlineDate.getMonth() + 1}月${deadlineDate.getDate()}日`
    : null;

  // プレビュー行（未入力は該当の入力欄へジャンプできるリンクを出す）
  const previewRows: { label: string; value: string | null; anchor: string }[] = [
    { label: "主目的", value: purposeMain ? PURPOSE_LABEL[purposeMain] ?? null : null, anchor: "f-purpose" },
    { label: "現在の段階", value: stage ? STAGE_LABEL[stage] ?? null : null, anchor: "f-stage" },
    { label: "実施地域", value: area || null, anchor: "f-area" },
    { label: "募集期限", value: previewDeadline, anchor: "f-deadline" },
    {
      label: "募集する役割",
      value: roles.filter((r) => r.name.trim() && r.isPublic).length
        ? roles
            .filter((r) => r.name.trim() && r.isPublic)
            .map((r) => r.name.trim())
            .slice(0, 3)
            .join("・")
        : null,
      anchor: "f-roles",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
      <form action={formAction} className="flex min-w-0 flex-col gap-5">
        {/* 役割・提供資源はJSONで送る（サーバー側で検証） */}
        <input type="hidden" name="rolesJson" value={JSON.stringify(roles)} />
        <input type="hidden" name="resourcesJson" value={JSON.stringify(resources)} />

        {/* ── 目的と基本情報 ── */}
        <div>
          <h2 className="text-[16px] font-bold text-[var(--ink)]">目的と基本情報</h2>
          <p className="mt-0.5 text-[12px] text-[var(--muted)]">
            質問に答えるだけで、読みやすい募集ページが完成します。
          </p>
        </div>

        {/* 画像（新規作成時は一時アップロード→保存時に自動で紐付け） */}
        {isCreate ? (
          <>
            <ProjectTempImageUploader images={tempImages} onChange={setTempImages} />
            {tempImages.map((u) => (
              <input key={u} type="hidden" name="tempImageUrls" value={u} />
            ))}
          </>
        ) : (
          <ProjectImageUploader projectId={project.id as string} images={project.imageUrls} />
        )}

        <div id="f-purpose" className="scroll-mt-24">
          <div className="mb-1.5 text-[12px] text-[var(--ink-2)]">
            何を実現したいですか？（主目的）<Req />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PROJECT_PURPOSES.map(([value, label]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-2 rounded-[8px] border px-3 py-2.5 text-[13px] transition ${
                  purposeMain === value
                    ? "border-[var(--green)] bg-[var(--green-soft)] font-bold text-[var(--green-d)]"
                    : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--green)]"
                }`}
              >
                <input
                  type="radio"
                  name="purposeMain"
                  value={value}
                  checked={purposeMain === value}
                  onChange={() => setPurposeMain(value)}
                  className="accent-[var(--green)]"
                />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-[var(--muted)]">
            関連する目的があれば追加で選べます（任意・複数可）
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {PROJECT_PURPOSES.filter(([v]) => v !== purposeMain).map(([value, label]) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-1 rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[11px] text-[var(--ink-2)] has-[:checked]:border-[var(--green)] has-[:checked]:bg-[var(--green-soft)] has-[:checked]:text-[var(--green-d)]"
              >
                <input
                  type="checkbox"
                  name="purposeSub"
                  value={value}
                  defaultChecked={project.purposeSub.includes(value)}
                  className="accent-[var(--green)]"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <label className={labelCls}>
          <span>プロジェクト名<Req /></span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：クラフトビールの廃麦芽を地域の食品へ再生するプロジェクト"
            className={inputCls}
          />
        </label>

        <label id="f-oneliner" className={`${labelCls} scroll-mt-24`}>
          <span>一言で表す目的<Req /></span>
          <input
            name="oneLiner"
            value={oneLiner}
            onChange={(e) => setOneLiner(e.target.value)}
            placeholder="例：廃棄されていた麦芽を、生産者・食品メーカー・販売店と新しい商品にします"
            className={inputCls}
          />
          <span className="text-[11px] text-[var(--muted)]">一覧カードと詳細ページの冒頭に表示されます。</span>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label id="f-area" className={`${labelCls} scroll-mt-24`}>
            <span>実施地域<Opt /></span>
            <select name="area" value={area} onChange={(e) => setArea(e.target.value)} className={inputCls}>
              <option value="">未指定</option>
              <option value="全国">全国</option>
              <option value="オンライン">オンライン</option>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label id="f-deadline" className={`${labelCls} scroll-mt-24`}>
            <span>募集期限<Req /></span>
            <input
              type="date"
              name="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            <span>目標時期<Opt /></span>
            <input
              name="targetTiming"
              defaultValue={project.targetTiming ?? ""}
              placeholder="例：2027年春の商品化を目指す"
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            <span>プロジェクト責任者<Opt /></span>
            <input
              name="leaderName"
              defaultValue={project.leaderName ?? ""}
              placeholder="例：梅原 卓也（代表）"
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            <span>あなたの立場<Opt /></span>
            <select name="fromRole" defaultValue={project.fromRole ?? ""} className={inputCls}>
              <option value="">未選択</option>
              {CATEGORY_L1.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        {/* ── 背景と実現したいこと（質問形式） ── */}
        <SectionHead
          title="背景と実現したいこと"
          desc="質問に答える形式です。1問2〜3行でも十分です。"
        />

        <div id="f-issue" className={`${labelCls} scroll-mt-24`}>
          <span>どのような課題がありますか？<Req /></span>
          <textarea
            name="challengeIssue"
            value={challengeIssue}
            onChange={(e) => setChallengeIssue(e.target.value)}
            rows={3}
            placeholder="例：ビール醸造で毎週約200kgの麦芽粕が発生し、費用をかけて廃棄しています。"
            className={inputCls}
          />
        </div>

        <div className={labelCls}>
          <span>なぜ、その課題を解決したいのですか？<Opt /></span>
          <textarea
            name="challengeWhy"
            value={challengeWhy}
            onChange={(e) => setChallengeWhy(e.target.value)}
            rows={3}
            placeholder="例：地域の資源を捨てるのはもったいない。食品ロス削減と地域の新しい特産品づくりを両立したいからです。"
            className={inputCls}
          />
        </div>

        <div className={labelCls}>
          <span>誰に、どのような影響がありますか？<Opt /></span>
          <textarea
            name="challengeWho"
            value={challengeWho}
            onChange={(e) => setChallengeWho(e.target.value)}
            rows={3}
            placeholder="例：醸造所は廃棄費用を削減でき、加工パートナーは特色ある原料を確保できます。地域には新しい商品が生まれます。"
            className={inputCls}
          />
        </div>

        <div id="f-goal" className={`${labelCls} scroll-mt-24`}>
          <span>共創によって何を実現したいですか？<Req /></span>
          <textarea
            name="coCreationGoal"
            value={coCreationGoal}
            onChange={(e) => setCoCreationGoal(e.target.value)}
            rows={3}
            placeholder="例：麦芽粕を使った焼き菓子・グラノーラを共同開発し、地域の店舗とECで販売する事業に育てたい。"
            className={inputCls}
          />
        </div>

        <div className={labelCls}>
          <span>事業化した先に、どのような状態を目指しますか？<Opt /></span>
          <textarea
            name="futureVision"
            value={futureVision}
            onChange={(e) => setFutureVision(e.target.value)}
            rows={3}
            placeholder="例：3年後には定番商品として月100万円の売上をつくり、他の醸造所にも仕組みを広げたい。"
            className={inputCls}
          />
        </div>

        <div className={labelCls}>
          <span>補足（自由記述）<Opt /></span>
          <textarea
            name="body"
            defaultValue={project.body ?? ""}
            rows={4}
            placeholder="上の質問で書ききれなかったことがあれば、自由にお書きください。"
            className={inputCls}
          />
          {!isCreate ? (
            <ProjectBodyImage projectId={project.id as string} url={project.bodyImageUrl} />
          ) : null}
        </div>

        {/* ── 現在地 ── */}
        <SectionHead
          title="現在地"
          desc="どこまで進んでいるかが分かると、協力候補が参加を判断しやすくなります。"
        />

        <div id="f-stage" className="scroll-mt-24">
          <div className="mb-1.5 text-[12px] text-[var(--ink-2)]">
            現在の段階<Req />
          </div>
          <div className="flex flex-wrap gap-2">
            {PROJECT_STAGES.map(([value, label]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-full border px-3.5 py-2 text-[13px] transition ${
                  stage === value
                    ? "border-[var(--green)] bg-[var(--green-soft)] font-bold text-[var(--green-d)]"
                    : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--green)]"
                }`}
              >
                <input
                  type="radio"
                  name="stage"
                  value={value}
                  checked={stage === value}
                  onChange={() => setStage(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className={labelCls}>
          <span>これまでに取り組んだこと<Opt /></span>
          <textarea
            name="stageDone"
            value={stageDone}
            onChange={(e) => setStageDone(e.target.value)}
            rows={3}
            placeholder="例：乾燥させた麦芽粕でクッキーの試作を2回実施。社内試食では好評でした。"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            <span>分かっていること・検証できたこと<Opt /></span>
            <textarea
              name="stageLearned"
              defaultValue={project.stageLearned ?? ""}
              rows={3}
              placeholder="例：乾燥処理をすれば1週間保存できることは確認済み。"
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            <span>未解決の論点<Opt /></span>
            <textarea
              name="stageIssues"
              defaultValue={project.stageIssues ?? ""}
              rows={3}
              placeholder="例：量産時の乾燥コストと、食品表示の整理が未検討。"
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            <span>目標スケジュール<Opt /></span>
            <textarea
              name="stageSchedule"
              defaultValue={project.stageSchedule ?? ""}
              rows={3}
              placeholder="例：年内に試作確定 → 来春テスト販売 → 秋に本販売。"
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            <span>既存の参加者・協力者<Opt /></span>
            <textarea
              name="existingPartners"
              defaultValue={project.existingPartners ?? ""}
              rows={3}
              placeholder="例：地元の製菓店1社が試作に協力中（公開できる範囲でお書きください）。"
              className={inputCls}
            />
          </label>
        </div>

        {/* ── 持っているもの・足りないもの ── */}
        <SectionHead
          title="持っているもの・足りないもの"
          desc="「何を持っていて、何が足りないか」を明示すると、相手が自分の役割を判断できます。"
        />

        {/* 提供できるもの */}
        <div>
          <div className="mb-1.5 text-[12px] text-[var(--ink-2)]">
            主催者が提供できるもの<Opt />
          </div>
          <div className="flex flex-col gap-3">
            {resources.map((r, i) => (
              <div key={i} className="rounded-[10px] border border-[var(--line)] bg-[#FAFBF9] p-3">
                <div className="flex items-center gap-2">
                  <select
                    value={r.kind}
                    onChange={(e) => updateResource(i, { kind: e.target.value })}
                    className={`${inputCls} text-[13px]`}
                  >
                    {RESOURCE_KINDS.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setResources((cur) => cur.filter((_, idx) => idx !== i))}
                    className="ml-auto text-[12px] text-[var(--red)] underline"
                  >
                    削除
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    value={r.description}
                    onChange={(e) => updateResource(i, { description: e.target.value })}
                    placeholder="説明（例：麦芽粕 週200kg）"
                    className={inputCls}
                  />
                  <input
                    value={r.condition}
                    onChange={(e) => updateResource(i, { condition: e.target.value })}
                    placeholder="提供条件（例：引取が前提・無償）"
                    className={inputCls}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setResources((cur) => [...cur, { ...EMPTY_RESOURCE }])}
              className={`${btn("secondary", "sm")} w-fit`}
            >
              ＋ 提供できるものを追加
            </button>
          </div>
        </div>

        {/* 募集する役割 */}
        <div id="f-roles" className="scroll-mt-24">
          <div className="mb-1.5 text-[12px] text-[var(--ink-2)]">
            足りないもの・募集する役割<Req />
            <span className="ml-2 text-[11px] text-[var(--muted)]">
              「協力企業募集」の一文ではなく、お願いしたいことを役割ごとに書いてください
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {roles.map((r, i) => (
              <div key={i} className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={r.name}
                    onChange={(e) => updateRole(i, { name: e.target.value })}
                    placeholder="役割名（例：焼き菓子の加工パートナー）"
                    className={`${inputCls} flex-1 font-bold`}
                  />
                  <button
                    type="button"
                    onClick={() => setRoles((cur) => cur.filter((_, idx) => idx !== i))}
                    className="text-[12px] text-[var(--red)] underline"
                  >
                    削除
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <textarea
                    value={r.request}
                    onChange={(e) => updateRole(i, { request: e.target.value })}
                    rows={2}
                    placeholder="具体的にお願いしたいこと（例：麦芽粕を使った焼き菓子の試作と量産）"
                    className={inputCls}
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      value={r.requirement}
                      onChange={(e) => updateRole(i, { requirement: e.target.value })}
                      placeholder="必要な経験・条件（例：菓子製造業の許可）"
                      className={inputCls}
                    />
                    <input
                      value={r.headcount}
                      onChange={(e) => updateRole(i, { headcount: e.target.value })}
                      placeholder="募集数（例：1〜2社）"
                      className={inputCls}
                    />
                    <input
                      value={r.period}
                      onChange={(e) => updateRole(i, { period: e.target.value })}
                      placeholder="参加時期・期間（例：今秋から半年）"
                      className={inputCls}
                    />
                    <input
                      value={r.reward}
                      onChange={(e) => updateRole(i, { reward: e.target.value })}
                      placeholder="費用・報酬・費用負担（例：応相談）"
                      className={inputCls}
                    />
                  </div>
                  <label className="flex w-fit cursor-pointer items-center gap-1.5 text-[12px] text-[var(--ink-2)]">
                    <input
                      type="checkbox"
                      checked={r.isPublic}
                      onChange={(e) => updateRole(i, { isPublic: e.target.checked })}
                      className="accent-[var(--green)]"
                    />
                    公開ページに表示する
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRoles((cur) => [...cur, { ...EMPTY_ROLE }])}
              className={`${btn("secondary", "sm")} w-fit`}
            >
              ＋ 募集する役割を追加
            </button>
          </div>
        </div>

        {/* ── 条件・イベント連携 ── */}
        <SectionHead
          title="条件・イベント連携"
          desc="金額や分配が未定でも登録できます。「未定」と「なし（無償）」は分けて選んでください。"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            <span>実施期間<Opt /></span>
            <input
              name="period"
              defaultValue={project.period ?? ""}
              placeholder="例：2026年10月〜2027年3月"
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            <span>実施場所<Opt /></span>
            <input
              name="place"
              defaultValue={project.place ?? ""}
              placeholder="例：宮崎市内の自社醸造所＋オンライン"
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            <span>予算感<Opt /></span>
            <input
              name="budget"
              defaultValue={project.budget ?? ""}
              placeholder="例：10〜30万円 / 応相談"
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            <span>報酬・費用負担・売上分配<Opt /></span>
            <select name="rewardPolicy" defaultValue={project.rewardPolicy ?? ""} className={inputCls}>
              <option value="">未選択</option>
              {REWARD_POLICIES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
        </div>

        <label className={labelCls}>
          <span>契約や秘密保持の必要性<Opt /></span>
          <input
            name="contractNote"
            defaultValue={project.contractNote ?? ""}
            placeholder="例：試作段階では不要。量産前に秘密保持契約を締結したい"
            className={inputCls}
          />
        </label>

        <div>
          <div className="mb-1.5 text-[12px] text-[var(--ink-2)]">
            Food Japan Summit との連携<Opt />
            <span className="ml-2 text-[11px] text-[var(--muted)]">当てはまるものを選んでください</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {EVENT_FLAGS.map(([value, label]) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3.5 py-2 text-[13px] text-[var(--ink)] has-[:checked]:border-[var(--green)] has-[:checked]:bg-[var(--green-soft)] has-[:checked]:font-bold has-[:checked]:text-[var(--green-d)]"
              >
                <input
                  type="checkbox"
                  name="eventFlags"
                  value={value}
                  checked={eventFlags.includes(value)}
                  onChange={(e) =>
                    setEventFlags((cur) =>
                      e.target.checked ? [...cur, value] : cur.filter((v) => v !== value)
                    )
                  }
                  className="accent-[var(--green)]"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--line)] bg-white px-4 py-3 text-[13px] text-[var(--ink)] has-[:checked]:border-[var(--green)] has-[:checked]:bg-[var(--green-soft)]">
          <input
            type="checkbox"
            name="supportRequested"
            value="1"
            defaultChecked={project.supportRequested}
            className="accent-[var(--green)]"
          />
          事務局の伴走を希望する（相手探し・企画整理などを事務局と一緒に進めたい）
        </label>

        <label className={labelCls}>
          タグ（カンマ区切り・最大8）
          <input
            name="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="商品開発, 規格外活用, 少量可"
            className={inputCls}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
          <button type="submit" disabled={pending} className={btn("primary")}>
            {pending ? "保存中…" : isCreate ? "下書きを保存する" : "保存する"}
          </button>
          {state.ok ? <span className="text-[12px] text-[var(--green-d)]">保存しました。</span> : null}
          {state.error ? <span className="text-[12px] text-[var(--red)]">{state.error}</span> : null}
          <span className="ml-auto text-[11px] text-[var(--muted)]">
            掲載は保存後、画面上部の「掲載を申請」から（事務局の承認後に公開されます）
          </span>
        </div>
      </form>

      {/* ── 公開ページの見え方（ライブプレビュー） ── */}
      <aside className="h-fit rounded-[12px] border border-[var(--line)] bg-white p-5 lg:sticky lg:top-20">
        <h2 className="text-[15px] font-bold text-[var(--ink)]">公開ページの見え方</h2>
        <div className="mt-3 grid aspect-[4/3] place-items-center overflow-hidden rounded-[10px] bg-[var(--green-soft)]">
          {(isCreate ? tempImages[0] : project.imageUrls[0]) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={isCreate ? tempImages[0] : project.imageUrls[0]}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[36px] opacity-60">🤝</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--muted)]">
          <span className="rounded bg-[var(--green)] px-1.5 py-0.5 font-bold text-white">共創プロジェクト</span>
          {eventFlags.includes("fjs_origin") ? (
            <span className="rounded bg-[#FAF0D6] px-1.5 py-0.5 font-bold text-[#B77F0B]">FJS発</span>
          ) : null}
        </div>
        <div className="mt-1 line-clamp-2 text-[14px] font-semibold leading-5 text-[var(--ink)]">
          {title || "（プロジェクト名未入力）"}
        </div>
        {oneLiner.trim() ? (
          <div className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-[var(--ink-2)]">{oneLiner.trim()}</div>
        ) : null}
        <dl className="mt-3 border-t border-[var(--line)]">
          {previewRows.map((r) => (
            <div key={r.label} className="flex items-start justify-between gap-3 border-b border-[#EDF0EA] py-2">
              <dt className="shrink-0 text-[12px] text-[var(--muted)]">{r.label}</dt>
              <dd className="m-0 text-right text-[12px] font-bold">
                {r.value ? (
                  <span className="text-[var(--ink)]">{r.value}</span>
                ) : (
                  <a href={`#${r.anchor}`} className="font-bold text-[var(--green-d)] underline">
                    入力する →
                  </a>
                )}
              </dd>
            </div>
          ))}
        </dl>
        {/* 本文プレビュー（実際の詳細ページと同じ並び） */}
        <PreviewBlock label="何を実現するプロジェクトか" text={coCreationGoal} />
        <PreviewBlock label="なぜ取り組むのか・背景にある課題" text={challengeIssue} />
        <PreviewBlock label="なぜ解決したいのか" text={challengeWhy} />
        <PreviewBlock label="誰に、どのような影響があるか" text={challengeWho} />
        <PreviewBlock label="現在どこまで進んでいるか" text={stageDone} />
        <PreviewBlock label="事業化した先に目指す状態" text={futureVision} />
        {resources.filter((r) => r.description.trim()).length ? (
          <div className="mt-3">
            <div className="text-[11px] font-bold text-[var(--muted)]">主催者が提供できるもの</div>
            <ul className="mt-1 flex flex-col gap-1">
              {resources
                .filter((r) => r.description.trim())
                .slice(0, 4)
                .map((r, i) => (
                  <li key={i} className="flex gap-1.5 text-[12px] leading-5 text-[var(--ink-2)]">
                    <span className="shrink-0 text-[var(--green-d)]">✓</span>
                    <span>
                      <b>{RESOURCE_KIND_LABEL[r.kind]}</b>：{r.description.trim()}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
        {roles.filter((r) => r.name.trim() && r.isPublic).length ? (
          <div className="mt-3">
            <div className="text-[11px] font-bold text-[var(--muted)]">募集する相手・役割</div>
            <ul className="mt-1 flex flex-col gap-1">
              {roles
                .filter((r) => r.name.trim() && r.isPublic)
                .slice(0, 4)
                .map((r, i) => (
                  <li key={i} className="flex gap-1.5 text-[12px] leading-5 text-[var(--ink-2)]">
                    <span className="shrink-0 text-[var(--green-d)]">👤</span>
                    <span>
                      <b>{r.name.trim()}</b>
                      {r.request.trim() ? `：${r.request.trim()}` : ""}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        {/* タグ */}
        {tags.trim() ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags
              .split(/[,、\s]+/)
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 8)
              .map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--ink-2)]"
                >
                  #{t}
                </span>
              ))}
          </div>
        ) : null}

        <p className="mt-3 rounded-[8px] bg-[var(--green-soft)] p-3 text-[11px] leading-5 text-[var(--ink-2)]">
          課題・実現したいこと・現在地・募集する役割が揃うと、協力候補が「自分に何を期待されているか」を判断しやすくなります。
        </p>
      </aside>
    </div>
  );
}
