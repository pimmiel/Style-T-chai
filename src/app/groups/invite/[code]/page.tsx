"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Users2, ArrowRight } from "lucide-react";

type GroupInfo = {
  id: string;
  name: string;
  max_members: number;
};

export default function InviteAcceptPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/groups/invite/${code}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setGroupInfo(data.group);
        setMemberCount(data.member_count);
      });
  }, [code]);

  async function handleJoin() {
    if (!session) {
      signIn(undefined, { callbackUrl: `/groups/invite/${code}` });
      return;
    }

    setJoining(true);
    setError("");

    const res = await fetch(`/api/groups/invite/${code}`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "เกิดข้อผิดพลาด");
      setJoining(false);
      return;
    }

    router.push(`/groups/${data.groupId}`);
  }

  if (notFound) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground text-sm">ลิงก์ invite ไม่ถูกต้องหรือหมดอายุแล้ว</p>
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center text-muted-foreground text-sm">
        กำลังโหลด...
      </div>
    );
  }

  const isFull = memberCount >= groupInfo.max_members;

  return (
    <div className="max-w-sm mx-auto px-4 py-16 flex flex-col items-center gap-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Users2 className="w-8 h-8 text-primary" />
      </div>

      <div>
        <p className="text-muted-foreground text-sm mb-1">คุณได้รับการเชิญเข้าร่วมกลุ่ม</p>
        <h1 className="text-2xl font-bold">{groupInfo.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {memberCount} / {groupInfo.max_members} สมาชิก
        </p>
      </div>

      {isFull ? (
        <p className="text-sm text-red-500 font-medium">กลุ่มเต็มแล้ว ไม่สามารถเข้าร่วมได้</p>
      ) : (
        <>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={joining}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {status === "unauthenticated"
              ? "เข้าสู่ระบบเพื่อเข้าร่วม"
              : joining
              ? "กำลังเข้าร่วม..."
              : "เข้าร่วมกลุ่ม"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
