"use client";

import React from "react";

type ChatFABProps = {
  unreadCount: number;
  onClick: () => void;
};

export default function ChatFAB({ unreadCount, onClick }: ChatFABProps) {
  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={onClick}
        aria-label="Open chat"
        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-900/90 text-white flex items-center justify-center shadow-xl border border-white/10 hover:bg-slate-800 transition-colors duration-150"
      >
        <span className="text-xl sm:text-2xl">💬</span>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] px-1.5 py-0.5 rounded-full bg-rose-500 text-xs font-bold text-white border border-white/10 shadow-md">{displayCount}</span>
        )}
      </button>
    </div>
  );
}
