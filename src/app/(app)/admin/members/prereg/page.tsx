// 事務局：登壇者などを先に会員として登録する（2026-11-23）。
//
// なぜこの画面があるか（ユーザー指示 2026-11-23）:
//   「宮崎と名古屋の登壇者をここに正会員として、登録し非公開の設定でまずは登録してもらえないか」
//   先に席を用意しておき、本人の承諾が取れたところから公開していく。
//
// ⚠️ **ここからメールは一切送らない**。本人の同意なく案内を送らないため。
// ⚠️ 登録した会員は listed=false。検索・プロフィール・メッセージの送り先・台帳の相手候補・
//    お気に入りのどこにも出ない。公開は「公開する」を押したときだけ。
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listPreregistered } from "@/lib/member-prereg";
import { inviteSummary, INVITE_BATCH } from "@/lib/member-invite";
import { syncConfigured } from "@/lib/onegaizar-sync";
import { AdminNav } from "../../_components/AdminNav";
import {
  aBadge, aCard, aCardBody, aCardHead, aEyebrow, aH1, aH2, aLink, aNote,
  aTable, aTd, aTh, aTr,
} from "../../_components/adminUi";
import { btn } from "@/lib/ui";
import { PreregForm } from "./PreregForm";
import { ImportForm } from "./ImportForm";
import { SyncForm } from "./SyncForm";
import { publish, unpublish, sendInvites } from "../prereg-actions";

export const metadata = { title: "登壇者の先行登録" };

// ⚠️ イベントからの取り込みは、人数が多いと時間がかかる（既定の制限時間では足りない）
export const maxDuration = 120;

function fmt(d: Date | null): string {
  return d ? d.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

export default async function PreregPage() {
  const su = await requireAdmin();
  const [rows, invite] = await Promise.all([
    listPreregistered(su.app.tenantId),
    inviteSummary(su.app.tenantId),
  ]);

  const hidden = rows.filter((r) => !r.listed);
  const published = rows.filter((r) => r.listed);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6">
      <AdminNav current="members" />

      <div className="mt-5">
        <div className={aEyebrow}>MEMBERS</div>
        <h1 className={`${aH1} mt-1`}>登壇者の先行登録</h1>
        <p className={`${aNote} mt-2`}>
          登壇者の席を先に作っておく画面です。作った時点では<strong>誰にも見えません</strong>。
          <Link href="/admin/members" className={`${aLink} ml-2`}>会員管理へ戻る</Link>
        </p>
      </div>

      <div className="mt-5">
        <PreregForm defaultNote="" />
      </div>

      <div className="mt-6">
        <ImportForm />
      </div>

      {/* 非公開のまま */}
      {/* ── イベントから取り込む（2026-11-25 ユーザー指示「保守　１をすすめて」）──
          手で表を貼る代わりに、Onegaizar から直接もらう。
          ⚠️⚠️ 取り込んでも誰にも見えない（必ず非公開）。メールも送らない。 */}
      <div className={`${aCard} mt-6`}>
        <div className={aCardHead}>
          <h2 className={aH2}>イベント（Onegaizar）から取り込む</h2>
        </div>
        <div className={aCardBody}>
          <p className={aNote}>
            公開済みのご登壇者と、ご参加者を取り込みます。
            <strong>取り込んでも誰にも見えません</strong>し、メールも送りません。
            同じ人を2回作らないよう、イベント側の印で突き合わせます。
            <strong>電話番号と事業内容は入ってきません</strong>
            （事業内容は、ご本人がNAKAMAで書くものです）。
          </p>
          <div className="mt-3">
            <SyncForm configured={syncConfigured()} />
          </div>
        </div>
      </div>

      {/* ── 本人に聞く（2026-11-23 ユーザー指示）────────────────────
          「移動させておいて、利用するかは、本人の承諾を得る方法が望ましい」
          ⚠️⚠️ **預かるが、使わない。** 本人が「はい」と言うまで誰にも見えない。
          ⚠️⚠️ **「いいえ」のときは、その行を消す。** だから「いいえ」の数は出ない（残っていない）。
          ⚠️ 送るのは1人1回かぎり。送った人は次から対象外になる。 */}
      <div className={`${aCard} mt-6 border-[#D6DBDE]`}>
        <div className={aCardHead}>
          <h2 className={aH2}>本人に「使いますか？」と聞く</h2>
          <span className={`${aBadge(invite.invitable > 0 ? "green" : "neutral")} ml-auto`}>
            未送信 {invite.invitable}
          </span>
        </div>
        <div className={aCardBody}>
          <p className={aNote}>
            お預かりした情報を<strong>使ってよいか</strong>、ご本人に1通だけお送りします。
            「はい」を選ばれた方だけが会員になります。
            <strong>「いいえ」を選ばれた方の情報は、その場で削除されます</strong>
            （ですので、ここに「いいえ」の数は出ません）。
          </p>

          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
            <div>
              <div className="text-[11px] text-[var(--muted)]">まだ送っていない</div>
              <div className="text-[18px] font-bold text-[var(--ink)]">{invite.invitable}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--muted)]">送った</div>
              <div className="text-[18px] font-bold text-[var(--ink)]">{invite.sent}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--muted)]">「はい」</div>
              <div className="text-[18px] font-bold text-[var(--green-d)]">{invite.yes}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--muted)]">メール未記入</div>
              <div className="text-[18px] font-bold text-[var(--ink)]">{invite.noEmail}</div>
            </div>
          </div>

          {invite.invitable > 0 ? (
            <form action={sendInvites} className="mt-4">
              <button type="submit" className={btn("primary")}>
                {Math.min(invite.invitable, INVITE_BATCH)}名に送る
              </button>
              <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">
                1回に{INVITE_BATCH}名までです。<strong>文面を間違えたときに途中で止められるよう</strong>、
                わざと少しずつにしてあります。続きは、もう一度押してください。
              </p>
            </form>
          ) : (
            <p className={`${aNote} mt-3`}>
              いま送れる方はいません。
              {invite.noEmail > 0
                ? `メールが未記入の方が${invite.noEmail}名います（その方には送れません）。`
                : ""}
            </p>
          )}
        </div>
      </div>

      <div className={`${aCard} mt-6`}>
        <div className={aCardHead}>
          <h2 className={aH2}>非公開のまま（{hidden.length}）</h2>
          <span className="ml-auto text-[11px] text-[var(--muted)]">
            公開すると、検索とプロフィールに出ます
          </span>
        </div>
        {hidden.length === 0 ? (
          <div className={aCardBody}>
            <p className={aNote}>まだありません。</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={aTable}>
              <thead>
                <tr>
                  <th className={aTh}>事業者名</th>
                  <th className={aTh}>ご本人</th>
                  <th className={aTh}>都道府県</th>
                  <th className={aTh}>業種</th>
                  <th className={aTh}>メール</th>
                  <th className={aTh}>ご本人の登録</th>
                  <th className={aTh}>控え</th>
                  <th className={aTh}>登録日</th>
                  <th className={aTh}></th>
                </tr>
              </thead>
              <tbody>
                {hidden.map((m) => (
                  <tr key={m.id} className={aTr}>
                    <td className={aTd}>
                      <Link href={`/admin/crm/${m.id}`} className={aLink}>{m.name}</Link>
                    </td>
                    <td className={aTd}>{m.contactName || "—"}</td>
                    <td className={aTd}>{m.prefecture || "—"}</td>
                    <td className={aTd}>{m.categoryL1 || "—"}</td>
                    <td className={`${aTd} text-[12px] text-[var(--muted)]`}>{m.preregEmail || "—"}</td>
                    <td className={aTd}>
                      <span className={aBadge(m.linked ? "green" : "neutral")}>
                        {m.linked ? "済み" : "まだ"}
                      </span>
                    </td>
                    <td className={`${aTd} text-[12px] text-[var(--muted)]`}>{m.preregNote || "—"}</td>
                    <td className={`${aTd} whitespace-nowrap text-[12px] text-[var(--muted)]`}>
                      {fmt(m.preregAt)}
                    </td>
                    <td className={aTd}>
                      <form action={publish}>
                        <input type="hidden" name="memberId" value={m.id} />
                        <button type="submit" className={btn("secondary", "sm")}>公開する</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 公開済み */}
      {published.length ? (
        <div className={`${aCard} mt-6`}>
          <div className={aCardHead}>
            <h2 className={aH2}>公開済み（{published.length}）</h2>
          </div>
          <div className="overflow-x-auto">
            <table className={aTable}>
              <thead>
                <tr>
                  <th className={aTh}>事業者名</th>
                  <th className={aTh}>ご本人</th>
                  <th className={aTh}>都道府県</th>
                  <th className={aTh}>ご本人の登録</th>
                  <th className={aTh}>控え</th>
                  <th className={aTh}></th>
                </tr>
              </thead>
              <tbody>
                {published.map((m) => (
                  <tr key={m.id} className={aTr}>
                    <td className={aTd}>
                      <Link href={`/producers/${m.id}`} className={aLink}>{m.name}</Link>
                    </td>
                    <td className={aTd}>{m.contactName || "—"}</td>
                    <td className={aTd}>{m.prefecture || "—"}</td>
                    <td className={aTd}>
                      <span className={aBadge(m.linked ? "green" : "neutral")}>
                        {m.linked ? "済み" : "まだ"}
                      </span>
                    </td>
                    <td className={`${aTd} text-[12px] text-[var(--muted)]`}>{m.preregNote || "—"}</td>
                    <td className={aTd}>
                      <form action={unpublish}>
                        <input type="hidden" name="memberId" value={m.id} />
                        <button type="submit" className={btn("secondary", "sm")}>非公開に戻す</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
