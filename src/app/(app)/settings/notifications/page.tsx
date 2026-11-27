/**
 * 【通知の設定】2026-11-28 ユーザー指示
 *   「何かアクションがあったらメールかSMSが飛ぶようにする。それで、やだったら、
 *     サイトから通知を消せるように設定に ON OFF ボタンをつけよう」
 *
 * ⚠️⚠️ **既定はすべてON。** ここに並ぶのは自分宛に起きたことのお知らせで、広告ではない。
 *    ⚠️ 広告・案内メール（`marketingOptInAt`）は同意が要るので既定OFF。**この画面とは別扱い**。
 * ⚠️⚠️ **1つのスイッチにまとめない。** 「商談は要るが、いいねは要らない」を叶えられないと、
 *    うるさい側に合わせて全部切られ、肝心の商談に気づけなくなる。
 * ⚠️ パスワード変更・退会・決済のお知らせはここに出していない（止められると事故に気づけない）。
 */
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { getNotifySettings, NOTIFY_KINDS, NOTIFY_LABEL } from "@/lib/notify-settings";
import { eyebrowCls, h1Cls } from "@/lib/ui";
import { NotifyToggle } from "./NotifyToggle";
import { InstallApp } from "./InstallApp";

export const metadata: Metadata = {
  title: "通知の設定",
  robots: { index: false, follow: false },
};

export default async function NotificationSettingsPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const settings = await getNotifySettings(su.app.id);

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className={eyebrowCls}>SETTINGS</div>
      <h1 className={`${h1Cls} mt-1`}>通知の設定</h1>
      <p className="mt-2 text-[14px] leading-[21px] text-[var(--muted)]">
        お知らせのメールを、種類ごとに止められます。
        <b className="text-[var(--ink)]">はじめはすべて「受け取る」</b>
        になっています。{su.app.email} に届きます。
      </p>

      <ul className="mt-6 flex flex-col gap-2">
        {NOTIFY_KINDS.map((k) => (
          <li
            key={k}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] border border-[var(--line)] bg-white px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-bold leading-[26px] text-[var(--ink)]">
                {NOTIFY_LABEL[k].title}
              </div>
              <div className="text-[12px] leading-[17px] text-[var(--muted)]">
                {NOTIFY_LABEL[k].note}
              </div>
            </div>
            <NotifyToggle kind={k} enabled={settings[k]} label={NOTIFY_LABEL[k].title} />
          </li>
        ))}
      </ul>

      {/* ホーム画面に追加（2026-11-28・PWA）。
          ⚠️ 通知の設定の下に置く。「スマホに届かない」理由がここだと分かるようにするため。 */}
      <div className="mt-6">
        <InstallApp />
      </div>

      <div className="mt-6 rounded-[12px] bg-[var(--line-soft)] px-5 py-4">
        <p className="text-[12px] leading-[17px] text-[var(--muted)]">
          {/* ⚠️ この2つを書いておかないと「全部切ったのに届く」と言われる */}
          <b className="text-[var(--ink)]">止められないお知らせがあります。</b>
          パスワードの変更、退会のお手続き、お支払いに関するものは、
          ご本人の資産に関わるため、ここでは止められません。
          <br />
          事務局からの<b className="text-[var(--ink)]">案内メール</b>（イベント・募集のご案内）は、
          これとは別のお取り扱いです。配信を止めるときは、届いたメールの末尾からお手続きください。
        </p>
      </div>
    </div>
  );
}
