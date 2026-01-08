"use client";

import { useEffect, useState } from "react";

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem("fightmate-onboarding-seen");
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("fightmate-onboarding-seen", "true");
  };

  if (!isOpen) return null;

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
