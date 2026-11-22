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
import { AdminNav } from "../../_components/AdminNav";
import {
  aBadge, aCard, aCardBody, aCardHead, aEyebrow, aH1, aH2, aLink, aNote,
  aTable, aTd, aTh, aTr,
} from "../../_components/adminUi";
import { btn } from "@/lib/ui";
import { PreregForm } from "./PreregForm";
import { publish, unpublish } from "../prereg-actions";

export const metadata = { title: "登壇者の先行登録" };

function fmt(d: Date | null): string {
  return d ? d.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

export default async function PreregPage() {
  const su = await requireAdmin();
  const rows = await listPreregistered(su.app.tenantId);

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

      {/* 非公開のまま */}
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
