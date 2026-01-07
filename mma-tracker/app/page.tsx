"use client";

import { useState, useEffect } from "react";
import { usePage } from "./contexts/PageContext";
import AvatarImage from "./components/AvatarImage";

// Types
interface Session {
  id: number;
  date: string;
  type: string;
  level: string;
  points: number; // Points earned for this session
}

interface Avatar {
  level: "Novice" | "Intermediate" | "Seasoned" | "Elite";
  progress: number; // 0-100 (approximate, not exact percentage)
  cumulativePoints: number; // Total points earned across all sessions
}

interface MemberRanking {
  name: string;
  score: number;
  badges: string[];
}

// Session type options
const SESSION_TYPES = [
  "Boxing",
  "Muay Thai",
  "K1",
  "BJJ",
  "Wrestling",
  "MMA",
  "Takedowns",
  "Judo",
  "Strength & Conditioning",
  "Weight Training",
  "Cardio",
];

// Class levels
const CLASS_LEVELS = ["Basic", "Intermediate", "Advanced", "All Level"];

// Avatar levels
const AVATAR_LEVELS = ["Novice", "Intermediate", "Seasoned", "Elite"] as const;

// Level thresholds (cumulative points)
const LEVEL_THRESHOLDS = {
  Novice: { min: 0, max: 7 },
  Intermediate: { min: 8, max: 15 },
  Seasoned: { min: 16, max: 24 },
  Elite: { min: 25, max: Infinity },
} as const;

// Class level multipliers
const CLASS_LEVEL_MULTIPLIERS: Record<string, number> = {
  Basic: 1.0,
  Intermediate: 1.5,
  Advanced: 2.0,
  "All Level": 1.3,
};

// Sample group ranking
const SAMPLE_GROUP: MemberRanking[] = [
  { name: "Alice", score: 120, badges: ["Most Balanced"] },
  { name: "Bob", score: 110, badges: ["Best Striker", "Best Grappler"] },
  { name: "Charlie", score: 100, badges: [] },
];

export default function Home() {
  const { currentPage: page, setCurrentPage: setPage } = usePage();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [avatar, setAvatar] = useState<Avatar | null>(null);

  // Load from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem("sessions");
    const savedAvatar = localStorage.getItem("avatar");
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      // Calculate cumulative points from sessions if avatar doesn't have it
      if (parsed.length > 0) {
        const totalPoints = parsed.reduce((sum: number, s: Session) => sum + (s.points || 0), 0);
        if (savedAvatar) {
          const parsedAvatar = JSON.parse(savedAvatar);
          // Ensure avatar has cumulativePoints
          if (parsedAvatar.cumulativePoints === undefined) {
            parsedAvatar.cumulativePoints = totalPoints;
            setAvatar(parsedAvatar);
            localStorage.setItem("avatar", JSON.stringify(parsedAvatar));
          } else {
            setAvatar(parsedAvatar);
          }
        }
      }
    }
    // Only load avatar if it exists - don't create one yet
    if (savedAvatar && !sessions.length) {
      setAvatar(JSON.parse(savedAvatar));
    }
  }, []); // Empty dependency array - only run on mount

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("avatar", JSON.stringify(avatar));
  }, [avatar]);

  /**
   * Calculate weekly diversity bonus
   * +0.5 points per extra session type (beyond first), capped at +1.5 points/week
   */
  const calculateWeeklyDiversityBonus = (sessions: Session[], newSession: Omit<Session, "id" | "points">): number => {
    const sessionDate = new Date(newSession.date);
    const weekStart = new Date(sessionDate);
    weekStart.setDate(sessionDate.getDate() - sessionDate.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Get all sessions from this week (including the new one)
    const weekSessions = [
      ...sessions.filter((s) => {
        const sDate = new Date(s.date);
        return sDate >= weekStart && sDate < weekEnd;
      }),
      newSession as Session,
    ];

    // Count unique session types
    const uniqueTypes = new Set(weekSessions.map((s) => s.type));
    const uniqueTypeCount = uniqueTypes.size;

    // Bonus: +0.5 per extra type beyond the first, capped at +1.5
    if (uniqueTypeCount <= 1) return 0;
    const extraTypes = uniqueTypeCount - 1;
    return Math.min(extraTypes * 0.5, 1.5);
  };

  /**
   * Calculate points for a session based on class level multiplier
   */
  const calculateSessionPoints = (classLevel: string, diversityBonus: number): number => {
    const basePoints = 1.0;
    const multiplier = CLASS_LEVEL_MULTIPLIERS[classLevel] || 1.0;
    return basePoints * multiplier + diversityBonus;
  };

  /**
   * Calculate avatar level based on cumulative points
   */
  const calculateLevelFromPoints = (points: number): Avatar["level"] => {
    if (points >= LEVEL_THRESHOLDS.Elite.min) return "Elite";
    if (points >= LEVEL_THRESHOLDS.Seasoned.min) return "Seasoned";
    if (points >= LEVEL_THRESHOLDS.Intermediate.min) return "Intermediate";
    return "Novice";
  };

  /**
   * Calculate progress within current level (0-100, approximate)
   */
  const calculateProgressInLevel = (points: number, level: Avatar["level"]): number => {
    const threshold = LEVEL_THRESHOLDS[level];
    const range = threshold.max - threshold.min;

    if (range === Infinity || level === "Elite") {
      // Elite level - show 100% if at max, otherwise calculate progress beyond threshold
      return points >= threshold.min ? 100 : 0;
    }

    const pointsInLevel = Math.max(0, points - threshold.min);
    // Round to nearest 25% step (0, 25, 50, 75, 100)
    const rawProgress = Math.min(100, Math.round((pointsInLevel / range) * 100));
    return Math.round(rawProgress / 25) * 25;
  };

  /**
   * Add a new training session
   * Calculates points, updates cumulative points, and updates avatar level
   */
  const addSession = (session: Omit<Session, "id" | "points">) => {
    // Calculate diversity bonus
    const diversityBonus = calculateWeeklyDiversityBonus(sessions, session);
    
    // Calculate session points
    const sessionPoints = calculateSessionPoints(session.level, diversityBonus);
    
    // Create session with points
    const newSession: Session = {
      ...session,
      id: Date.now(),
      points: sessionPoints,
    };

    // Add to sessions
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);

    // Calculate cumulative points
    const currentCumulativePoints = avatar?.cumulativePoints || 0;
    const newCumulativePoints = currentCumulativePoints + sessionPoints;

    // Calculate new level based on points
    const newLevel = calculateLevelFromPoints(newCumulativePoints);
    const newProgress = calculateProgressInLevel(newCumulativePoints, newLevel);

    // Update avatar
    setAvatar({
      level: newLevel,
      progress: newProgress,
      cumulativePoints: newCumulativePoints,
    });
  };

  // Components
  const HomePage = () => {
    const getLevelColor = (level: string) => {
      switch (level) {
        case "Novice":
          return "from-gray-400 to-gray-600";
        case "Intermediate":
          return "from-green-400 to-green-600";
        case "Seasoned":
          return "from-blue-400 to-blue-600";
        case "Elite":
          return "from-purple-400 to-yellow-400";
        default:
          return "from-gray-400 to-gray-600";
      }
    };

    return (
      <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-black dark:via-purple-950 dark:to-black">
        <div className="max-w-4xl mx-auto">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-12 mt-8 sm:mt-12">
            {/* Avatar Image with Level Badge */}
            <div className="relative mb-6">
              {avatar ? (
                <>
                  <AvatarImage
                    level={avatar.level}
                    size="md"
                    showGlow={true}
                  />
                  {/* Level Badge */}
                  <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r ${getLevelColor(avatar.level)} text-white text-xs font-bold shadow-lg border-2 border-white/30 whitespace-nowrap z-10`}>
                    {avatar.level}
                  </div>
                </>
              ) : null}
              {!avatar && (
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl sm:text-5xl font-bold shadow-2xl border-4 border-white/20 backdrop-blur-sm">
                  AV
                </div>
              )}
            </div>

            {/* Fighter Name and Stats */}
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">
              Fighter Avatar
            </h2>
            <div className="flex gap-6 mt-4 text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 hover:bg-white/15 transition-colors duration-200 cursor-default">
                <div className="text-2xl font-bold text-white">{sessions.length}</div>
                <div className="text-xs text-white/70 uppercase tracking-wide">Sessions</div>
              </div>
              {avatar && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 hover:bg-white/15 transition-colors duration-200 cursor-default">
                  <div className="text-2xl font-bold text-white">{avatar.level}</div>
                  <div className="text-xs text-white/70 uppercase tracking-wide">Level</div>
                </div>
              )}
            </div>

            {/* Progress Bar - only show if avatar exists */}
            {avatar && (
              <div className="w-full max-w-xs mt-6">
                <div className="flex justify-between text-xs text-white/80 mb-2">
                  <span>Level Progress</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden border border-white/20 backdrop-blur-sm shadow-inner">
                  <div
                    className={`h-full bg-gradient-to-r ${getLevelColor(avatar.level)} transition-all duration-700 ease-out rounded-full shadow-lg`}
                    style={{ width: `${Math.round(avatar.progress / 25) * 25}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <button
              onClick={() => setPage("log")}
              className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold py-6 px-6 rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50 border-2 border-white/20 backdrop-blur-sm"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
              <div className="relative flex items-center justify-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-lg">Log Session</span>
              </div>
            </button>

            <button
              onClick={() => setPage("history")}
              className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-6 px-6 rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-green-500/50 border-2 border-white/20 backdrop-blur-sm"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
              <div className="relative flex items-center justify-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-lg">History</span>
              </div>
            </button>

            <button
              onClick={() => setPage("avatar")}
              className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 text-white font-bold py-6 px-6 rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-orange-500/50 border-2 border-white/20 backdrop-blur-sm"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
              <div className="relative flex items-center justify-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-lg">Avatar Evolution</span>
              </div>
            </button>

            <button
              onClick={() => setPage("ranking")}
              className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-6 px-6 rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-purple-500/50 border-2 border-white/20 backdrop-blur-sm"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
              <div className="relative flex items-center justify-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span className="text-lg">Group Ranking</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const LogSession = () => {
    const [date, setDate] = useState("");
    const [type, setType] = useState(SESSION_TYPES[0]);
    const [level, setLevel] = useState(CLASS_LEVELS[0]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!date) {
        alert("Please select a date");
        return;
      }
      addSession({ date, type, level });
      setDate("");
      setType(SESSION_TYPES[0]);
      setLevel(CLASS_LEVELS[0]);
      setPage("history");
    };

    return (
      <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 dark:from-black dark:via-blue-950 dark:to-black">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 mt-8 sm:mt-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">
              Log Training Session
            </h2>
            <p className="text-white/70 text-sm sm:text-base">
              Track your progress and level up your fighter avatar
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date Picker */}
              <div>
                <label
                  htmlFor="date"
                  className="block text-white font-semibold mb-2 text-sm sm:text-base"
                >
                  Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                    style={{
                      colorScheme: "dark",
                    }}
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-5 h-5 text-white/50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Session Type Dropdown */}
              <div>
                <label
                  htmlFor="session-type"
                  className="block text-white font-semibold mb-2 text-sm sm:text-base"
                >
                  Session Type
                </label>
                <div className="relative">
                  <select
                    id="session-type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none backdrop-blur-sm cursor-pointer"
                  >
                    {SESSION_TYPES.map((sessionType) => (
                      <option
                        key={sessionType}
                        value={sessionType}
                        className="bg-slate-800 text-white"
                      >
                        {sessionType}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-5 h-5 text-white/50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Class Level Dropdown */}
              <div>
                <label
                  htmlFor="class-level"
                  className="block text-white font-semibold mb-2 text-sm sm:text-base"
                >
                  Class Level
                </label>
                <div className="relative">
                  <select
                    id="class-level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none backdrop-blur-sm cursor-pointer"
                  >
                    {CLASS_LEVELS.map((classLevel) => (
                      <option
                        key={classLevel}
                        value={classLevel}
                        className="bg-slate-800 text-white"
                      >
                        {classLevel}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-5 h-5 text-white/50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold py-4 px-6 rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/50 border-2 border-white/20 backdrop-blur-sm"
                >
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-lg">Log Session</span>
                  </div>
                </button>
              </div>
            </form>
          </div>

          {/* Info Card */}
          <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center hover:bg-white/10 transition-colors duration-200">
            <p className="text-white/60 text-xs sm:text-sm">
              💡 Tip: Each logged session increases your avatar progress
            </p>
          </div>
        </div>
      </div>
    );
  };

  const HistoryPage = () => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    const getSessionTypeColor = (type: string) => {
      const colors: { [key: string]: string } = {
        Boxing: "from-red-500 to-red-600",
        "Muay Thai": "from-orange-500 to-orange-600",
        K1: "from-yellow-500 to-yellow-600",
        BJJ: "from-blue-500 to-blue-600",
        Wrestling: "from-purple-500 to-purple-600",
        MMA: "from-pink-500 to-pink-600",
        Takedowns: "from-cyan-500 to-cyan-600",
        Judo: "from-indigo-500 to-indigo-600",
        "Strength & Conditioning": "from-green-500 to-green-600",
        "Weight Training": "from-gray-500 to-gray-600",
        Cardio: "from-emerald-500 to-emerald-600",
      };
      return colors[type] || "from-gray-500 to-gray-600";
    };

    return (
      <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 dark:from-black dark:via-green-950 dark:to-black">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 mt-8 sm:mt-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">
              Training History
            </h2>
            <p className="text-white/70 text-sm sm:text-base">
              {sessions.length > 0
                ? `${sessions.length} session${sessions.length !== 1 ? "s" : ""} logged`
                : "Track your training journey"}
            </p>
          </div>

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-12 text-center">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto text-white/30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-white/60 text-lg font-medium">
                No sessions logged yet.
              </p>
              <p className="text-white/40 text-sm mt-2">
                Start tracking your training by logging your first session!
              </p>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
              {/* Table Header */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-6 py-4 bg-white/5 border-b border-white/10">
                <div className="col-span-4 text-white/70 font-semibold text-sm uppercase tracking-wide">
                  Date
                </div>
                <div className="col-span-5 text-white/70 font-semibold text-sm uppercase tracking-wide">
                  Session Type
                </div>
                <div className="col-span-3 text-white/70 font-semibold text-sm uppercase tracking-wide">
                  Class Level
                </div>
              </div>

              {/* Sessions List */}
              <div className="divide-y divide-white/10">
                {sessions.map((session, index) => (
                  <div
                    key={session.id}
                    className={`px-4 sm:px-6 py-4 sm:py-5 transition-all duration-200 hover:bg-white/10 hover:shadow-md cursor-default rounded-lg ${
                      index % 2 === 0
                        ? "bg-white/5"
                        : "bg-white/[0.02]"
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                      {/* Date */}
                      <div className="col-span-1 sm:col-span-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                            <svg
                              className="w-5 h-5 text-white/70"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <div>
                            <div className="text-white font-medium text-sm sm:text-base">
                              {formatDate(session.date)}
                            </div>
                            <div className="text-white/50 text-xs sm:hidden">
                              {session.date}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Session Type */}
                      <div className="col-span-1 sm:col-span-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${getSessionTypeColor(
                              session.type
                            )} flex items-center justify-center shadow-lg`}
                          >
                            <svg
                              className="w-5 h-5 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium text-sm sm:text-base truncate">
                              {session.type}
                            </div>
                            <div className="text-white/50 text-xs sm:hidden">
                              {session.level}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Class Level */}
                      <div className="col-span-1 sm:col-span-3">
                        <div className="flex items-center justify-between sm:justify-start">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20 backdrop-blur-sm">
                            {session.level}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * Avatar Evolution Page Component
   * Displays the current avatar level and progress toward the next level
   * Uses visual progress steps (25%, 50%, 75%, 100%) with gamified text
   */
  const AvatarEvolutionPage = () => {
    // Get level color gradient based on current level
    const getLevelColor = (level: string) => {
      switch (level) {
        case "Novice":
          return "from-gray-400 to-gray-600";
        case "Intermediate":
          return "from-green-400 to-green-600";
        case "Seasoned":
          return "from-blue-400 to-blue-600";
        case "Elite":
          return "from-purple-400 to-yellow-400";
        default:
          return "from-gray-400 to-gray-600";
      }
    };

    // Get next level name
    const getNextLevel = (currentLevel: Avatar["level"]): string => {
      const currentIndex = AVATAR_LEVELS.indexOf(currentLevel);
      if (currentIndex < AVATAR_LEVELS.length - 1) {
        return AVATAR_LEVELS[currentIndex + 1];
      }
      return "Max Level";
    };

    // Round progress to nearest 25% step (0, 25, 50, 75, 100)
    const getRoundedProgress = (progress: number): number => {
      return Math.round(progress / 25) * 25;
    };

    // Get gamified progress text based on rounded progress
    const getProgressText = (progress: number): string => {
      const rounded = getRoundedProgress(progress);
      switch (rounded) {
        case 0:
          return "Getting started";
        case 25:
          return "Making progress";
        case 50:
          return "Halfway there!";
        case 75:
          return "Almost there";
        case 100:
          return "Level up!";
        default:
          return "Making progress";
      }
    };

    // Show empty state if no avatar exists yet
    if (!avatar) {
      return (
        <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 bg-gradient-to-br from-slate-900 via-yellow-900 to-slate-900 dark:from-black dark:via-yellow-950 dark:to-black">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 mt-8 sm:mt-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                Avatar Evolution
              </h2>
              <p className="text-white/70 text-sm sm:text-base">
                Track your progress and unlock new levels
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-12 text-center">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto text-white/30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <p className="text-white/60 text-lg font-medium mb-2">
                No avatar created yet
              </p>
              <p className="text-white/40 text-sm">
                Log your first training session to create your fighter avatar!
              </p>
            </div>
          </div>
        </div>
      );
    }

    const currentLevel = avatar.level;
    const progress = avatar.progress ?? 0;
    const roundedProgress = getRoundedProgress(progress);
    const progressText = getProgressText(progress);
    const nextLevel = getNextLevel(currentLevel);

    return (
      <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 bg-gradient-to-br from-slate-900 via-yellow-900 to-slate-900 dark:from-black dark:via-yellow-950 dark:to-black">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 mt-8 sm:mt-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">
              Avatar Evolution
            </h2>
            <p className="text-white/70 text-sm sm:text-base">
              Track your progress and unlock new levels
            </p>
          </div>

          {/* All Four Avatars Grid */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-6 sm:p-10 mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {AVATAR_LEVELS.map((level) => {
                const isCurrentLevel = level === currentLevel;
                const isUnlocked = avatar.cumulativePoints >= LEVEL_THRESHOLDS[level].min;
                
                return (
                  <div
                    key={level}
                    className={`flex flex-col items-center transition-all duration-300 ${
                      isCurrentLevel
                        ? "transform scale-105"
                        : "hover:scale-102"
                    }`}
                  >
                    {/* Avatar Container with Highlight */}
                    <div className="relative mb-3">
                      {/* Glow Effect for Current Level */}
                      {isCurrentLevel && (
                        <div
                          className={`absolute inset-0 rounded-full bg-gradient-to-r ${getLevelColor(level)} blur-xl opacity-60 animate-pulse -z-10`}
                          style={{
                            width: "calc(100% + 1rem)",
                            height: "calc(100% + 1rem)",
                            top: "-0.5rem",
                            left: "-0.5rem",
                          }}
                        />
                      )}
                      
                      {/* Border Highlight for Current Level */}
                      <div
                        className={`rounded-full transition-all duration-300 ${
                          isCurrentLevel
                            ? `ring-4 ring-offset-2 ring-offset-slate-900 ${level === "Novice" ? "ring-gray-400" : level === "Intermediate" ? "ring-green-400" : level === "Seasoned" ? "ring-blue-400" : "ring-purple-400"} shadow-2xl`
                            : isUnlocked
                            ? "ring-2 ring-white/20"
                            : "ring-2 ring-white/10 opacity-50"
                        }`}
                      >
                        <AvatarImage
                          level={level}
                          size="sm"
                          showGlow={false}
                          className={!isUnlocked ? "opacity-40 grayscale" : ""}
                        />
                      </div>
                    </div>

                    {/* Level Name */}
                    <div className="text-center">
                      <p
                        className={`font-semibold text-sm sm:text-base transition-colors duration-300 ${
                          isCurrentLevel
                            ? "text-white"
                            : isUnlocked
                            ? "text-white/80"
                            : "text-white/40"
                        }`}
                      >
                        {level}
                      </p>
                      {/* Current Level Indicator */}
                      {isCurrentLevel && (
                        <p className="text-xs text-white/60 mt-1">
                          Current
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Level Progress Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-6 sm:p-10">
            {/* Current Level Badge */}
            <div className="text-center mb-6">
              <div className="inline-block mb-4">
                <div className={`relative px-6 py-3 rounded-2xl bg-gradient-to-r ${getLevelColor(currentLevel)} shadow-lg border-2 border-white/30`}>
                  <div className="absolute inset-0 bg-white/10 rounded-2xl"></div>
                  <span className="relative text-white text-xl sm:text-2xl font-bold uppercase tracking-wide">
                    {currentLevel} Fighter
                  </span>
                </div>
              </div>
              {nextLevel !== "Max Level" && (
                <p className="text-white/60 text-sm sm:text-base">
                  Progress to {nextLevel}
                </p>
              )}
            </div>

            {/* Progress Bar Section */}
            <div className="mb-8">
              {/* Progress Text */}
              <div className="text-center mb-4">
                <p className="text-white font-semibold text-lg sm:text-xl">
                  {progressText}
                </p>
              </div>

              {/* Progress Bar Container */}
              <div className="relative mb-4">
                {/* Background */}
                <div className="w-full h-8 sm:h-10 bg-white/10 rounded-full overflow-hidden border border-white/20 shadow-inner backdrop-blur-sm">
                  {/* Progress Fill - uses rounded progress */}
                  <div
                    className={`h-full bg-gradient-to-r ${getLevelColor(currentLevel)} transition-all duration-700 ease-out rounded-full shadow-lg relative overflow-hidden`}
                    style={{ width: `${roundedProgress}%` }}
                  >
                    {/* Animated shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Level Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Current Level Card */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-colors duration-200 cursor-default">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getLevelColor(currentLevel)} shadow-md`}></div>
                  <h3 className="text-white/80 font-semibold text-sm uppercase tracking-wide">
                    Current Level
                  </h3>
                </div>
                <p className="text-white text-xl font-bold">{currentLevel}</p>
                <p className="text-white/50 text-xs mt-1">
                  {LEVEL_THRESHOLDS[currentLevel].min}-{LEVEL_THRESHOLDS[currentLevel].max === Infinity ? "∞" : LEVEL_THRESHOLDS[currentLevel].max} points
                </p>
              </div>

              {/* Next Level Card */}
              {nextLevel !== "Max Level" && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-colors duration-200 cursor-default">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getLevelColor(nextLevel)} shadow-md`}></div>
                    <h3 className="text-white/80 font-semibold text-sm uppercase tracking-wide">
                      Next Level
                    </h3>
                  </div>
                  <p className="text-white text-xl font-bold">{nextLevel}</p>
                  <p className="text-white/50 text-xs mt-1">
                    {LEVEL_THRESHOLDS[nextLevel as Avatar["level"]].min}+ points
                  </p>
                </div>
              )}
            </div>

            {/* Tips Section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-colors duration-200">
              <p className="text-white/60 text-xs sm:text-sm text-center">
                💡 Each training session earns points based on class level. Train different types weekly for bonus points!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Group Ranking Page Component
   * Displays members sorted by score in descending order
   * Shows ordinal ranks (1st, 2nd, 3rd, etc.) and badges only - no scores displayed
   */
  const GroupRankingPage = () => {
    // Sort members by score descending (internally, but scores are never displayed)
    const sortedMembers = [...SAMPLE_GROUP].sort((a, b) => b.score - a.score);

    // Get ordinal rank text (1st, 2nd, 3rd, 4th, etc.)
    const getOrdinalRank = (index: number): string => {
      const rank = index + 1;
      const lastDigit = rank % 10;
      const lastTwoDigits = rank % 100;

      if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
        return `${rank}th`;
      }

      switch (lastDigit) {
        case 1:
          return `${rank}st`;
        case 2:
          return `${rank}nd`;
        case 3:
          return `${rank}rd`;
        default:
          return `${rank}th`;
      }
    };

    // Get rank badge color based on position
    const getRankBadgeColor = (index: number) => {
      switch (index) {
        case 0:
          return "from-yellow-400 to-yellow-600"; // Gold for 1st
        case 1:
          return "from-gray-300 to-gray-500"; // Silver for 2nd
        case 2:
          return "from-orange-400 to-orange-600"; // Bronze for 3rd
        default:
          return "from-blue-400 to-blue-600"; // Blue for others
      }
    };

    // Get rank icon
    const getRankIcon = (index: number) => {
      switch (index) {
        case 0:
          return "🥇";
        case 1:
          return "🥈";
        case 2:
          return "🥉";
        default:
          return getOrdinalRank(index);
      }
    };

    return (
      <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-black dark:via-purple-950 dark:to-black">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 mt-8 sm:mt-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">
              Group Ranking
            </h2>
            <p className="text-white/70 text-sm sm:text-base">
              Compete with your training group
            </p>
          </div>

          {/* Ranking List */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
            {sortedMembers.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-white/60 text-lg">No members found.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {sortedMembers.map((member, index) => (
                  <div
                    key={member.name}
                    className={`px-4 sm:px-6 py-5 sm:py-6 transition-all duration-200 hover:bg-white/10 hover:shadow-md cursor-default rounded-lg ${
                      index % 2 === 0 ? "bg-white/5" : "bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-4 sm:gap-6">
                      {/* Rank Badge */}
                      <div className="flex-shrink-0">
                        <div
                          className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${getRankBadgeColor(
                            index
                          )} flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg border-2 border-white/30`}
                        >
                          {getRankIcon(index)}
                        </div>
                      </div>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                          {/* Name and Rank */}
                          <div className="flex-1">
                            <h3 className="text-white font-bold text-lg sm:text-xl mb-1 truncate">
                              {member.name}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-white/70 text-sm sm:text-base">
                                {getOrdinalRank(index)}
                              </span>
                            </div>
                          </div>

                          {/* Badges */}
                          {member.badges.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {member.badges.map((badge) => (
                                <span
                                  key={badge}
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-md border border-yellow-300/50 hover:shadow-lg hover:scale-105 transition-all duration-200"
                                >
                                  <svg
                                    className="w-3 h-3 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  {badge}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center hover:bg-white/10 transition-colors duration-200">
            <p className="text-white/60 text-xs sm:text-sm">
              Rankings are based on training activity. Earn badges for your achievements!
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render pages
  switch (page) {
    case "home":
      return <HomePage />;
    case "log":
      return <LogSession />;
    case "history":
      return <HistoryPage />;
    case "avatar":
      return <AvatarEvolutionPage />;
    case "ranking":
      return <GroupRankingPage />;
    default:
      return <HomePage />;
  }
}
