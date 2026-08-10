// アップロード・ストレージ操作の共通検証。
// - 画像はマジックバイトで実形式を判定し、JPEG/PNG/WebP/GIF/AVIF のみ許可（SVGはスクリプト実行可能なため不可）
// - contentType・拡張子はクライアント申告値ではなくサーバー判定値を使う
// - 横1600px超の画像はアップロード時に自動縮小する（配信の軽量化。GIFはアニメ保護のため対象外）
// - 削除はURL文字列を信用せず、期待プレフィックス配下のパスのみ許可する
import sharp from "sharp";

export type DetectedImage = { ext: string; contentType: string };

// 表示がぼやけない目安の横幅。これ未満は警告を返す（受け付けは許可する）
export const RECOMMENDED_MIN_WIDTH = 800;

// 保存する最大横幅。これを超える画像は縦横比を保って縮小する（詳細ヒーロー表示にも十分な幅）
export const MAX_UPLOAD_WIDTH = 1600;

export async function validateImageFile(
  file: unknown,
  maxBytes = 5 * 1024 * 1024
): Promise<
  | { ok: true; ext: string; contentType: string; width: number | null; body: Buffer; warning?: string }
  | { ok: false; error: string }
> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "画像ファイルを選んでください。" };
  }
  if (file.size > maxBytes) {
    return { ok: false, error: `画像は${Math.floor(maxBytes / (1024 * 1024))}MBまでにしてください。` };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const sig = detectImage(new Uint8Array(buf.subarray(0, 16)));
  if (!sig) {
    return { ok: false, error: "対応形式は JPEG / PNG / WebP / GIF / AVIF です。" };
  }
  let width = parseImageWidth(buf, sig.ext);

  // 横1600px超は縮小して保存（EXIFの回転を反映してから。失敗時は原本のまま受け付ける）
  let body = buf;
  if (sig.ext !== "gif") {
    try {
      const img = sharp(buf).rotate(); // .rotate()=EXIF Orientationを画素に反映（メタデータ除去で回転が失われるのを防ぐ）
      const meta = await img.metadata();
      if (width == null && meta.width != null) width = meta.width;
      if (meta.width != null && meta.width > MAX_UPLOAD_WIDTH) {
        body = await img.resize({ width: MAX_UPLOAD_WIDTH, withoutEnlargement: true }).toBuffer();
        width = MAX_UPLOAD_WIDTH;
      }
    } catch (e) {
      console.error("[validateImageFile] 縮小に失敗（原本のまま保存）:", e);
      body = buf;
    }
  }

  const warning =
    width != null && width < RECOMMENDED_MIN_WIDTH
      ? `この画像は横${width}pxと小さいため、拡大表示でぼやける可能性があります。横1200px以上の写真がきれいに表示されます。`
      : undefined;
  return { ok: true, ...sig, width, body, warning };
}

/** 画像の横幅（px）を取得。解析できない形式は null。 */
function parseImageWidth(buf: Buffer, ext: string): number | null {
  try {
    if (ext === "png" && buf.length >= 24) return buf.readUInt32BE(16);
    if (ext === "gif" && buf.length >= 10) return buf.readUInt16LE(6);
    if (ext === "webp" && buf.length >= 30) {
      const fmt = buf.subarray(12, 16).toString();
      if (fmt === "VP8X") return 1 + buf.readUIntLE(24, 3);
      if (fmt === "VP8 ") return buf.readUInt16LE(26) & 0x3fff;
      if (fmt === "VP8L") return ((buf.readUInt32LE(21) & 0x3fff) >>> 0) + 1;
    }
    if (ext === "jpg") {
      // SOFマーカーを走査して寸法を得る
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) {
          i++;
          continue;
        }
        const marker = buf[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return buf.readUInt16BE(i + 7);
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch {
    return null;
  }
  return null;
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
