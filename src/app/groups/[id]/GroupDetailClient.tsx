"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useClientValue } from "@/lib/useClientValue";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  ArrowLeft,
  Users2,
  Image as ImageIcon,
  Calendar,
  Copy,
  Check,
  Heart,
  Trash2,
  UserMinus,
  Plus,
  Search,
  MessageCircle,
  Send,
  Upload,
  X,
  Camera,
  BarChart2,
} from "lucide-react";
import type { GroupMember, GroupOutfit, GroupThemePlan } from "@/lib/supabase";
import { DisplayHeading } from "@/components/ui/DisplayHeading";

type Tab = "feed" | "chat" | "themes" | "members";

type Message = {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  message_type?: "text" | "image" | "poll";
  image_url?: string | null;
  poll_data?: { question: string; options: (string | { text: string; image_url?: string | null })[] } | null;
  poll_votes?: number[];
  my_vote?: number | null;
};

type GroupDetail = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  invite_code: string;
  max_members: number;
};

interface DigestStats {
  posts: number;
  votes: number;
  activeMembers: number;
}

interface Props {
  group: GroupDetail;
  members: GroupMember[];
  themes: GroupThemePlan[];
  outfits: GroupOutfit[];
  digest: { summary: string; stats: DigestStats } | null;
  role: "owner" | "member";
  userId: string;
}

export default function GroupDetailClient({
  group: initialGroup,
  members: initialMembers,
  themes: initialThemes,
  outfits: initialOutfits,
  digest: initialDigest,
  role,
  userId,
}: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const groupId = initialGroup.id;

  const [tab, setTab] = useState<Tab>("feed");
  const [members, setMembers] = useState<GroupMember[]>(initialMembers);
  const [themes, setThemes] = useState<GroupThemePlan[]>(initialThemes);
  const [outfits, setOutfits] = useState<GroupOutfit[]>(initialOutfits);
  const [weeklyDigest] = useState(initialDigest);

  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadFileRef = useRef<HTMLInputElement>(null);

  const [aiFeedback, setAiFeedback] = useState<Record<string, { text: string; themeFit: number | null; loading: boolean }>>({});
  const inviteUrl = useClientValue(
    () => `${window.location.origin}/groups/invite/${initialGroup.invite_code}`,
    ""
  );
  const [copied, setCopied] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [inviteSent, setInviteSent] = useState<string | null>(null);

  const [showAddTheme, setShowAddTheme] = useState(false);
  const [newTheme, setNewTheme] = useState({ plan_date: "", theme_name: "", occasion: "", notes: "" });
  const [themeColors, setThemeColors] = useState<{ hex: string; label: string }[]>([]);
  const [addingTheme, setAddingTheme] = useState(false);
  const [themeFilter, setThemeFilter] = useState<"all" | "month" | "week">("all");

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [readersCount, setReadersCount] = useState(0);
  const lastMsgTime = useRef<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatImgRef = useRef<HTMLInputElement>(null);

  // Poll creation
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<{ text: string; image_url: string | null; uploading: boolean }[]>([
    { text: "", image_url: null, uploading: false },
    { text: "", image_url: null, uploading: false },
  ]);

  // Image upload state
  const [chatImgUploading, setChatImgUploading] = useState(false);

  const markAsRead = useCallback(async () => {
    await fetch(`/api/groups/${groupId}/messages`, { method: "PATCH" });
  }, [groupId]);

  const fetchMessages = useCallback(async (initial = false) => {
    const url = `/api/groups/${groupId}/messages${lastMsgTime.current && !initial ? `?since=${encodeURIComponent(lastMsgTime.current)}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    setReadersCount(data.readersCount ?? 0);
    const msgs: Message[] = data.messages ?? [];
    if (msgs.length === 0) return;
    if (initial) {
      setMessages(msgs);
    } else {
      setMessages((prev) => [...prev, ...msgs]);
    }
    lastMsgTime.current = msgs[msgs.length - 1].created_at;
  }, [groupId]);

  useEffect(() => {
    if (tab !== "chat") return;
    fetchMessages(true);
    markAsRead();
    const interval = setInterval(() => fetchMessages(false), 3000);
    return () => clearInterval(interval);
  }, [tab, fetchMessages, markAsRead]);

  useEffect(() => {
    if (tab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      markAsRead();
    }
  }, [messages, tab, markAsRead]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || sendingMsg) return;
    setSendingMsg(true);
    const content = chatInput.trim();
    setChatInput("");
    const res = await fetch(`/api/groups/${groupId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      lastMsgTime.current = data.message.created_at;
    }
    setSendingMsg(false);
  }

  async function sendImageMessage(file: File) {
    if (chatImgUploading) return;
    setChatImgUploading(true);
    const fd = new FormData();
    fd.append("image", file);
    const uploadRes = await fetch(`/api/groups/${groupId}/messages/upload`, { method: "POST", body: fd });
    if (!uploadRes.ok) { setChatImgUploading(false); return; }
    const { image_url } = await uploadRes.json();
    const res = await fetch(`/api/groups/${groupId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_type: "image", image_url }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      lastMsgTime.current = data.message.created_at;
    }
    setChatImgUploading(false);
  }

  async function uploadPollOptionImage(file: File, idx: number) {
    setPollOptions((prev) => prev.map((o, i) => i === idx ? { ...o, uploading: true } : o));
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch(`/api/groups/${groupId}/messages/upload`, { method: "POST", body: fd });
    if (res.ok) {
      const { image_url } = await res.json();
      setPollOptions((prev) => prev.map((o, i) => i === idx ? { ...o, image_url, uploading: false } : o));
    } else {
      setPollOptions((prev) => prev.map((o, i) => i === idx ? { ...o, uploading: false } : o));
    }
  }

  async function sendPollMessage(e: React.FormEvent) {
    e.preventDefault();
    const validOptions = pollOptions
      .filter((o) => o.text.trim() || o.image_url)
      .map((o) => ({ text: o.text.trim(), image_url: o.image_url ?? null }));
    if (!pollQuestion.trim() || validOptions.length < 2) return;
    const res = await fetch(`/api/groups/${groupId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message_type: "poll",
        poll_data: { question: pollQuestion.trim(), options: validOptions },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      lastMsgTime.current = data.message.created_at;
      setShowPollCreator(false);
      setPollQuestion("");
      setPollOptions([{ text: "", image_url: null, uploading: false }, { text: "", image_url: null, uploading: false }]);
    }
  }

  async function handlePollVote(msgId: string, optionIdx: number) {
    const res = await fetch(`/api/groups/${groupId}/messages/${msgId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ option_idx: optionIdx }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, poll_votes: data.counts, my_vote: data.my_vote } : m
        )
      );
    }
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleVote(outfitId: string) {
    const res = await fetch(`/api/groups/${groupId}/outfits/${outfitId}/vote`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setOutfits((prev) =>
        prev.map((o) =>
          o.id === outfitId
            ? { ...o, _voted: data.voted, votes_count: (o.votes_count ?? 0) + (data.voted ? 1 : -1) }
            : o
        )
      );
    }
  }

  async function handleAiFeedback(outfitId: string) {
    setAiFeedback((prev) => ({ ...prev, [outfitId]: { text: "", themeFit: null, loading: true } }));
    const res = await fetch(`/api/groups/${groupId}/outfits/${outfitId}/feedback`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setAiFeedback((prev) => ({ ...prev, [outfitId]: { text: data.feedback, themeFit: data.theme_fit ?? null, loading: false } }));
    } else {
      setAiFeedback((prev) => ({ ...prev, [outfitId]: { text: t.groups.aiFeedbackError, themeFit: null, loading: false } }));
    }
  }

  async function handleSearchUsers(q: string) {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setSearchResults(data.users ?? []);
    }
  }

  async function handleInviteUser(email: string) {
    const res = await fetch(`/api/groups/${groupId}/invite/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setInviteSent(email);
      setSearchQuery("");
      setSearchResults([]);
    } else {
      const data = await res.json();
      alert(data.error ?? t.common.error);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm(t.groups.removeConfirm)) return;
    await fetch(`/api/groups/${groupId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: memberId }),
    });
    setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
  }

  async function handleDeleteGroup() {
    if (!confirm(t.groups.deleteGroupConfirm)) return;
    await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    router.push("/groups");
  }

  async function handleAddTheme(e: React.FormEvent) {
    e.preventDefault();
    setAddingTheme(true);
    const res = await fetch(`/api/groups/${groupId}/themes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newTheme, colors: themeColors }),
    });
    if (res.ok) {
      const data = await res.json();
      setThemes((prev) => [...prev, data.theme].sort((a, b) => a.plan_date.localeCompare(b.plan_date)));
      setShowAddTheme(false);
      setNewTheme({ plan_date: "", theme_name: "", occasion: "", notes: "" });
      setThemeColors([]);
    } else {
      const data = await res.json();
      alert(data.error ?? t.common.error);
    }
    setAddingTheme(false);
  }

  async function handleDeleteTheme(themeId: string) {
    await fetch(`/api/groups/${groupId}/themes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme_id: themeId }),
    });
    setThemes((prev) => prev.filter((t) => t.id !== themeId));
  }

  function handleUploadFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setUploadError(null);
  }

  async function handleUploadOutfit(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || uploading) return;
    setUploading(true);
    setUploadError(null);
    const fd = new FormData();
    fd.append("image", uploadFile);
    if (uploadCaption.trim()) fd.append("caption", uploadCaption.trim());
    const res = await fetch(`/api/groups/${groupId}/outfits/upload`, { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      if (data.outfit.moderation_status === "approved") {
        setOutfits((prev) => [{ ...data.outfit, votes_count: 0, _voted: false }, ...prev]);
      }
      setShowUpload(false);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadCaption("");
    } else {
      const data = await res.json();
      setUploadError(data.error ?? t.common.error);
    }
    setUploading(false);
  }

  function addThemeColor() {
    setThemeColors((prev) => [...prev, { hex: "#8B6914", label: "" }]);
  }

  function updateThemeColor(i: number, field: "hex" | "label", value: string) {
    setThemeColors((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

const TABS = [
    { id: "feed" as Tab, label: "Feed", icon: ImageIcon },
    { id: "chat" as Tab, label: "Chat", icon: MessageCircle },
    { id: "themes" as Tab, label: "Theme Plan", icon: Calendar },
    { id: "members" as Tab, label: t.groups.tabMembers, icon: Users2 },
  ];

  return (
    <div className="max-w-[1120px] mx-auto px-6 lg:px-10 py-10 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-2">
          <Link
            href="/groups"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.groups.myGroupsBack}
          </Link>
          <DisplayHeading as="h1" className="text-3xl">{initialGroup.name}</DisplayHeading>
          {initialGroup.description && (
            <p className="text-muted-foreground text-sm">{initialGroup.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t.groups.membersOfMax(members.length, initialGroup.max_members)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyInviteLink}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-line text-ink text-sm font-medium hover:bg-surface-2 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? t.groups.copied : t.groups.inviteFriend}
          </button>
          {role === "owner" && (
            <button
              onClick={handleDeleteGroup}
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              title="ลบกลุ่ม"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line mb-8">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? "border-ink text-ink"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Feed Tab */}
      {tab === "feed" && (
        <div className="space-y-4">
          {/* Upload button */}
          <div className="flex justify-end">
            <button
              onClick={() => { setShowUpload(true); setUploadError(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Upload className="w-4 h-4" />
              เพิ่ม outfit
            </button>
          </div>

          {/* Upload form modal */}
          {showUpload && (
            <form
              onSubmit={handleUploadOutfit}
              className="border border-line rounded-[16px] p-4 bg-surface space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">อัปโหลด outfit เข้ากลุ่ม</p>
                <button
                  type="button"
                  onClick={() => { setShowUpload(false); setUploadFile(null); setUploadPreview(null); setUploadCaption(""); }}
                  className="text-muted-foreground hover:text-ink transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Image picker */}
              <div
                onClick={() => uploadFileRef.current?.click()}
                className="relative aspect-square w-full max-w-[240px] mx-auto rounded-[12px] border-2 border-dashed border-line bg-surface-2 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary/50 transition-colors"
              >
                {uploadPreview ? (
                  <Image src={uploadPreview} alt="preview" fill sizes="240px" unoptimized className="object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                    <p className="text-xs">แตะเพื่อเลือกรูป</p>
                  </div>
                )}
              </div>
              <input
                ref={uploadFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadFileChange}
              />

              <input
                type="text"
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="คำบรรยาย (ไม่บังคับ)"
                maxLength={200}
                className="w-full px-3 py-2 rounded-lg border border-line bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {uploading ? "กำลังอัปโหลด…" : "โพสต์"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowUpload(false); setUploadFile(null); setUploadPreview(null); setUploadCaption(""); }}
                  className="px-4 py-2 border border-line rounded-lg text-sm hover:bg-surface-2 transition-colors"
                >
                  {t.common.cancel}
                </button>
              </div>
            </form>
          )}

          {weeklyDigest && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
              <p className="text-xs font-semibold text-primary">{t.groups.weeklyDigest}</p>
              <p className="text-sm text-foreground leading-relaxed">{weeklyDigest.summary}</p>
              {weeklyDigest.stats && (
                <div className="flex gap-4 pt-1">
                  <span className="text-xs text-muted-foreground">{t.groups.weeklyPosts(weeklyDigest.stats.posts)}</span>
                  <span className="text-xs text-muted-foreground">{t.groups.weeklyVotes(weeklyDigest.stats.votes)}</span>
                  <span className="text-xs text-muted-foreground">{t.groups.weeklyActive(weeklyDigest.stats.activeMembers)}</span>
                </div>
              )}
            </div>
          )}

          {outfits.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-3">
              <ImageIcon className="w-10 h-10 opacity-20 mx-auto" />
              <p className="text-sm">{t.groups.noOutfitsYet}</p>
              <p className="text-xs opacity-70 max-w-[260px] mx-auto leading-relaxed">
                กดปุ่ม <strong>เพิ่ม outfit</strong> ด้านบนเพื่ออัปโหลดรูปโดยตรง<br />
                หรือแชร์จาก Feed โดยกดปุ่ม <strong>แชร์ไปกลุ่ม</strong> บน outfit card
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {outfits.map((outfit) => {
                const fb = aiFeedback[outfit.id];
                return (
                  <div key={outfit.id} className="rounded-[20px] border border-line bg-surface overflow-hidden shadow-[0_4px_20px_-8px_rgba(60,45,25,.12)]">
                    <div className="relative w-full aspect-square">
                      <Image
                        src={outfit.image_url}
                        alt={outfit.caption ?? "Outfit"}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">{outfit.users?.name ?? t.groups.unknownMember}</p>
                          {outfit.caption && <p className="text-xs text-muted-foreground mt-0.5">{outfit.caption}</p>}
                        </div>
                        <button
                          onClick={() => handleVote(outfit.id)}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                            outfit._voted
                              ? "bg-red-50 text-red-500"
                              : "bg-surface-2 text-muted-foreground hover:text-red-400"
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${outfit._voted ? "fill-current" : ""}`} />
                          {outfit.votes_count ?? 0}
                        </button>
                      </div>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {outfit.colors && (outfit.colors as any[]).length > 0 && (
                        <div className="flex gap-1.5">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {(outfit.colors as any[]).map((c, i) => (
                            <div
                              key={i}
                              className="w-5 h-5 rounded-full border border-border"
                              style={{ backgroundColor: c.hex }}
                              title={c.role}
                            />
                          ))}
                        </div>
                      )}
                      {fb?.text ? (
                        <div className="rounded-lg bg-muted/60 px-3 py-2 space-y-1">
                          <p className="text-xs font-medium text-primary">{t.groups.aiStylist}</p>
                          <p className="text-xs text-foreground leading-relaxed">{fb.text}</p>
                          {fb.themeFit !== null && (
                            <p className="text-xs text-muted-foreground">{t.groups.aiThemeFit(fb.themeFit)}</p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAiFeedback(outfit.id)}
                          disabled={fb?.loading}
                          className="w-full text-xs py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                        >
                          {fb?.loading ? t.groups.aiAnalyzing : t.groups.aiAsk}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Chat Tab */}
      {tab === "chat" && (
        <div className="flex flex-col h-[60vh] bg-surface rounded-[20px] border border-line overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <MessageCircle className="w-8 h-8 opacity-30" />
                <p className="text-sm">ยังไม่มีข้อความ — เริ่มสนทนากันเลย!</p>
              </div>
            )}
            {messages.map((msg, idx) => {
              const isOwn = msg.user_id === userId;
              const isLast = idx === messages.length - 1;
              const msgDate = new Date(msg.created_at);
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
              const showDateSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(today.getDate() - 1);
              let dateSepLabel: string;
              if (msgDate.toDateString() === today.toDateString()) {
                dateSepLabel = "วันนี้";
              } else if (msgDate.toDateString() === yesterday.toDateString()) {
                dateSepLabel = "เมื่อวาน";
              } else {
                dateSepLabel = msgDate.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
              }

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="flex items-center gap-3 my-2">
                      <div className="flex-1 h-px bg-line" />
                      <span className="text-[10px] text-muted-foreground shrink-0">{dateSepLabel}</span>
                      <div className="flex-1 h-px bg-line" />
                    </div>
                  )}
                  <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold text-white ${isOwn ? "bg-[#8A6A44]" : "bg-[#6B8A8A]"}`}>
                      {msg.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                      {!isOwn && <p className="text-[10px] text-muted-foreground px-1">{msg.user_name}</p>}

                      {/* text */}
                      {(!msg.message_type || msg.message_type === "text") && (
                        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isOwn ? "bg-[#8A6A44] text-white rounded-tr-sm" : "bg-surface-3 text-ink rounded-tl-sm"}`}>
                          {msg.content}
                        </div>
                      )}

                      {/* image */}
                      {msg.message_type === "image" && msg.image_url && (
                        <div
                          className="relative w-[200px] aspect-square rounded-2xl overflow-hidden cursor-pointer"
                          onClick={() => window.open(msg.image_url!, "_blank")}
                        >
                          <Image src={msg.image_url} alt="รูปภาพ" fill sizes="200px" className="object-cover" />
                        </div>
                      )}

                      {/* poll */}
                      {msg.message_type === "poll" && msg.poll_data && (() => {
                        const hasAnyImage = msg.poll_data.options.some((o) => typeof o === "object" && o.image_url);
                        return (
                          <div className={`rounded-2xl overflow-hidden border ${isOwn ? "border-[#8A6A44]/40 bg-[#8A6A44]/10" : "border-line bg-surface-2"} ${hasAnyImage ? "w-64" : "w-56"}`}>
                            <div className={`px-3 pt-3 pb-1.5 text-xs font-semibold ${isOwn ? "text-[#8A6A44]" : "text-ink"}`}>
                              📊 {msg.poll_data.question}
                            </div>
                            <div className={`px-2 pb-2 ${hasAnyImage ? "grid grid-cols-2 gap-1.5" : "space-y-1.5"}`}>
                              {msg.poll_data.options.map((opt, i) => {
                                const optText = typeof opt === "string" ? opt : opt.text;
                                const optImg = typeof opt === "object" ? opt.image_url : null;
                                const votes = msg.poll_votes ?? [];
                                const total = votes.reduce((a, b) => a + b, 0);
                                const count = votes[i] ?? 0;
                                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                const isMyVote = msg.my_vote === i;

                                if (hasAnyImage) {
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => handlePollVote(msg.id, i)}
                                      className={`relative rounded-xl overflow-hidden aspect-square flex flex-col justify-end transition-all ${isMyVote ? "ring-2 ring-[#8A6A44]" : "hover:opacity-90"}`}
                                    >
                                      {optImg ? (
                                        <Image src={optImg} alt={optText} fill sizes="128px" className="object-cover" />
                                      ) : (
                                        <div className="absolute inset-0 bg-surface-3 flex items-center justify-center">
                                          <span className="text-[10px] text-muted-foreground px-1 text-center">{optText}</span>
                                        </div>
                                      )}
                                      <div className="relative bg-black/50 px-1.5 py-1">
                                        {optText && <p className="text-white text-[10px] font-medium truncate">{optText}</p>}
                                        <p className="text-white/80 text-[9px]">{pct}% · {count}</p>
                                      </div>
                                      {isMyVote && <div className="absolute inset-0 ring-2 ring-inset ring-[#8A6A44] rounded-xl pointer-events-none" />}
                                    </button>
                                  );
                                }

                                return (
                                  <button
                                    key={i}
                                    onClick={() => handlePollVote(msg.id, i)}
                                    className={`w-full text-left rounded-lg overflow-hidden relative text-xs transition-all ${isMyVote ? "ring-2 ring-[#8A6A44]" : "hover:opacity-80"}`}
                                  >
                                    <div
                                      className="absolute inset-0 rounded-lg transition-all"
                                      style={{ width: `${pct}%`, background: isMyVote ? "#8A6A44" : "#8A6A4440" }}
                                    />
                                    <div className="relative flex justify-between items-center px-2.5 py-1.5">
                                      <span className={isMyVote ? "text-white font-medium" : "text-ink"}>{optText}</span>
                                      <span className={`text-[10px] ${isMyVote ? "text-white/80" : "text-muted-foreground"}`}>{pct}%</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-muted-foreground text-right px-3 pb-2">
                              {(msg.poll_votes ?? []).reduce((a, b) => a + b, 0)} โหวต
                            </p>
                          </div>
                        );
                      })()}

                      <p className="text-[10px] text-muted-foreground px-1">
                        {msgDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {isOwn && isLast && readersCount > 0 && (
                        <p className="text-[10px] text-muted-foreground px-1">
                          อ่านแล้ว{readersCount > 1 ? ` · ${readersCount} คน` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Poll creator */}
          {showPollCreator && (
            <form onSubmit={sendPollMessage} className="border-t border-line bg-surface p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-ink">สร้าง Poll</p>
                <button type="button" onClick={() => { setShowPollCreator(false); setPollQuestion(""); setPollOptions([{ text: "", image_url: null, uploading: false }, { text: "", image_url: null, uploading: false }]); }} className="text-muted-foreground hover:text-ink">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="คำถาม..."
                maxLength={200}
                required
                className="w-full px-3 py-1.5 rounded-lg border border-line bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-1.5 items-start">
                  {/* Image thumbnail / upload button */}
                  <div className="shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      id={`poll-opt-img-${i}`}
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPollOptionImage(f, i); e.target.value = ""; }}
                    />
                    <label
                      htmlFor={`poll-opt-img-${i}`}
                      className="w-10 h-10 rounded-lg border border-dashed border-line bg-surface-2 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                    >
                      {opt.uploading ? (
                        <span className="text-[9px] text-muted-foreground">…</span>
                      ) : opt.image_url ? (
                        <Image src={opt.image_url} alt="" width={40} height={40} className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </label>
                  </div>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => setPollOptions((prev) => prev.map((o, idx) => idx === i ? { ...o, text: e.target.value } : o))}
                    placeholder={`ตัวเลือก ${i + 1}`}
                    maxLength={100}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-line bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {pollOptions.length > 2 && (
                    <button type="button" onClick={() => setPollOptions((prev) => prev.filter((_, idx) => idx !== i))} className="mt-1.5 text-muted-foreground hover:text-red-500 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                {pollOptions.length < 6 && (
                  <button type="button" onClick={() => setPollOptions((prev) => [...prev, { text: "", image_url: null, uploading: false }])} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> เพิ่มตัวเลือก
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.text.trim() || o.image_url).length < 2}
                  className="ml-auto px-4 py-1.5 bg-[#8A6A44] text-white rounded-lg text-xs font-medium hover:bg-[#7A5A34] disabled:opacity-40 transition-colors"
                >
                  ส่ง Poll
                </button>
              </div>
            </form>
          )}

          {/* Input */}
          <form onSubmit={sendMessage} className="flex items-center gap-1.5 p-3 border-t border-line bg-surface">
            {/* Image upload */}
            <button
              type="button"
              disabled={chatImgUploading}
              onClick={() => chatImgRef.current?.click()}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-[#8A6A44] hover:bg-[#8A6A44]/10 transition-colors disabled:opacity-40 shrink-0"
              title="ส่งรูปภาพ"
            >
              {chatImgUploading ? <span className="text-[10px]">…</span> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={chatImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImageMessage(f); e.target.value = ""; }} />

            {/* Poll */}
            <button
              type="button"
              onClick={() => setShowPollCreator((v) => !v)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${showPollCreator ? "bg-[#8A6A44]/20 text-[#8A6A44]" : "text-muted-foreground hover:text-[#8A6A44] hover:bg-[#8A6A44]/10"}`}
              title="สร้าง Poll"
            >
              <BarChart2 className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="พิมพ์ข้อความ..."
              maxLength={500}
              className="flex-1 px-4 py-2 rounded-full border border-line bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || sendingMsg}
              className="w-9 h-9 rounded-full bg-[#8A6A44] text-white flex items-center justify-center hover:bg-[#7A5A34] transition-colors disabled:opacity-40 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Theme Plan Tab */}
      {tab === "themes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Filter chips */}
            <div className="flex gap-2">
              {([ ["all", "ทั้งหมด"], ["week", "สัปดาห์นี้"], ["month", "เดือนนี้"] ] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setThemeFilter(val)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    themeFilter === val
                      ? "bg-primary text-primary-foreground"
                      : "border border-line text-muted-foreground hover:text-ink hover:border-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddTheme(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t.groups.addTheme}
            </button>
          </div>

          {showAddTheme && (
            <form
              onSubmit={handleAddTheme}
              className="border border-border rounded-xl p-4 space-y-3 bg-muted/30"
            >
              <h3 className="font-medium text-sm">{t.groups.addThemePlan}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t.groups.themeDate}</label>
                  <input
                    type="date"
                    value={newTheme.plan_date}
                    onChange={(e) => setNewTheme((p) => ({ ...p, plan_date: e.target.value }))}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t.groups.themeName}</label>
                  <input
                    type="text"
                    value={newTheme.theme_name}
                    onChange={(e) => setNewTheme((p) => ({ ...p, theme_name: e.target.value }))}
                    placeholder={t.groups.themeNamePlaceholder}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.groups.themeOccasion}</label>
                <input
                  type="text"
                  value={newTheme.occasion}
                  onChange={(e) => setNewTheme((p) => ({ ...p, occasion: e.target.value }))}
                  placeholder={t.groups.themeOccasionPlaceholder}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">{t.groups.themePalette}</label>
                  <button type="button" onClick={addThemeColor} className="text-xs text-primary hover:underline">
                    {t.groups.themeAddColor}
                  </button>
                </div>
                {themeColors.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={c.hex}
                      onChange={(e) => updateThemeColor(i, "hex", e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={c.label}
                      onChange={(e) => updateThemeColor(i, "label", e.target.value)}
                      placeholder={t.groups.themeColorName}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setThemeColors((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-red-500 p-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.groups.themeNotes}</label>
                <textarea
                  value={newTheme.notes}
                  onChange={(e) => setNewTheme((p) => ({ ...p, notes: e.target.value }))}
                  placeholder={t.groups.themeNotesPlaceholder}
                  rows={2}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={addingTheme}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {addingTheme ? t.common.saving : t.common.save}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTheme(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  {t.common.cancel}
                </button>
              </div>
            </form>
          )}

          {(() => {
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

            const filtered = themes.filter((theme) => {
              if (themeFilter === "all") return true;
              const d = new Date(theme.plan_date);
              if (themeFilter === "week") return d >= startOfWeek && d <= endOfWeek;
              return d >= startOfMonth && d <= endOfMonth;
            });

            const emptyLabel = themeFilter === "week" ? "สัปดาห์นี้" : themeFilter === "month" ? "เดือนนี้" : "";

            if (filtered.length === 0 && !showAddTheme) return (
              <div className="py-12 text-center text-muted-foreground">
                <Calendar className="w-10 h-10 opacity-20 mx-auto mb-3" />
                <p className="text-sm">{emptyLabel ? `ยังไม่มี theme plan ${emptyLabel}` : t.groups.noThemes}</p>
              </div>
            );

            return (
            <div className="space-y-3">
              {filtered.map((theme) => (
                <div key={theme.id} className="rounded-[12px] border border-line bg-surface-2 p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(theme.plan_date).toLocaleDateString("th-TH", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                      <p className="font-medium text-sm mt-0.5">{theme.theme_name}</p>
                      {theme.occasion && <p className="text-xs text-muted-foreground">{theme.occasion}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteTheme(theme.id)}
                      className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {theme.colors && (theme.colors as any[]).length > 0 && (
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(theme.colors as any[]).map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
                          {c.label && <span className="text-xs text-muted-foreground">{c.label}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {theme.notes && <p className="text-xs text-muted-foreground">{theme.notes}</p>}
                </div>
              ))}
            </div>
            );
          })()}
        </div>
      )}

      {/* Members Tab */}
      {tab === "members" && (
        <div className="space-y-6">
          <div className="rounded-[16px] border border-line bg-surface p-5 space-y-3">
            <h3 className="text-sm font-medium text-ink">{t.groups.inviteLink}</h3>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 px-3 py-2 rounded-[10px] border border-line bg-surface-2 text-xs text-muted-foreground"
              />
              <button
                onClick={copyInviteLink}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] border border-line hover:bg-surface-2 transition-colors text-sm"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? t.groups.copied : t.groups.copy}
              </button>
            </div>
          </div>

          {role === "owner" && (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <h3 className="text-sm font-medium">{t.groups.searchFriendInvite}</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  placeholder={t.groups.searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-1">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted">
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <button
                        onClick={() => handleInviteUser(user.email)}
                        className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {inviteSent && <p className="text-xs text-green-600">{t.groups.inviteSent(inviteSent)}</p>}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t.groups.membersHeader(members.length, initialGroup.max_members)}
            </h3>
            {members.map((member) => {
              const user = member.users;
              return (
                <div key={member.id} className="flex items-center justify-between px-4 py-3 rounded-[14px] border border-line bg-surface">
                  <div className="flex items-center gap-3">
                    {user?.image ? (
                      <Image src={user.image} alt={user.name} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {user?.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{user?.name ?? t.groups.unknownMember}</p>
                      {member.role === "owner" && <p className="text-xs text-primary">{t.groups.groupOwner}</p>}
                    </div>
                  </div>
                  {role === "owner" && member.role !== "owner" && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="ลบออกจากกลุ่ม"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
