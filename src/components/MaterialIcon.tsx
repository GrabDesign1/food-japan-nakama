/**
 * 【Material Symbols のアイコン】2026-11-28 ユーザー指示「M3に準拠してアイコンを探して」。
 *
 * 絵柄は **Material Symbols Outlined**（Google・Apache License 2.0）の公式SVGをそのまま。
 * 出典：`https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/<名前>/default/24px.svg`
 *
 * ⚠️⚠️ **viewBox が `0 -960 960 960`。** メニューの `NavIcon` は古い Material Icons（`0 0 24 24`）で、
 *    **座標系が違う**。同じ `PATHS` に混ぜると形が崩れるので、こちらに分けてある。
 *    ⚠️ 新しいアイコンを足すときは、必ず上のURLから取った**公式のパスを貼る**こと（手で描かない）。
 * ⚠️ 色は `currentColor` 1色だけ。文字と同じ色で並ぶようにする。
 */

const PATHS: Record<string, string> = {
  // カメラ（名刺を取り込む）
  photo_camera:
    "M480-260q75 0 127.5-52.5T660-440q0-75-52.5-127.5T480-620q-75 0-127.5 52.5T300-440q0 75 52.5 127.5T480-260Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM160-120q-33 0-56.5-23.5T80-200v-480q0-33 23.5-56.5T160-760h126l74-80h240l74 80h126q33 0 56.5 23.5T880-680v480q0 33-23.5 56.5T800-120H160Zm0-80h640v-480H638l-73-80H395l-73 80H160v480Zm320-240Z",
  // カメラ＋（新しく撮る）
  add_a_photo:
    "M440-440ZM120-120q-33 0-56.5-23.5T40-200v-480q0-33 23.5-56.5T120-760h126l74-80h240v80H355l-73 80H120v480h640v-360h80v360q0 33-23.5 56.5T760-120H120Zm640-560v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80ZM440-260q75 0 127.5-52.5T620-440q0-75-52.5-127.5T440-620q-75 0-127.5 52.5T260-440q0 75 52.5 127.5T440-260Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Z",
  // 書類を読み取る
  document_scanner:
    "M80-720v-200h200v80H160v120H80Zm720 0v-120H680v-80h200v200h-80ZM80-40v-200h80v120h120v80H80Zm600 0v-80h120v-120h80v200H680ZM280-240h400v-480H280v480Zm0 80q-33 0-56.5-23.5T200-240v-480q0-33 23.5-56.5T280-800h400q33 0 56.5 23.5T760-720v480q0 33-23.5 56.5T680-160H280Zm80-400h240v-80H360v80Zm0 120h240v-80H360v80Zm0 120h240v-80H360v80Zm-80 80v-480 480Z",
};

export type MaterialIconName = keyof typeof PATHS;

export function MaterialIcon({
  name,
  size = 18,
  className,
}: {
  name: MaterialIconName | string;
  size?: number;
  className?: string;
}) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}
