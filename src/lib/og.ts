// 外部記事URLから OGP メタ情報（タイトル・概要・画像）を取得する。
// キュレーション記事の登録時、未入力の項目を自動補完するために使う。

export type OgMeta = { title?: string; description?: string; image?: string; author?: string };

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function metaContent(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const re1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`,
      "i"
    );
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
      "i"
    );
    const m = html.match(re1) || html.match(re2);
    if (m && m[1]) {
      const v = decodeEntities(m[1]);
      if (v) return v;
    }
  }
  return undefined;
}

/** URL からOGP情報を取得。失敗しても例外を投げず空を返す。 */
export async function fetchOgMeta(url: string): Promise<OgMeta> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // 一般的なブラウザのUAを送る（bot拒否対策）
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
    }).catch(() => null);
    clearTimeout(timer);
    if (!res || !res.ok) return {};

    // head 付近だけあれば十分。大きすぎるページは先頭のみ読む。
    const html = (await res.text()).slice(0, 300_000);

    const title =
      metaContent(html, ["og:title", "twitter:title"]) ??
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    const description = metaContent(html, [
      "og:description",
      "twitter:description",
      "description",
    ]);

    // 著作権者（発表元）。引用の出所明示に使う。
    // ⚠️ og:site_name は媒体名（PR TIMES 等）になりがちなので**使わない**。
    //    記事側が名乗っている author 系だけを拾い、取れなければ空のままにする
    //    （推測で埋めると出所を誤って表示することになる）。
    const author = metaContent(html, [
      "article:author",
      "author",
      "twitter:data1",
    ]);
    let image = metaContent(html, ["og:image", "twitter:image", "twitter:image:src"]);

    // 相対URLの画像は絶対URLへ
    if (image && !/^https?:\/\//i.test(image)) {
      try {
        image = new URL(image, url).toString();
      } catch {
        image = undefined;
      }
    }

    return {
      title: title ? decodeEntities(title) : undefined,
      description,
      image,
      author: author ? decodeEntities(author) : undefined,
    };
  } catch {
    return {};
  }
}
