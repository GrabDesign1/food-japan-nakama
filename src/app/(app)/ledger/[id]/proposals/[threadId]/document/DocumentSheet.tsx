"use client";

// 納品書・請求書の用紙（画面表示＝そのまま印刷される）。
// 保存はしない。印刷ダイアログからPDFにするのは当事者の操作。
import { useState } from "react";
import { DocumentTools, type DocExtra } from "./DocumentTools";
import { taxBreakdown } from "@/lib/invoice";

export type DocumentData = {
  kind: "invoice" | "delivery" | "receipt";
  docNo: string;
  issuedAt: string;
  completedAt: string;
  deliveryDate: string | null;
  seller: { name: string; address: string; contactName: string | null; regNo: string | null; bank: string | null };
  buyer: { name: string; address: string };
  itemName: string;
  quantityText: string | null;
  terms: string | null;
  rate: 8 | 10;
  excluding: number;
  tax: number;
  including: number;
  /** 見ている人が売り手か（不足項目の案内を出すかの判定に使う） */
  viewerIsSeller: boolean;
  /** 登録番号がT＋13桁として妥当か（未登録の免税事業者は false でよい） */
  regNoOk: boolean;
};

const yen = (n: number) => `${n.toLocaleString()} 円`;

export function DocumentSheet({ data }: { data: DocumentData }) {
  const [extra, setExtra] = useState<DocExtra>({
    docNo: data.docNo,
    issuedOn: "",
    dueText: "",
    receivedOn: "",
    purpose: "",
    note: "",
    reduced: data.rate === 8,
  });
  const isInvoice = data.kind === "invoice";
  const isReceipt = data.kind === "receipt";
  // 金額の内訳を出すのは請求書と領収書（納品書は数量と品名だけ）
  const showMoney = isInvoice || isReceipt;
  const title = isInvoice ? "請求書" : isReceipt ? "領収書" : "納品書";
  // 税率は発行時のチェックで切り替える。金額（税込）は合意額のまま、内訳だけ計算し直す
  const amounts = taxBreakdown(data.including, extra.reduced ? 8 : 10);

  return (
    <div className="mx-auto max-w-[820px]">
      <style>{`@page { size: A4; margin: 14mm; }`}</style>

      <DocumentTools
        kind={data.kind}
        defaultDocNo={data.docNo}
        defaultReduced={data.rate === 8}
        onChange={setExtra}
      />

      {/* 売り手に足りない項目があれば画面上だけで知らせる */}
      {showMoney && data.viewerIsSeller && (!data.regNoOk || (isInvoice && !data.seller.bank)) ? (
        <div className="print:hidden mb-4 rounded-[10px] border border-[var(--amber-line)] bg-[var(--amber-bg)] p-4 text-[12px] leading-6 text-[var(--amber-ink)]">
          <b>請求書に載せる情報が足りません。</b>
          <ul className="mt-1 list-disc pl-5">
            {!data.regNoOk ? (
              <li>
                適格請求書発行事業者の登録番号（T＋13桁）が未入力です。未登録（免税事業者）の場合は
                このままで問題ありませんが、登録済みなら
                <a href="/profile" className="underline">プロフィール</a>に入力してください。
              </li>
            ) : null}
            {!data.seller.bank ? (
              <li>
                振込先が未入力です。<a href="/profile" className="underline">プロフィール</a>で登録すると
                この用紙に印字されます。
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <div className="rounded-[4px] border border-[var(--line)] bg-white p-10 text-[13px] leading-6 text-[var(--ink)] print:rounded-none print:border-0 print:p-0">
        <h1 className="text-center text-[26px] font-bold tracking-[0.3em]">{title}</h1>

        <div className="mt-6 flex justify-between text-[12px]">
          <div>
            <div className="text-[11px] text-[var(--muted)]">{isInvoice ? "請求書番号" : isReceipt ? "領収書番号" : "納品書番号"}</div>
            <div>{extra.docNo || data.docNo}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[var(--muted)]">発行日</div>
            <div>{extra.issuedOn || data.issuedAt}</div>
          </div>
        </div>

        {/* 宛先と発行者 */}
        <div className="mt-6 flex flex-wrap justify-between gap-6">
          <div className="min-w-[260px]">
            <div className="border-b border-[var(--ink)] pb-1 text-[16px] font-bold">
              {data.buyer.name} 御中
            </div>
            {data.buyer.address ? (
              <div className="mt-1 text-[12px] text-[var(--ink-2)]">{data.buyer.address}</div>
            ) : null}
          </div>
          <div className="min-w-[260px] text-[12px]">
            <div className="text-[14px] font-bold">{data.seller.name}</div>
            {data.seller.address ? <div className="mt-0.5">{data.seller.address}</div> : null}
            {data.seller.contactName ? <div className="mt-0.5">担当：{data.seller.contactName}</div> : null}
            {data.seller.regNo ? (
              <div className="mt-1">登録番号：{data.seller.regNo}</div>
            ) : (
              <div className="mt-1 text-[var(--muted)]">（適格請求書発行事業者の登録なし）</div>
            )}
          </div>
        </div>

        {showMoney ? (
          <>
            <div className="mt-6 flex items-end gap-4">
              <div className="text-[13px]">{isReceipt ? "領収金額（税込）" : "ご請求金額（税込）"}</div>
              <div className="flex-1 border-b-2 border-[var(--ink)] pb-1 text-right text-[24px] font-bold">
                {yen(data.including)}
              </div>
            </div>
            {isReceipt ? (
              <div className="mt-2 text-[13px]">
                但し　{extra.purpose || "商品代"}　として、上記正に領収いたしました。
              </div>
            ) : null}
          </>
        ) : null}

        {/* 明細 */}
        <table className="mt-6 w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#F3F5F2]">
              <th className="border border-[var(--line)] px-3 py-2 text-left font-medium">品名・内容</th>
              <th className="border border-[var(--line)] px-3 py-2 text-left font-medium">数量</th>
              <th className="border border-[var(--line)] px-3 py-2 text-right font-medium">税率</th>
              {showMoney ? (
                <th className="border border-[var(--line)] px-3 py-2 text-right font-medium">金額（税抜）</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[var(--line)] px-3 py-3 align-top">
                {data.itemName}
                {amounts.rate === 8 ? <span className="ml-1 text-[11px]">※</span> : null}
                {data.terms ? (
                  <div className="mt-1 whitespace-pre-wrap text-[11px] text-[var(--ink-2)]">{data.terms}</div>
                ) : null}
              </td>
              <td className="border border-[var(--line)] px-3 py-3 align-top">{data.quantityText ?? "―"}</td>
              <td className="border border-[var(--line)] px-3 py-3 text-right align-top">{amounts.rate}%</td>
              {showMoney ? (
                <td className="border border-[var(--line)] px-3 py-3 text-right align-top">
                  {yen(amounts.excluding)}
                </td>
              ) : null}
            </tr>
          </tbody>
        </table>

        {amounts.rate === 8 ? (
          <p className="mt-1 text-[11px] text-[var(--ink-2)]">※は軽減税率（8%）の対象品目です。</p>
        ) : null}

        {/* 税率ごとの区分（適格請求書の必須記載事項） */}
        {showMoney ? (
          <div className="mt-4 flex justify-end">
            <table className="border-collapse text-[12px]">
              <tbody>
                <tr>
                  <td className="border border-[var(--line)] px-3 py-1.5">{amounts.rate}%対象（税抜）</td>
                  <td className="border border-[var(--line)] px-3 py-1.5 text-right">{yen(amounts.excluding)}</td>
                </tr>
                <tr>
                  <td className="border border-[var(--line)] px-3 py-1.5">消費税額（{amounts.rate}%）</td>
                  <td className="border border-[var(--line)] px-3 py-1.5 text-right">{yen(amounts.tax)}</td>
                </tr>
                <tr className="font-bold">
                  <td className="border border-[var(--line)] px-3 py-1.5">合計（税込）</td>
                  <td className="border border-[var(--line)] px-3 py-1.5 text-right">{yen(data.including)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}

        {/* 取引情報 */}
        <table className="mt-6 w-full border-collapse text-[12px]">
          <tbody>
            <tr>
              <td className="w-[140px] border border-[var(--line)] bg-[#FAFBF9] px-3 py-2">取引年月日</td>
              <td className="border border-[var(--line)] px-3 py-2">{data.completedAt}</td>
            </tr>
            {data.deliveryDate ? (
              <tr>
                <td className="border border-[var(--line)] bg-[#FAFBF9] px-3 py-2">納品予定日</td>
                <td className="border border-[var(--line)] px-3 py-2">{data.deliveryDate}</td>
              </tr>
            ) : null}
            {isReceipt && extra.receivedOn ? (
              <tr>
                <td className="border border-[var(--line)] bg-[#FAFBF9] px-3 py-2">代金受領日</td>
                <td className="border border-[var(--line)] px-3 py-2">{extra.receivedOn}</td>
              </tr>
            ) : null}
            {isInvoice && extra.dueText ? (
              <tr>
                <td className="border border-[var(--line)] bg-[#FAFBF9] px-3 py-2">お支払い期限</td>
                <td className="border border-[var(--line)] px-3 py-2">{extra.dueText}</td>
              </tr>
            ) : null}
            {isInvoice && data.seller.bank ? (
              <tr>
                <td className="border border-[var(--line)] bg-[#FAFBF9] px-3 py-2">お振込先</td>
                <td className="whitespace-pre-wrap border border-[var(--line)] px-3 py-2">{data.seller.bank}</td>
              </tr>
            ) : null}
            {extra.note ? (
              <tr>
                <td className="border border-[var(--line)] bg-[#FAFBF9] px-3 py-2">備考</td>
                <td className="border border-[var(--line)] px-3 py-2">{extra.note}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {isReceipt ? (
          <p className="mt-4 text-[10px] leading-5 text-[var(--ink-2)]">
            本書は電磁的記録（PDF）として交付するため、収入印紙の貼付は不要です。
            紙に出力して交付する場合は、記載金額に応じた印紙税の取り扱いをご確認ください。
          </p>
        ) : null}

        <p className="mt-6 text-[10px] leading-5 text-[var(--muted)]">
          本書は、FOOD JAPAN NAKAMA の画面で当事者が作成した書類です。NAKAMA（株式会社グラブデザイン）は
          本取引の当事者ではなく、請求・代金の授受には関与しません。
        </p>
      </div>
    </div>
  );
}
