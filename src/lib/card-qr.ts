import QRCode from "qrcode";

/**
 * 交換カードのQR。**サーバー側でSVGを作って埋め込む**ので、クライアントのJSは増えない。
 *
 * ⚠️ QRに載せるのは交換ページのURLだけ。氏名・連絡先は載せない
 *    （印刷してテーブルに置かれたり、写真に撮られて出回る前提で考える）。
 * ⚠️ 誤り訂正は M。会場の照明と、画面を撮られる状況を想定している。
 */
export async function exchangeQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
    color: { dark: "#1b1b1b", light: "#ffffff" },
  });
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nakama.food-japan-summit.jp";

export function exchangeUrl(code: string): string {
  return `${APP_URL}/cards/x/${code}`;
}
