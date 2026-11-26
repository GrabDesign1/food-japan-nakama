// 投稿に貼られたURLから、見出し・画像・媒体名を読む（OGP。2026-11-21）。
//
// なぜ必要か（ユーザー指示 2026-11-21「リンクの見た目」）:
//   これまでは記事のタイトルを手で打つ必要があった。貼るだけで体裁が整うようにする。
//
// ⚠️⚠️ **サーバーが、会員の指定したURLを取りに行く処理**である。素朴に fetch すると、
//    社内・クラウドの内部アドレス（169.254.169.254 のメタデータ等）を代わりに読ませられる（SSRF）。
//    そのため、必ず次の順で守る:
//      1. http / https だけ。ポートは 80 / 443 だけ
//      2. 名前を引いて、**私用・ループバック・リンクローカルのアドレスなら断る**
//      3. 転送（リダイレクト）は自分で追い、**1回ごとに1と2をやり直す**。3回まで
//      4. 本文は先頭 512KB だけ読む。5秒で打ち切る
//    ⚠️ 名前を引いた直後に向き先が変わる隙（DNSの差し替え）までは防げない。
//       内部にだけ効く秘密をURLで渡す作りを、この先も作らないこと。
// ⚠️ 読み取った画像URLを**画面にそのまま出さない**。/api/link-image/[postId] 経由で配る
//    （img-src 'self' を崩さないため）。
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** 取りに行くときの待ち時間。⚠️ 下の「上限まで読む」に変えたぶん、短いと途中で切れる */
const TIMEOUT_MS = 8000;
/**
 * 読む本文の上限。
 * ⚠️⚠️ **「見出しは先頭にある」は成り立たない。**（2026-11-26 実測）
 *    nagoya.food-japan-summit.jp は `</head>` が 1,493 バイト目なのに、
 *    og:image は 421,932 バイト目、`<title>` は 510,220 バイト目にあった
 *    （配信しながら作る作りのページでは、メタ情報が後から流れてくる）。
 *    512KB では `<title>` に届かず、読めたり読めなかったりしていた。
 */
const MAX_HTML_BYTES = 1536 * 1024;
/** 追う転送の回数 */
const MAX_REDIRECTS = 3;
/** 画像として受け取る形式 */
export const LINK_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
/** 画像の上限 */
export const LINK_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type LinkPreview = {
  url: string;
  title: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

/** そのIPが私用・内部向けか */
function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
    const [a, b] = p;
    if (a === 0 || a === 10 || a === 127) return true;          // 未指定・私用・ループバック
    if (a === 169 && b === 254) return true;                     // リンクローカル（メタデータ）
    if (a === 172 && b >= 16 && b <= 31) return true;            // 私用
    if (a === 192 && b === 168) return true;                     // 私用
    if (a === 100 && b >= 64 && b <= 127) return true;           // 事業者内NAT
    if (a === 192 && b === 0) return true;                       // 文書・試験用
    if (a === 198 && (b === 18 || b === 19)) return true;        // 試験用
    if (a >= 224) return true;                                   // マルチキャスト・予約
    return false;
  }
  if (v === 6) {
    const s = ip.toLowerCase().replace(/^\[|\]$/g, "");
    if (s === "::" || s === "::1") return true;                  // 未指定・ループバック
    if (s.startsWith("fe8") || s.startsWith("fe9") || s.startsWith("fea") || s.startsWith("feb"))
      return true;                                               // リンクローカル
    if (/^f[cd]/.test(s)) return true;                           // 内部向け
    if (s.startsWith("ff")) return true;                         // マルチキャスト
    // IPv4 を内側に入れた書き方（::ffff:10.0.0.1 など）も中身で判定する
    const tail = s.split(":").pop() ?? "";
    if (tail.includes(".")) return isPrivateAddress(tail);
    return false;
  }
  return true; // 読み取れないものは断る
}

/** 取りに行ってよいURLか。よければ正規化したURLを返す */
async function checkUrl(raw: string): Promise<URL | null> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.port && u.port !== "80" && u.port !== "443") return null;
  if (u.username || u.password) return null;

  const host = u.hostname.replace(/^\[|\]$/g, "");
  // 数字で直に書かれている場合はそのまま判定
  if (isIP(host)) {
    return isPrivateAddress(host) ? null : u;
  }
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return null;

  try {
    const addrs = await lookup(host, { all: true });
    if (addrs.length === 0) return null;
    // 1つでも内部向けに解決するなら断る
    if (addrs.some((a) => isPrivateAddress(a.address))) return null;
  } catch {
    return null;
  }
  return u;
}

/** 転送を自分で追いながら取りに行く（1回ごとに行き先を点検する） */
async function safeFetch(
  raw: string,
  init: { accept: string }
): Promise<{ res: Response; finalUrl: URL } | null> {
  let current = raw;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const u = await checkUrl(current);
    if (!u) return null;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(u.toString(), {
        redirect: "manual",
        signal: ctrl.signal,
        headers: {
          // ⚠️ 会員や案件が分かる情報を名乗りに入れない
          "User-Agent": "Mozilla/5.0 (compatible; LinkPreviewBot/1.0)",
          Accept: init.accept,
          "Accept-Language": "ja,en;q=0.8",
        },
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      current = new URL(loc, u).toString();
      continue;
    }
    if (!res.ok) return null;
    return { res, finalUrl: u };
  }
  return null;
}

/** HTML の先頭から meta を読む */
function pickMeta(html: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)\\s*=\\s*["']${name}["'][^>]*>`,
      "i"
    );
    const tag = html.match(re)?.[0];
    if (!tag) continue;
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content && content.trim()) return decodeEntities(content.trim());
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/**
 * URL から見出し・画像・媒体名を読む。
 * 取れなければ null を返すだけ（投稿そのものは成立させる）。
 */
export async function fetchLinkPreview(raw: string): Promise<LinkPreview | null> {
  const got = await safeFetch(raw, { accept: "text/html,application/xhtml+xml" });
  if (!got) return null;
  const { res, finalUrl } = got;

  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html")) return null;

  // 先頭だけ読む（長いページを丸ごと持ってこない）
  let html = "";
  const reader = res.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder("utf-8");
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (bytes >= MAX_HTML_BYTES) break;
      // ⚠️⚠️ **`</head>` を見つけただけで止めないこと。**（2026-11-26 本番で踏んだ）
      //    上の MAX_HTML_BYTES の注記のとおり、`</head>` のあとにメタ情報が流れてくる
      //    ページが実在する。止めてよいのは「画像と見出しの両方を受け取れた」ときだけ。
      // ⚠️ **必ず `<meta ...>` の形で確かめること。** 文字列 "og:image" だけを見ると、
      //    画面を組み立てるための内部データ（JSON）に当たって、本物のメタ情報が
      //    流れてくる前に止まってしまう（2026-11-26 実測。本物は 510,220 バイト目にあった）。
      if (
        /<meta[^>]+(?:og:image|twitter:image)/i.test(html) &&
        /<meta[^>]+(?:og:title|twitter:title)|<title[^>]*>/i.test(html)
      ) {
        break;
      }
    }
  } catch {
    return null;
  } finally {
    await reader.cancel().catch(() => {});
  }

  const title =
    pickMeta(html, ["og:title", "twitter:title"]) ??
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()
      ? decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)![1].trim())
      : null);

  const siteName = pickMeta(html, ["og:site_name"]) ?? finalUrl.hostname.replace(/^www\./, "");

  // 画像は相対指定もあるので、最後に辿り着いたURLを基準に直す。
  // ここでも行き先を点検して、内部向けなら捨てる。
  let imageUrl: string | null = null;
  const rawImage = pickMeta(html, ["og:image:secure_url", "og:image", "twitter:image"]);
  if (rawImage) {
    try {
      const abs = new URL(rawImage, finalUrl).toString();
      if (await checkUrl(abs)) imageUrl = abs.slice(0, 2000);
    } catch {
      imageUrl = null;
    }
  }

  return {
    url: finalUrl.toString(),
    title: title ? title.slice(0, 200) : null,
    imageUrl,
    siteName: siteName ? siteName.slice(0, 100) : null,
  };
}

/**
 * 保存済みの画像URLを取りに行く（/api/link-image から使う）。
 * ⚠️ 呼ぶ側で「その投稿を見てよい人か」を必ず確かめたうえで呼ぶこと。
 */
export async function fetchLinkImage(
  raw: string
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const got = await safeFetch(raw, { accept: "image/*" });
  if (!got) return null;
  const { res } = got;

  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!LINK_IMAGE_TYPES.includes(type)) return null;

  const len = Number(res.headers.get("content-length") ?? "0");
  if (len > LINK_IMAGE_MAX_BYTES) return null;

  const body = await res.arrayBuffer();
  if (body.byteLength > LINK_IMAGE_MAX_BYTES) return null;
  return { body, contentType: type };
}
