// アップロード・ストレージ操作の共通検証。
// - 画像はマジックバイトで実形式を判定し、JPEG/PNG/WebP/GIF/AVIF のみ許可（SVGはスクリプト実行可能なため不可）
// - contentType・拡張子はクライアント申告値ではなくサーバー判定値を使う
// - 削除はURL文字列を信用せず、期待プレフィックス配下のパスのみ許可する

export type DetectedImage = { ext: string; contentType: string };

export async function validateImageFile(
  file: unknown,
  maxBytes = 5 * 1024 * 1024
): Promise<{ ok: true; ext: string; contentType: string } | { ok: false; error: string }> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "画像ファイルを選んでください。" };
  }
  if (file.size > maxBytes) {
    return { ok: false, error: `画像は${Math.floor(maxBytes / (1024 * 1024))}MBまでにしてください。` };
  }
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const sig = detectImage(head);
  if (!sig) {
    return { ok: false, error: "対応形式は JPEG / PNG / WebP / GIF / AVIF です。" };
  }
  return { ok: true, ...sig };
}

function detectImage(b: Uint8Array): DetectedImage | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return { ext: "jpg", contentType: "image/jpeg" };
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return { ext: "png", contentType: "image/png" };
  if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38)
    return { ext: "gif", contentType: "image/gif" };
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  )
    return { ext: "webp", contentType: "image/webp" };
  // ISO-BMFF (ftyp) = avif/heif
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70)
    return { ext: "avif", contentType: "image/avif" };
  return null;
}

/**
 * 公開URLからバケット内パスを取り出す。
 * expectedPrefix（例: `offerings/${id}/`）配下でない・「..」を含むURLは null（越境削除の防止）。
 */
export function storagePathFromUrl(
  url: string,
  bucket: string,
  expectedPrefix: string
): string | null {
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  const path = url.slice(idx + marker.length);
  if (path.includes("..") || path.includes("//")) return null;
  if (!path.startsWith(expectedPrefix)) return null;
  return path;
}

/** 添付ファイル配信用の安全な contentType（HTML等をブラウザ実行させない）。 */
const SAFE_ATTACHMENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export function safeAttachmentContentType(filename: string): string {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  return SAFE_ATTACHMENT_TYPES[ext] ?? "application/octet-stream";
}
