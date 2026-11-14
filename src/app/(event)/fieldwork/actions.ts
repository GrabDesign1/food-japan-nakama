"use server";

// 共創フィールドワークの企画書づくり（2026-11-18 都城・霧島バスフィールドワーク）。
//
// ログイン不要の公開ページから呼ばれる。参加者の多くはNAKAMA会員ではないため
// （バスの中で会員登録はさせられない）、会員向けの利用回数制限はそのまま使えない。
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { requestIp } from "@/lib/security";
import { AI_ENABLED, draftFieldworkReport } from "@/lib/ai";
import { sendFieldworkReportEmail } from "@/lib/email";
import {
  FIELDWORK_CODE,
  REPORT_SECTIONS,
  FIELDWORK_EVENT_KEY,
  FIELDWORK_FIELD_MAX,
  allBodyFields,
  answersToPrompt,
  briefsFor,
  COMPARE_ROWS,
  COVER_FIELDS,
  type FieldworkAnswers,
  type FieldworkReport,
} from "@/lib/fieldwork-core";

const TENANT_SLUG = "food-japan-summit";

// ⚠️ バスのWi-Fiを使うと参加者40人が**同じIP**になる。IPで厳しく絞ると
//    一人が使った時点でバス全員が締め出される。だからIP上限は余裕を持たせ、
//    入口は当日配る共通コードで守る（コードは会期後に変えれば無効化できる）。
const LIMIT_PER_IP_24H = 200;
// 同じIPからの連打だけは止める（取り違えて何度も押す・スクリプトで回す対策）。
const MIN_INTERVAL_MS = 15_000;

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.FIELDWORK_IP_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "nakama";
  return crypto.createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

export type GenerateState =
  | { ok: true; report: FieldworkReport; id: string }
  | { ok: false; error: string }
  | null;

/** 当日の共通コードが合っているか（前後の空白と大文字小文字は許す）。 */
function codeMatches(input: string): boolean {
  const expected = (process.env.FIELDWORK_CODE ?? FIELDWORK_CODE).trim().toUpperCase();
  return input.trim().toUpperCase().replace(/\s/g, "") === expected;
}

/**
 * 入力から企画書を作って保存する。
 * 入力はブラウザが localStorage で持っていて、ここで初めてサーバーへ渡る
 * （圏外でも書き続けられるようにするため）。
 */
export async function generateFieldworkReport(
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  // honeypot（人には見えない欄。埋まっていたらボット扱いで、作らずに成功を装わない＝AIを呼ばない）
  if ((formData.get("_gotcha") as string | null)?.trim()) {
    return { ok: false, error: "送信できませんでした。" };
  }

  if (!codeMatches((formData.get("code") as string | null) ?? "")) {
    return { ok: false, error: "参加コードが違います。当日お配りしたコードをご確認ください。" };
  }

  if (!AI_ENABLED) {
    return {
      ok: false,
      error:
        "ただいま企画書の作成はご利用いただけません。入力はこの端末に残っていますので、記入した内容をコピーしてお使いください。",
    };
  }

  // 入力は1つのJSONで受け取る（項目が67あるので FormData に並べると取り違えが起きる）
  const answers: FieldworkAnswers = {};
  try {
    const raw = (formData.get("answers") as string | null) ?? "{}";
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      // 定義にある項目だけを採る（知らないキーは捨てる）＋1項目の長さを切る
      const known = new Set<string>([
        ...allBodyFields().map((f) => f.key),
        ...COVER_FIELDS.map((f) => f.key),
        ...COMPARE_ROWS.flatMap((r) => [`${r.key}_nishi`, `${r.key}_kurozu`]),
        "email",
      ]);
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (!known.has(k)) continue;
        if (typeof v !== "string") continue;
        answers[k] = v.trim().slice(0, FIELDWORK_FIELD_MAX);
      }
    }
  } catch {
    return { ok: false, error: "入力を読み取れませんでした。画面を再読み込みしてお試しください。" };
  }

  // ⚠️ 回数制限の照会が失敗しても**企画書づくりは止めない**。
  //    当日はバスの中で、発表の直前にここを通る。DBが一瞬おかしくなっただけで
  //    画面が落ちると、書いた人は何も出せないまま発表時間を迎えることになる。
  //    守りたいのは「URLが漏れたときにAIの残高を焼かれないこと」で、
  //    そのための第一の関所は参加コード（上で検査済み）。回数制限は二の矢にすぎない。
  const ipHash = hashIp(await requestIp());
  if (ipHash) {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [count, last] = await Promise.all([
        prisma.fieldworkReport.count({ where: { ipHash, createdAt: { gte: since } } }),
        prisma.fieldworkReport.findFirst({
          where: { ipHash },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ]);
      if (count >= LIMIT_PER_IP_24H) {
        return { ok: false, error: "本日の作成回数の上限に達しました。事務局にお声がけください。" };
      }
      if (last && Date.now() - last.createdAt.getTime() < MIN_INTERVAL_MS) {
        return { ok: false, error: "少し間をおいてからもう一度お試しください。" };
      }
    } catch (e) {
      console.error("[fieldwork] 回数制限の照会に失敗（企画書づくりは続ける）:", e);
    }
  }

  const answersText = answersToPrompt(answers);
  // 視察先の基礎情報（主催者の進行スライド由来）。出典を明示して渡す＝
  // 参加者が現地で聞いたこととAIが混ぜないようにするため。
  const partnerBrief = briefsFor(answers.chosen_partner ?? "")
    .map((b) => [`【${b.name}】`, ...b.lines.map((l) => `・${l}`)].join("\n"))
    .join("\n\n");
  const result = await draftFieldworkReport({
    partner: answers.chosen_partner ?? "",
    company: answers.company ?? "",
    answersText,
    partnerBrief,
  });
  if ("error" in result) return { ok: false, error: result.error };

  // 保存に失敗しても企画書は返す（当日の発表を止めないため）。
  // テナント照会もこの try の中に入れる＝DBが落ちていても企画書は画面に出る。
  let id = "";
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: TENANT_SLUG },
      select: { id: true },
    });
    if (!tenant) throw new Error(`既定テナント(${TENANT_SLUG})が見つかりません`);
    const row = await prisma.fieldworkReport.create({
      data: {
        tenantId: tenant.id,
        eventKey: FIELDWORK_EVENT_KEY,
        name: answers.name || null,
        company: answers.company || null,
        team: answers.team || null,
        email: answers.email || null,
        partner: answers.chosen_partner || null,
        projectName: result.report.projectName || answers.project_name || null,
        answers,
        report: result.report,
        ipHash,
      },
      select: { id: true },
    });
    id = row.id;
  } catch (e) {
    console.error("[fieldwork] 保存に失敗（企画書は返す）:", e);
  }

  // 控えメール（本人が宛先を書いたときだけ）。送信に失敗しても企画書は返す。
  const to = (answers.email ?? "").trim();
  if (to && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    try {
      const r = result.report;
      const body = [
        r.summary,
        "",
        ...REPORT_SECTIONS.map((sec) => `■ ${sec.label}\n${r[sec.key]}`),
        "",
        `■ 視察先への最初の相談文\n${r.firstMessage}`,
        "",
        `■ 2分発表の台本\n${r.pitch}`,
      ].join("\n");
      await sendFieldworkReportEmail({
        to,
        projectName: r.projectName,
        partner: answers.chosen_partner ?? "",
        body,
      });
    } catch (e) {
      console.error("[fieldwork] 控えメールの送信に失敗（企画書は返す）:", e);
    }
  }

  return { ok: true, report: result.report, id };
}
