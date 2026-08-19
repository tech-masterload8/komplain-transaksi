"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Paperclip, Send } from "lucide-react";
import PhoneShell from "@/components/PhoneShell";
import { CircleIconButton } from "@/components/CircleIconButton";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { formatTime } from "@/lib/format";
import { apiUrl } from "@/lib/paths";

type Message = {
  id: string;
  sender_role: "agent" | "cs";
  body: string;
  attachment_path: string | null;
  created_at: string;
};

type Conversation = {
  id: string;
  transaction_id: string;
  reseller_phone: string | null;
  status: string;
};

export default function ChatThreadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [role, setRole] = useState<"agent" | "cs" | "admin">("agent");
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const me = await fetch(apiUrl("/api/auth/me")).then((res) => res.json());
    if (me.user?.role) setRole(me.user.role);
    const res = await fetch(apiUrl(`/api/conversations/${params.id}`));
    if (res.status === 401) return router.replace("/");
    const data = await res.json();
    setConversation(data.conversation);
    setMessages(data.messages || []);
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(event?: FormEvent, file?: File | null) {
    event?.preventDefault();
    if (!text.trim() && !file) return;
    const form = new FormData();
    form.set("body", text);
    if (file) form.set("file", file);
    setText("");
    await fetch(apiUrl(`/api/conversations/${params.id}/messages`), { method: "POST", body: form });
    await load();
  }

  const mine = role === "agent" ? "agent" : "cs";

  return (
    <PhoneShell>
      <div className="flex min-h-dvh flex-col">
        <div className="px-5 pt-6">
          <CustomerHeader
            title="Percakapan"
            extra={
              <CircleIconButton href="/chat" dark={false}>
                <ArrowLeft size={18} />
              </CircleIconButton>
            }
          />
          <p className="mb-4 text-sm text-sky-600">#{conversation?.transaction_id}</p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-3">
          {messages.map((message) => {
            const own = message.sender_role === mine;
            return (
              <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    own ? "rounded-br-md bg-sky-500 text-white" : "rounded-bl-md border border-zinc-200 bg-white"
                  }`}
                >
                  {message.body ? <p>{message.body}</p> : null}
                  {message.attachment_path ? (
                    <a href={apiUrl(message.attachment_path)} className="mt-1 block text-xs underline" target="_blank">
                      Lampiran
                    </a>
                  ) : null}
                  <p className={`mt-1 text-[10px] ${own ? "text-sky-100" : "text-zinc-400"}`}>
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="flex items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100"
          >
            <Paperclip size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => send(undefined, e.target.files?.[0])}
          />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ketik pesan..."
            className="flex-1 rounded-full bg-zinc-100 px-4 py-2.5 text-sm outline-none"
          />
          <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
            <Send size={14} />
          </button>
        </form>
      </div>
    </PhoneShell>
  );
}
