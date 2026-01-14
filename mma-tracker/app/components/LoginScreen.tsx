import React, { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) return alert("Please enter your email");

    try {
      setSending(true);
      const { data, error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        console.error("Error sending magic link:", error);
        alert("Error sending magic link. Check console.");
        return;
      }

      console.log("Magic link sent response:", data);
      setSent(true);
    } catch (err) {
      console.error("Unexpected error sending magic link:", err);
      alert("Unexpected error. Check console.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-black dark:via-purple-950 dark:to-black">
      <div className="w-full max-w-md p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-2">Sign in</h2>
        <p className="text-white/70 text-sm mb-4">Enter your email to receive a magic link.</p>

        {sent ? (
          <div className="text-white">Check your email for the magic link.</div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60"
            />
            <button
              type="submit"
              onClick={handleSend}
              disabled={sending}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl"
            >
              {sending ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
