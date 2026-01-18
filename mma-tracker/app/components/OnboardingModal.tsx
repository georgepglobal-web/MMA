"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const DEFAULT_GROUP_ID = "global";

interface OnboardingModalProps {
  userId?: string;
  hasUsername: boolean;
  onUsernameSet?: (username: string) => void;
}

export default function OnboardingModal({ userId, hasUsername, onUsernameSet }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [step, setStep] = useState<"welcome" | "username">("welcome");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only show onboarding if user doesn't have a username
    if (!hasUsername) {
      setIsOpen(true);
      setStep("username");
    }
  }, [hasUsername]);

  const handleClose = () => {
    // Don't allow closing without a username
    if (!hasUsername) return;
    
    setIsOpen(false);
  };

  /**
   * Check if username is already taken in Supabase
   */
  const checkUsernameAvailability = async (checkUsername: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", DEFAULT_GROUP_ID)
        .eq("username", checkUsername)
        .single();

      // If error is "PGRST116" (no rows found), username is available
      if (error && error.code === "PGRST116") {
        return true;
      }

      // If data exists, username is taken
      if (data) {
        return false;
      }

      // Any other error, assume available (will fail on submission)
      return true;
    } catch (e) {
      console.error("Error checking username availability:", e);
      return true;
    }
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    
    setError(null);

    if (!trimmedUsername) {
      setError("Please enter a username");
      return;
    }

    // Validate username (alphanumeric, underscore, hyphen, 3-20 chars)
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(trimmedUsername)) {
      setError("Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens");
      return;
    }

    try {
      setIsLoading(true);

      // Check if username is available
      const isAvailable = await checkUsernameAvailability(trimmedUsername);
      if (!isAvailable) {
        setError("This username is already taken. Please choose another.");
        return;
      }

      // Username is valid and available, call the callback
      onUsernameSet?.(trimmedUsername);
      setStep("welcome");
    } catch (e) {
      console.error("Error setting username:", e);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Username step
  if (step === "username") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-black dark:via-purple-950 dark:to-black rounded-2xl border border-white/20 shadow-2xl max-w-md w-full mx-4 p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Choose Your Username 🥊
            </h2>
            <p className="text-white/70 text-sm sm:text-base">
              Pick a unique username to appear in group rankings
            </p>
          </div>

          <form onSubmit={handleUsernameSubmit} className="space-y-4 mb-6">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (3-20 characters)"
                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                autoFocus
                maxLength={20}
                pattern="[a-zA-Z0-9_-]{3,20}"
                disabled={isLoading}
              />
              <p className="text-white/50 text-xs mt-2">
                3-20 characters, letters, numbers, underscores, or hyphens only
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-3 py-2">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:from-blue-500/50 disabled:to-cyan-600/50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 disabled:scale-100"
            >
              {isLoading ? "Checking availability..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Welcome step
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-black dark:via-purple-950 dark:to-black rounded-2xl border border-white/20 shadow-2xl max-w-md w-full mx-4 p-6 sm:p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Welcome to FightMate! 🥊
          </h2>
          <p className="text-white/70 text-sm sm:text-base">
            Track your training and level up your fighter avatar
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
              1
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Log Training Sessions</p>
              <p className="text-white/60 text-sm">
                Click "Log Session" to record your workouts. Choose your training type and class level.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
              2
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Earn Points & Level Up</p>
              <p className="text-white/60 text-sm">
                Each session earns points. Train different types weekly for bonus points. Level up your avatar!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold text-sm">
              3
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Track Your Progress</p>
              <p className="text-white/60 text-sm">
                View your history, avatar evolution, and group rankings to see how you're progressing.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
