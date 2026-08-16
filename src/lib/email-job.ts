// 事務局からの一括メール送信を、応答を待たせずに進めるための処理（2026-08-16）。
//
// 流れ：
//   1. 画面（sendBulkEmail）が EmailJob を作って**すぐ返す**
//   2. `after()` で runEmailJob() を呼び、応答後に1件ずつ送る
//   3. 途中で処理が止まっても、日次バッチ（/api/cron/billing-daily）が
//      status="running" の続き（sentCount 件目から）を再開する
//
// 1件送るごとに sentCount を進めるので、**再送（二重送信）は起きない**。
import { prisma } from "@/lib/db";
import { sendAdminMessageEmail } from "@/lib/email";

export type JobTarget = { memberId: string; memberName: string; email: string };

/** 進行中の判定に使う「止まったとみなす時間」。これを過ぎた running は日次バッチが引き取る */
export const STALE_JOB_MINUTES = 10;

/**
 * ジョブの続きを送る。すでに送った分（sentCount）はとばす。
 * 会員ごとに送り終えたら、その会員の対応履歴に1件記録する。
 */
export async function runEmailJob(jobId: string): Promise<void> {
  const job = await prisma.emailJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "running") return;

  const targets = (job.targets as unknown as JobTarget[]) ?? [];
  const kind = job.kind === "ad" ? "ad" : "notice";

  let sent = job.sentCount;
  let failed = job.failedCount;
  const notedMemberIds = new Set<string>();

  for (let i = job.sentCount; i < targets.length; i++) {
    const t = targets[i];
    try {
      await sendAdminMessageEmail({
        to: t.email,
        subject: job.subject,
        body: job.body,
        kind,
        senderName: job.createdByName,
      });
      sent++;
    } catch (e) {
      failed++;
      console.error("[email-job] 送信失敗:", t.email, e);
    }

    // 同じ会員の宛先を送り終えたところで、対応履歴に残す
    const isLastOfMember = i + 1 >= targets.length || targets[i + 1].memberId !== t.memberId;
    if (isLastOfMember && !notedMemberIds.has(t.memberId)) {
      notedMemberIds.add(t.memberId);
      const emails = targets.filter((x) => x.memberId === t.memberId).map((x) => x.email);
      await prisma.memberNote
        .create({
          data: {
            tenantId: job.tenantId,
            memberId: t.memberId,
            kind: "email",
            body: `【一斉送信：${kind === "ad" ? "案内メール（広告あり）" : "利用案内メール"}】\n宛先：${emails.join(
              "、"
            )}\n件名：${job.subject}\n\n${job.body}`,
            occurredAt: new Date(),
            authorUserId: job.createdByUserId,
            authorName: job.createdByName,
          },
        })
        .catch((e) => console.error("[email-job] 対応履歴の記録に失敗:", e));
    }

    // 途中経過を保存（ここまで送った件数＝再開位置）
    await prisma.emailJob.update({
      where: { id: job.id },
      data: { sentCount: sent, failedCount: failed },
    });
  }

  await prisma.emailJob.update({
    where: { id: job.id },
    data: { status: "done", finishedAt: new Date(), sentCount: sent, failedCount: failed },
  });
}

/**
 * 止まったままのジョブを引き取って続きを送る（日次バッチから呼ぶ）。
 * 戻り値＝再開したジョブの件数。
 */
export async function resumeStaleEmailJobs(): Promise<number> {
  const limit = new Date(Date.now() - STALE_JOB_MINUTES * 60 * 1000);
  const jobs = await prisma.emailJob.findMany({
    where: { status: "running", startedAt: { lt: limit } },
    select: { id: true },
    take: 20,
  });
  for (const j of jobs) {
    await runEmailJob(j.id);
  }
  return jobs.length;
}
