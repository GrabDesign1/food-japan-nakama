// 管理画面の地（2026-08-16）。会員画面は白のままで、事務局の画面だけ薄いグレーにして
// 白いカードが面として立つようにする。会員側のレイアウトやCSSは触っていない。
//
// 仕組み：(app)/layout.tsx の <main> は px-4 py-6 pb-24 md:px-8 md:pb-6。
// 同じ量だけ負のマージンで外へ広げ、同じ量の余白を内側で付け直しているので、
// 見た目の位置は変わらないまま背景だけが main いっぱいに広がる（横スクロールは出ない）。
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 -mb-24 -mt-6 min-h-[calc(100vh-57px)] bg-[#F4F5F7] px-4 pb-24 pt-6 md:-mx-8 md:-mb-6 md:px-8 md:pb-6">
      {children}
    </div>
  );
}
