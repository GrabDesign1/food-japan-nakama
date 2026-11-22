"use client";

// 事務局：登壇者・参加者をまとめて先行登録する（2026-11-23）。
// ⚠️ 取り込んでもメールは送らない。作るのは非公開の会員だけ。
// ⚠️ 行ごとに結果を出す（どの行がなぜ飛ばされたか分からないと、直せない）。
import { useActionState, useState } from "react";
import { CATEGORY_L1 } from "@/lib/member-taxonomy";
import { btn } from "@/lib/ui";
import { aCard, aCardBody, aCardHead, aH2, aNote, aTable, aTd, aTh, aBadge } from "../../_components/adminUi";
import { importPrereg, type ImportState } from "../prereg-actions";

const SAMPLE = [
  "事業者名\t登壇者名\t業種\t都道府県\tメール\tホームページ\t控え",
  "福山黒酢株式会社\t津曲 晋作\t食品メーカー\t鹿児島県\t\thttps://kakuida.com\t宮崎2026 登壇",
].join("\n");

export function ImportForm() {
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState<ImportState, FormData>(importPrereg, {});

  const lines = text.split("\n").filter((l) => l.trim()).length;

  return (
    <form action={action} className={aCard}>
      <div className={aCardHead}>
        <h2 className={aH2}>まとめて先行登録する</h2>
        <span className="ml-auto text-[11px] text-[var(--muted)]">
          メールは送りません・全部が非公開です
        </span>
      </div>
      <div className={aCardBody}>
        <p className={aNote}>
          表計算から<strong>そのまま貼り付け</strong>られます（タブ区切り。カンマ区切りも読みます）。
          1行目が「事業者名」で始まっていれば、見出しとして飛ばします。
        </p>
        <p className={`${aNote} mt-1`}>
          列の順 ──
          <code className="mx-1 rounded bg-[#EEF1F3] px-1">
            事業者名 / 登壇者名 / 業種 / 都道府県 / メール / ホームページ / 控え
          </code>
          <br />
          業種に使える言葉：{CATEGORY_L1.join("・")}
          <br />
          <strong>事業者名と業種は必須</strong>です。メールが同じ方は飛ばします（重ねて作りません）。
        </p>

        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          spellCheck={false}
          placeholder={SAMPLE}
          className="mt-3 w-full resize-y rounded-md border border-[#E3E6E8] bg-white px-3 py-2 font-mono text-[12px] leading-6"
        />

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || !text.trim()} className={btn("primary", "sm")}>
            {pending ? "取り込んでいます…" : "非公開で取り込む"}
          </button>
          <span className="text-[11px] text-[var(--muted)]">{lines ? `${lines}行` : ""}</span>
        </div>

        {state?.error ? (
          <p className="mt-3 rounded border border-[#E7C7BE] bg-[var(--red-soft)] px-3 py-2 text-[12px] text-[var(--red)]">
            {state.error}
          </p>
        ) : null}

        {state?.done ? (
          <div className="mt-4">
            <p className="text-[13px] font-bold text-[var(--ink)]">
              登録 {state.added} 件 ／ 飛ばし {state.skipped} 件 ／ 失敗 {state.failed} 件
            </p>
            {state.results?.length ? (
              <div className="mt-2 max-h-[320px] overflow-auto rounded border border-[#E3E6E8]">
                <table className={aTable}>
                  <thead>
                    <tr>
                      <th className={aTh}>行</th>
                      <th className={aTh}>事業者名</th>
                      <th className={aTh}>結果</th>
                      <th className={aTh}>内容</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.results.map((r) => (
                      <tr key={r.line}>
                        <td className={`${aTd} text-[var(--muted)]`}>{r.line}</td>
                        <td className={aTd}>{r.name || "—"}</td>
                        <td className={aTd}>
                          <span
                            className={aBadge(
                              r.status === "added" ? "green" : r.status === "skipped" ? "neutral" : "red"
                            )}
                          >
                            {r.status === "added" ? "登録" : r.status === "skipped" ? "飛ばし" : "失敗"}
                          </span>
                        </td>
                        <td className={`${aTd} text-[12px] text-[var(--muted)]`}>{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </form>
  );
}
