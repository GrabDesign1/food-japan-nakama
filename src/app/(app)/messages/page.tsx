import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { ThreadList } from "./_components/ThreadList";

export default async function MessagesPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-[22px] text-[var(--ink)]">メッセージ一覧</h1>
      <div className="grid grid-cols-1 overflow-hidden rounded-[12px] border border-[var(--line)] bg-white lg:grid-cols-[300px_1fr]">
        <div className="max-h-[70vh] overflow-y-auto border-[var(--line)] lg:border-r">
          <ThreadList meId={me.id} />
        </div>
        <div className="hidden min-h-[400px] place-items-center p-8 text-center text-[13px] text-[var(--muted)] lg:grid">
          左の一覧から相手を選ぶと、ここに会話が表示されます。
        </div>
      </div>
    </div>
  );
}
