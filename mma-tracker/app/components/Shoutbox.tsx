'use client';

import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { analytics } from "@/lib/analytics";

interface ShoutboxMessage {
  id: string;
  user_id: string;
  type: "system" | "user";
  content: string;
  created_at: string;
}

interface ShoutboxMessageWithName extends ShoutboxMessage {
  displayName: string;
}

interface ShoutboxProps {
  userId: string;
  username: string | null;
  onNewMessages?: (messages: ShoutboxMessageWithName[]) => void;
}

export default function Shoutbox({ userId, username, onNewMessages }: ShoutboxProps) {
  const [messages, setMessages] = useState<ShoutboxMessageWithName[]>([]);
  const [input, setInput] = useState("");
  const [posting, setPosting] = useState(false);
  const lastPostTsRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const timeAgo = (iso: string) => {
    const d = new Date(iso).getTime();
    const s = Math.floor((Date.now() - d) / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    return `${days}d`;
  };

  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("shoutbox_messages")
        .select("id,user_id,type,content,created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Error fetching shoutbox messages:", error);
        return;
      }

      const msgs = (data ?? []) as ShoutboxMessage[];
      const userIds = Array.from(new Set(msgs.map((m) => m.user_id).filter(Boolean)));

      const usernameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: gm, error: gmErr } = await supabase
          .from('group_members')
          .select('user_id,username')
          .in('user_id', userIds as string[]);

        if (!gmErr && gm) {
          (gm as { user_id: string; username: string | null }[]).forEach((g) => {
            if (g.user_id) usernameMap[g.user_id] = g.username || '';
          });
        }
      }

      const mapped: ShoutboxMessageWithName[] = msgs.map((m) => ({
        ...m,
        displayName:
          usernameMap[m.user_id] || (m.user_id === userId ? username || 'You' : 'Anonymous'),
      }));

      setMessages(mapped);
      onNewMessages?.(mapped);
    } catch (e) {
      console.error("Error fetching shoutbox messages:", e);
    }
  }, [userId, username]);

  useEffect(() => {
    fetchMessages();
    const id = window.setInterval(fetchMessages, 5000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const postMessage = async () => {
    if (!userId) return alert("You must be signed in to post");
    const trimmed = input.trim();
    if (!trimmed) return;
    if (trimmed.length > 200) return alert("Message must be 200 characters or less");
    const now = Date.now();
    if (now - lastPostTsRef.current < 10000) return alert("Rate limit: 1 message per 10 seconds");
    lastPostTsRef.current = now;

    try {
      setPosting(true);
      const { error } = await supabase
        .from("shoutbox_messages")
        .insert({ user_id: userId, type: "user", content: trimmed });

      if (error) {
        console.error("Error posting shoutbox message:", error);
        alert("Error posting message. Check console.");
        return;
      }

      setInput("");
      
      // Track analytics
      analytics.messagesSent();
      
      await fetchMessages();
    } catch (e) {
      console.error(e);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow p-4">
        <h3 className="text-white font-bold mb-3">Activity</h3>

        <div className="max-h-72 overflow-auto divide-y divide-white/10 mb-3">
          {messages.length === 0 ? (
            <div className="text-white/60 p-3">No messages yet.</div>
          ) : (
            [...messages].reverse().map((m) => (
              <div key={m.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="text-white font-semibold text-sm">{m.displayName}</div>
                    <div className={`text-white/90 text-sm`}>{m.content}</div>
                  </div>
                  <div className="text-white/50 text-xs whitespace-nowrap">{timeAgo(m.created_at)}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-2">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Say something..."
              maxLength={200}
              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            />
            <button
              onClick={postMessage}
              disabled={posting}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg"
            >
              {posting ? "Posting…" : "Send"}
            </button>
          </div>
          <div className="text-white/50 text-xs mt-2">Max 200 characters — 1 message per 10s</div>
        </div>
      </div>
    </div>
  );
}
