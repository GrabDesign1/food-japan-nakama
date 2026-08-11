"use client";

// 掲載オプションの「見え方」プレビュー（2026-08-11 追加）。
// 名前と価格だけで判断させないため、検索結果と同じ見た目をその場で開いて確認できるようにする。
// 表示には実際の一覧カード（OfferingCard）と、/search と同じ広告表記マークアップを使う
// ＝実物と必ず一致させるため（スクリーンショットを別途用意すると必ずズレる）。
import { useState } from "react";
import { OfferingCard, type OfferingCardData } from "@/components/OfferingCard";
import { btn } from "@/lib/ui";

type Props = {
  effectType: string;
  sample: OfferingCardData;
};

type ButtonProps = Props & { productName: string };

// 表示例に並べるダミーの他社（実在の会員と紛れないよう、架空の社名にする）
const OTHERS: { memberName: string; area: string }[] = [
  { memberName: "株式会社スーパーA", area: "神奈川県" },
  { memberName: "株式会社スーパーB", area: "大阪府" },
  { memberName: "株式会社食品工場", area: "愛知県" },
];

/** 表示例のカードは押せないようにする（モーダルから詳細ページへ飛ばないように）。 */
const Sample = ({ children }: { children: React.ReactNode }) => (
  <div className="pointer-events-none select-none">{children}</div>
);

const other = (sample: OfferingCardData, i: number, title: string): OfferingCardData => ({
  ...sample,
  title,
  tagline: null,
  memberName: OTHERS[i].memberName,
  area: OTHERS[i].area,
});

const SponsorLabel = ({ text }: { text: string }) => (
  <div className="mb-1 flex items-center gap-2">
    <span className="rounded bg-[var(--ink)] px-2 py-0.5 text-[10px] font-bold text-white">広告</span>
    <span className="text-[11px] text-[var(--muted)]">{text}</span>
  </div>
);

/** 自然表示（無料掲載）のカードを1枚並べて、有料枠との位置関係が分かるようにする。 */
const NaturalRow = ({ sample }: { sample: OfferingCardData }) => (
  <div className="mt-3">
    <div className="mb-1 text-[11px] text-[var(--muted)]">通常の検索結果（無料掲載）</div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {OTHERS.map((_, i) => (
        <Sample key={i}>
          <OfferingCard o={other(sample, i, "（ほかの案件）")} />
        </Sample>
      ))}
    </div>
  </div>
);

function PreviewBody({ effectType, sample }: Props) {
  switch (effectType) {
    case "top_pr":
      return (
        <>
          <p className="mb-2 text-[12px] leading-5 text-[var(--ink-2)]">
            検索結果の<b>いちばん上</b>に、1枠だけ表示されます。広告表記が必ず付き、通常の検索結果とは分けて表示されます
            （料金で自然な並び順を入れ替えることはしません）。
          </p>
          <SponsorLabel text="スポンサー（最上部PR）" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Sample>
              <OfferingCard o={sample} isOwn />
            </Sample>
          </div>
          <NaturalRow sample={sample} />
        </>
      );
    case "featured":
      return (
        <>
          <p className="mb-2 text-[12px] leading-5 text-[var(--ink-2)]">
            検索結果の上部にある<b>注目枠</b>に、<b className="text-[#B77F0B]">橙色の枠</b>付きで表示されます
            （最大4件・同条件の案件とは日替わりで入れ替わります）。広告表記が必ず付きます。
            <br />
            <span className="text-[var(--muted)]">
              この枠に並ぶのはすべて注目表示の案件なので、枠は全部に付きます（下の例では、左が自分の案件です）。
            </span>
          </p>
          <SponsorLabel text="スポンサー（注目表示）" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Sample>
              <OfferingCard o={sample} featured isOwn />
            </Sample>
            {[0, 1].map((i) => (
              <Sample key={i}>
                <OfferingCard o={other(sample, i, "（ほかのスポンサー案件）")} featured />
              </Sample>
            ))}
          </div>
          <NaturalRow sample={sample} />
        </>
      );
    case "urgent":
      return (
        <>
          <p className="mb-2 text-[12px] leading-5 text-[var(--ink-2)]">
            カードの画像の上に<b>「急募」バッジ</b>が付きます。表示位置は変わりませんが、一覧の中で目に留まりやすくなります。
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Sample>
              <OfferingCard o={sample} urgent isOwn />
            </Sample>
            <Sample>
              <OfferingCard o={other(sample, 0, "（バッジなしの案件）")} />
            </Sample>
          </div>
        </>
      );
    case "applicant_only":
      return (
        <>
          <p className="mb-2 text-[12px] leading-5 text-[var(--ink-2)]">
            案件は公開したまま、<b>事業者名・都道府県・市区町村・業種を伏せます</b>。
            提案が届いてあなたが返信した相手にだけ開示されます。
          </p>
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            <div className="border-b border-[var(--line)] px-4 py-2 text-[11px] text-[var(--muted)]">
              相手から見た詳細ページ（抜粋）
            </div>
            <dl className="divide-y divide-[#EDF0EA] text-[12px]">
              <div className="flex gap-3 px-4 py-2">
                <dt className="w-[100px] shrink-0 text-[var(--muted)]">事業者名</dt>
                <dd className="font-bold text-[var(--ink-2)]">非公開（提案・承認後に開示）</dd>
              </div>
              <div className="flex gap-3 px-4 py-2">
                <dt className="w-[100px] shrink-0 text-[var(--muted)]">所在地</dt>
                <dd className="font-bold text-[var(--ink-2)]">非公開</dd>
              </div>
              <div className="flex gap-3 px-4 py-2">
                <dt className="w-[100px] shrink-0 text-[var(--muted)]">案件名</dt>
                <dd className="text-[var(--ink)]">{sample.title || "（無題）"}</dd>
              </div>
              <div className="flex gap-3 px-4 py-2">
                <dt className="w-[100px] shrink-0 text-[var(--muted)]">条件・数量</dt>
                <dd className="text-[var(--ink)]">通常どおり公開されます</dd>
              </div>
            </dl>
          </div>
        </>
      );
    case "private":
      return (
        <p className="text-[12px] leading-5 text-[var(--ink-2)]">
          一覧・検索結果に出さず、URLを知らせた相手だけが見られる状態にします。公開ページからは存在ごと見えなくなります。
        </p>
      );
    case "matched_notice":
      return (
        <p className="text-[12px] leading-5 text-[var(--ink-2)]">
          案内メールの受け取りに同意した会員へ、この案件のお知らせをメールで一斉送信します（先着最大100件）。
          メールには広告である旨と配信停止の案内が入ります。条件による絞り込みは行いません。
        </p>
      );
    case "bundle":
      return (
        <p className="text-[12px] leading-5 text-[var(--ink-2)]">
          上記の効果を組み合わせたセットです。それぞれの見え方は、各オプションの「見え方を見る」でご確認ください。
        </p>
      );
    default:
      return null;
  }
}

export function EffectPreview({ effectType, sample, productName }: ButtonProps) {
  const [open, setOpen] = useState(false);
  // 表示例を持たない効果（セット等）ではボタン自体を出さない
  if (!PreviewBody({ effectType, sample })) return null;

  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen(true)} className={`${btn("secondary", "sm")} w-full`}>
        見え方を見る
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="effect-preview-title"
            className="relative flex max-h-[88vh] w-full max-w-[900px] flex-col rounded-[14px] border border-[var(--line)] bg-white shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3">
              <h2 id="effect-preview-title" className="text-[15px] font-bold text-[var(--ink)]">
                {productName}の見え方
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="rounded-md px-2 py-1 text-[18px] leading-none text-[var(--muted)] hover:bg-[var(--canvas)]"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <PreviewBody effectType={effectType} sample={sample} />
              <p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">
                これは表示例です。掲載の効果（閲覧数・問い合わせ・成約）を保証するものではありません。
              </p>
            </div>
            <div className="flex justify-end border-t border-[var(--line)] px-5 py-3">
              <button type="button" onClick={() => setOpen(false)} className={btn("secondary", "sm")}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
