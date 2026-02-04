"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePage } from "./contexts/PageContext";
import AvatarImage from "./components/AvatarImage";
import OnboardingModal from "./components/OnboardingModal";
import { supabase, type GroupMember, type DbSession } from "../lib/supabase";
import AuthGate from "./components/AuthGate";
import Shoutbox from "./components/Shoutbox";
import ChatFAB from "./components/ChatFAB";
import MigrationBanner from "./components/MigrationBanner";
import { useSessionMigration } from "@/lib/hooks/useSessionMigration";
import { analytics } from "@/lib/analytics";

// LocalStorage schema version
const STORAGE_VERSION = "1.0.0";
const STORAGE_KEYS = {
  VERSION: "fightmate-storage-version",
  USERNAME: "fightmate-username",
  SESSIONS: "fightmate-sessions",
  AVATAR: "fightmate-avatar",
} as const;

// Types
interface Avatar {
  level: "Novice" | "Intermediate" | "Seasoned" | "Elite";
  progress: number;
  cumulativePoints: number;
}

interface MemberRanking {
  userId: string;
  name: string;
  score: number;
  badges: string[];
  isCurrentUser?: boolean;
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

// Default group ID
const DEFAULT_GROUP_ID = "global";




export default function Home() {
  const { currentPage: page, setCurrentPage: setPage } = usePage();

  const [sessions, setSessions] = useState<DbSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [username, setUsername] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<MemberRanking[]>([]);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Migration hook
  const { 
    migrationNeeded, 
    migrating, 
    migrationResult, 
    migrate, 
    dismiss 
  } = useSessionMigration(userId);

  // Set analytics user
  useEffect(() => {
    analytics.setUser(userId);
  }, [userId]);

  // Track page changes
  useEffect(() => {
    analytics.setPage(page);
    analytics.pageView(page);
  }, [page]);

  // Auth effects moved to AuthGate component

  // Initialize localStorage versioning (only for backward compatibility)
  useEffect(() => {
    // Only run in the browser
    if (typeof window === "undefined") return;
    // Check storage version for any remaining localStorage references
    const storedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    if (storedVersion !== STORAGE_VERSION) {
      localStorage.setItem(STORAGE_KEYS.VERSION, STORAGE_VERSION);
    }
  }, []);

  /**
   * Fetch sessions from Supabase
   */
  const fetchSessions = async () => {
    if (!userId || authLoading) {
      console.log("[Home] Skipping fetch sessions - userId:", userId, "authLoading:", authLoading);
      return;
    }

    console.log("[Home] Fetching sessions for user:", userId);
    setSessionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.error('[Home] Error fetching sessions:', error);
        return;
      }

      console.log('[Home] Fetched', (data || []).length, 'sessions');
      setSessions(data || []);
    } catch (err) {
      console.error('[Home] Failed to fetch sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Auto-migrate on first load
  useEffect(() => {
    if (migrationNeeded && !migrating && !migrationResult) {
      console.log("[Home] Auto-migrating on first load");
      migrate();
    }
  }, [migrationNeeded, migrating, migrationResult, migrate]);

  // Fetch sessions from Supabase
  useEffect(() => {
    console.log("[Home] useEffect - fetch sessions triggered with userId:", userId, "authLoading:", authLoading);
    fetchSessions();
  }, [userId, authLoading]);

  /**
   * Fetch and sync username from Supabase (source of truth)
   * This is called when user is authenticated to load their persisted username
   */
  const syncUsernameFromSupabase = useCallback(async (userIdToSync: string) => {
    if (!userIdToSync) {
      console.log("[Home] Skipping syncUsernameFromSupabase - no userId");
      return;
    }

    console.log("[Home] Syncing username from Supabase for user:", userIdToSync);

    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("username")
        .eq("user_id", userIdToSync)
        .eq("group_id", DEFAULT_GROUP_ID)
        .single();

      if (error && error.code !== "PGRST116") {
        console.warn("[Home] Error fetching username from Supabase:", error);
        return;
      }

      if (data?.username) {
        setUsername(data.username);
        console.log("[Home] Synced username from Supabase:", data.username);
      } else {
        console.log("[Home] No username found in Supabase for user");
        setUsername(null);
      }
    } catch (e) {
      console.error("[Home] Error syncing username from Supabase:", e);
      setUsername(null);
    }
  }, []);

  /**
   * Initialize user in Supabase (check if exists, insert if not)
   * Then sync username from Supabase
   */
  const initializeUserInSupabase = useCallback(async (userId: string) => {
    if (!userId) {
      console.log("[Home] Skipping initializeUserInSupabase - no userId");
      return;
    }

    console.log("[Home] Checking for existing group_members entry for user:", userId);

    try {
      // Only check whether a group_members row exists for this user.
      // Do NOT create new entries here — OnboardingModal will create the
      // row when the user sets a username.
      const { data, error } = await supabase
        .from("group_members")
        .select("username")
        .eq("user_id", userId)
        .eq("group_id", DEFAULT_GROUP_ID)
        .limit(1)
        .single();

      if (error) {
        // If the row doesn't exist `error` may be returned; just log and return
        console.log("[Home] No existing group_members row found (or error):", error?.message ?? error);
        return;
      }

      if (data?.username) {
        console.log("[Home] Existing group_members found, syncing username");
        setUsername(data.username);
      } else {
        console.log("[Home] Existing group_members has no username; not creating one here");
      }
    } catch (e) {
      console.error("[Home] Error checking group_members in Supabase:", e);
    }
  }, [setUsername]);

  /**
   * Upsert current user to Supabase group members (with debouncing)
   * Only updates username if a valid (non-null) username exists to prevent
   * overwriting existing usernames in the database with null values
   */
  const upsertCurrentUserToSupabase = useCallback(async (userScore: number, userBadges: string[], userUsername: string | null) => {
    if (!userId) {
      console.warn("[Home] Cannot upsert user: userId is missing");
      return;
    }

    // Only upsert when a valid username is present. Prevent anonymous/empty
    // username rows from being created by skipping the upsert entirely.
    if (userUsername === null) {
      console.log("[Home] Skipping upsert because userUsername is null");
      return;
    }

    console.log("[Home] Upserting user to Supabase - score:", userScore, "badges:", userBadges, "username:", userUsername);

    try {
      const upsertPayload: any = {
        user_id: userId,
        group_id: DEFAULT_GROUP_ID,
        username: userUsername,
        score: userScore,
        badges: userBadges,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("group_members")
        .upsert(upsertPayload, {
          onConflict: "user_id,group_id",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error("[Home] Error upserting user to Supabase:", error);
        console.error("[Home] User data:", { userId, groupId: DEFAULT_GROUP_ID, username: userUsername, score: userScore });
      } else {
        console.log("[Home] User upserting successful");
      }
    } catch (e) {
      console.error("[Home] Error upserting user to Supabase:", e);
    }
  }, [userId]);

  /**
   * Fetch group members from Supabase
   */
  const fetchGroupMembersFromSupabase = useCallback(async () => {
    if (!userId) {
      console.warn("[Home] Cannot fetch group members: userId is missing");
      return;
    }

    console.log("[Home] Fetching group members from Supabase");

    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", DEFAULT_GROUP_ID)
        .order("score", { ascending: false });

      if (error) {
        console.error("[Home] Error fetching group members:", error);
        return;
      }

      if (data) {
        console.log("[Home] Fetched", data.length, 'group members from Supabase');
        const members: MemberRanking[] = data.map((member: GroupMember) => ({
          userId: member.user_id,
          name: member.username || (member.user_id === userId ? "You" : "Anonymous Fighter"),
          score: member.score || 0,
          badges: member.badges || [],
          isCurrentUser: member.user_id === userId,
        }));
        setGroupMembers(members);
      } else {
        console.warn("[Home] No group members data returned from Supabase");
      }
    } catch (e) {
      console.error("[Home] Error fetching group members:", e);
    }
  }, [userId]);

  // Initialize user in Supabase and fetch group members on auth (wait for auth)
  useEffect(() => {
    if (!userId || authLoading) {
      console.log("[Home] useEffect - initialize user - skipping, userId:", userId, "authLoading:", authLoading);
      return;
    }

    console.log("[Home] useEffect - initialize user triggered for:", userId);

    // Ensure user is initialized in Supabase and username is synced
    const initializeAndFetch = async () => {
      await initializeUserInSupabase(userId);
      // Small delay to ensure initialization completes
      setTimeout(() => {
        fetchGroupMembersFromSupabase();
      }, 100);
    };

    initializeAndFetch();
  }, [userId, authLoading, initializeUserInSupabase, fetchGroupMembersFromSupabase]);

  /**
   * Derive avatar from sessions (pure function, no side effects)
   * Supabase sessions are the single source of truth
   */
  /**
   * Calculate avatar level from points
   */
  const calculateLevelFromPoints = (points: number): Avatar["level"] => {
    if (points >= LEVEL_THRESHOLDS.Elite.min) return "Elite";
    if (points >= LEVEL_THRESHOLDS.Seasoned.min) return "Seasoned";
    if (points >= LEVEL_THRESHOLDS.Intermediate.min) return "Intermediate";
    return "Novice";
  };

  /**
   * Calculate progress within level (single rounding to 25% steps)
   */
  const calculateProgressInLevel = (points: number, level: Avatar["level"]): number => {
    const threshold = LEVEL_THRESHOLDS[level];
    const range = threshold.max - threshold.min;

    if (range === Infinity || level === "Elite") {
      return points >= threshold.min ? 100 : 0;
    }

    const pointsInLevel = Math.max(0, points - threshold.min);
    const rawProgress = Math.min(100, (pointsInLevel / range) * 100);
    return Math.round(rawProgress / 25) * 25;
  };

  /**
   * Date helpers
   */
  const normalizeDateToISO = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const [year, month, day] = dateString.split("-");
      if (year && month && day && year.length === 4 && month.length === 2 && day.length === 2) {
        return dateString;
      }
      const date = new Date(dateString + "T00:00:00Z");
      if (isNaN(date.getTime())) return dateString;
      const yearStr = String(date.getUTCFullYear());
      const monthStr = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dayStr = String(date.getUTCDate()).padStart(2, "0");
      return `${yearStr}-${monthStr}-${dayStr}`;
    } catch (e) {
      return dateString;
    }
  };

  const parseDateUTC = (dateString: string): Date => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };

  /**
   * Calculate weekly diversity bonus using UTC dates
   */
  const calculateWeeklyDiversityBonus = (
    existingSessions: DbSession[],
    newSession: Omit<DbSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): number => {
    const sessionDate = parseDateUTC(newSession.date);
    const weekStart = new Date(Date.UTC(
      sessionDate.getUTCFullYear(),
      sessionDate.getUTCMonth(),
      sessionDate.getUTCDate() - sessionDate.getUTCDay()
    ));
    weekStart.setUTCHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

    const weekSessions = [
      ...existingSessions.filter((s) => {
        const sDate = parseDateUTC(s.date);
        return sDate >= weekStart && sDate < weekEnd;
      }),
      { ...newSession, date: newSession.date } as DbSession,
    ];

    const uniqueTypes = new Set(weekSessions.map((s) => s.type));
    const uniqueTypeCount = uniqueTypes.size;

    if (uniqueTypeCount <= 1) return 0;
    const extraTypes = uniqueTypeCount - 1;
    return Math.min(extraTypes * 0.5, 1.5);
  };

  /**
   * Calculate points for a session
   */
  const calculateSessionPoints = (classLevel: string, diversityBonus: number): number => {
    const basePoints = 1.0;
    const multiplier = CLASS_LEVEL_MULTIPLIERS[classLevel] || 1.0;
    return basePoints * multiplier + diversityBonus;
  };

  const deriveAvatarFromSessions = (allSessions: DbSession[]): Avatar => {
    const totalPoints = allSessions.reduce((sum, s) => sum + (s.points || 0), 0);
    const newLevel = calculateLevelFromPoints(totalPoints);
    const progress = calculateProgressInLevel(totalPoints, newLevel);
    return {
      level: newLevel,
      progress,
      cumulativePoints: totalPoints,
    };
  };

  /**
   * Calculate badges from session types
   */
  const calculateBadgesFromSessions = useCallback((allSessions: DbSession[]): string[] => {
    console.log("[Home] Calculating badges from", allSessions.length, "sessions");
    
    const badges: string[] = [];
    const typeCounts: Record<string, number> = {};

    allSessions.forEach((session) => {
      typeCounts[session.type] = (typeCounts[session.type] || 0) + 1;
    });

    const uniqueTypes = Object.keys(typeCounts).length;
    const totalSessions = allSessions.length;

    console.log("[Home] Badge calculation - uniqueTypes:", uniqueTypes, "totalSessions:", totalSessions, "typeCounts:", typeCounts);

    if (uniqueTypes >= 5 && totalSessions >= 10) {
      badges.push("Most Balanced");
    }

    const strikingTypes = ["Boxing", "Muay Thai", "K1", "MMA"];
    const grapplingTypes = ["BJJ", "Wrestling", "Judo", "Takedowns"];
    
    const strikingCount = strikingTypes.reduce((sum, type) => sum + (typeCounts[type] || 0), 0);
    const grapplingCount = grapplingTypes.reduce((sum, type) => sum + (typeCounts[type] || 0), 0);

    if (strikingCount >= 5 && strikingCount > grapplingCount) {
      badges.push("Best Striker");
    }

    if (grapplingCount >= 5 && grapplingCount > strikingCount) {
      badges.push("Best Grappler");
    }

    if (typeCounts["Wrestling"] >= 3) {
      badges.push("Best Wrestler");
    }

    console.log("[Home] Calculated badges:", badges);
    return badges;
  }, []);

  // Derive avatar from sessions using pure function (single source of truth: Supabase)
  const avatar = useMemo(() => {
    console.log("[Home] useMemo - deriving avatar from", sessions.length, 'sessions');
    return deriveAvatarFromSessions(sessions);
  }, [sessions]);

  // Memoize current user badges and score (derived from sessions)
  const currentUserBadges = useMemo(() => calculateBadgesFromSessions(sessions), [sessions, calculateBadgesFromSessions]);
  const currentUserScore = useMemo(() => avatar.cumulativePoints || 0, [avatar.cumulativePoints]);

  // Detect level-ups and announce via system message
  useEffect(() => {
    if (!userId || sessions.length === 0) return;

    // Only track level changes after initial render
    if (prevAvatarLevelRef.current !== undefined && prevAvatarLevelRef.current !== avatar.level) {
      console.log("[Home] User leveled up from", prevAvatarLevelRef.current, "to", avatar.level);
      const displayName = username || "Anonymous";
      const content = `${displayName} leveled up to ${avatar.level} 🎉`;
      
      // Track analytics
      analytics.avatarLevelUp(avatar.level, avatar.cumulativePoints);
      
      // Fire-and-forget; best-effort system message insert
      supabase
        .from("shoutbox_messages")
        .insert({ user_id: userId, type: "system", content })
        .then(({ error }) => {
          if (error) console.error("[Home] Error inserting level-up system message:", error);
          else console.log("[Home] Level-up system message inserted successfully");
        });
    }
    
    prevAvatarLevelRef.current = avatar.level;
  }, [avatar.level, avatar.cumulativePoints, userId, username]);

  // Debounce timer for Supabase writes
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track message count and initialization state
  const lastMessageCountRef = useRef<number>(0);
  const lastMessageInitializedRef = useRef<boolean>(false);

  // Track previous avatar level for level-up detection
  const prevAvatarLevelRef = useRef<Avatar["level"] | undefined>(undefined);

  // Subscribe to shoutbox messages for unread count tracking (works even when chat is closed)
  useEffect(() => {
    console.log("[Home] Setting up shoutbox message subscription");
    
    // Create subscription to track new messages
    const subscription = supabase
      .channel("shoutbox-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shoutbox_messages",
        },
        (payload) => {
          console.log("[Home] New message received:", payload);
          
          // When a new message arrives
          lastMessageCountRef.current += 1;
          lastMessageInitializedRef.current = true;

          // Only increment unread count if chat is closed
          if (!isChatOpen) {
            console.log("[Home] Chat is closed, incrementing unread count");
            setUnreadCount((prev) => prev + 1);
          } else {
            console.log("[Home] Chat is open, not incrementing unread count");
          }
        }
      )
      .subscribe();

    return () => {
      console.log("[Home] Unsubscribing from shoutbox messages");
      subscription.unsubscribe();
    };
  }, [isChatOpen]);

  // Reset unread count and sync baseline when chat opens
  useEffect(() => {
    if (isChatOpen) {
      console.log("[Home] Chat opened, resetting unread count");
      setUnreadCount(0);
      // Baseline is synced via the Shoutbox component when it mounts
    } else {
      console.log("[Home] Chat closed");
    }
  }, [isChatOpen]);

  // Upsert current user to Supabase when score/badges change (debounced)
  useEffect(() => {
    if (!userId) {
      console.log("[Home] useEffect - upsert user - skipping, no userId");
      return;
    }

    console.log("[Home] useEffect - upsert user triggered - score:", currentUserScore, "badges:", currentUserBadges);

    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Debounce Supabase writes (500ms delay)
    syncTimeoutRef.current = setTimeout(async () => {
      console.log("[Home] Debounce timeout fired - executing upsert");
      await upsertCurrentUserToSupabase(currentUserScore, currentUserBadges, username);
      // Refresh group members after upsert
      fetchGroupMembersFromSupabase();
    }, 500);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [userId, username, currentUserScore, currentUserBadges, upsertCurrentUserToSupabase, fetchGroupMembersFromSupabase]);

  

  

  /**
   * Add a new training session to Supabase
   */
  const addSession = async (session: Omit<DbSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) {
      console.error("[Home] Cannot add session: userId is missing");
      return;
    }

    console.log("[Home] Adding session:", session);

    const diversityBonus = calculateWeeklyDiversityBonus(sessions, session);
    const sessionPoints = calculateSessionPoints(session.level, diversityBonus);

    console.log("[Home] Calculated diversity bonus:", diversityBonus, "session points:", sessionPoints);

    const newSession = {
      user_id: userId,
      ...session,
      points: sessionPoints,
    };

    try {
      // Insert to Supabase
      const { data, error } = await supabase
        .from('sessions')
        .insert(newSession)
        .select()
        .single();

      if (error) {
        console.error('[Home] Error adding session:', error);
        alert('Failed to save session. Please try again.');
        return;
      }

      console.log('[Home] Session added successfully:', data.id);

      // Update local state
      setSessions((prev) => [data, ...prev]);

      // Track analytics
      analytics.sessionLogged(session.type, session.level, sessionPoints);

      // Insert system message announcing the session log
      if (userId) {
        const displayName = username || "Anonymous";
        const content = `${displayName} logged ${session.type} (${session.level}) 🥋`;
        console.log("[Home] Inserting system message:", content);
        supabase
          .from("shoutbox_messages")
          .insert({ user_id: userId, type: "system", content })
          .then(({ error }) => {
            if (error) console.error("[Home] Error inserting session system message:", error);
            else console.log("[Home] System message inserted successfully");
          });
      }
    } catch (err) {
      console.error('[Home] Failed to add session:', err);
      alert('Failed to save session. Please try again.');
    }
  };

  /**
   * Delete a session from Supabase
   */
  const deleteSession = async (sessionId: string) => {
    console.log("[Home] Deleting session:", sessionId);

    if (!confirm("Are you sure you want to delete this session?")) {
      console.log("[Home] Delete cancelled by user");
      return;
    }

    const sessionToDelete = sessions.find(s => s.id === sessionId);

    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('[Home] Error deleting session:', error);
        alert('Failed to delete session. Please try again.');
        return;
      }

      console.log('[Home] Session deleted successfully');

      // Update local state
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      // Track analytics
      if (sessionToDelete) {
        console.log("[Home] Tracking session deletion analytics for:", sessionToDelete.type);
        analytics.sessionDeleted(sessionToDelete.type);
      }
    } catch (err) {
      console.error('[Home] Failed to delete session:', err);
      alert('Failed to delete session. Please try again.');
    }
  };

  /**
   * Handle onboarding completion
   * Username is already persisted in OnboardingModal, just update local state
   */
  const handleOnboardingComplete = useCallback((newUsername: string) => {
    console.log("[Home] Onboarding completed with username:", newUsername);
    
    // Update local state
    setUsername(newUsername);
    
    // Refresh group members after username update
    setTimeout(() => {
      fetchGroupMembersFromSupabase();
    }, 200);
  }, [fetchGroupMembersFromSupabase]);

  // Components
  const RequiresUsernameGate = ({ children }: { children: React.ReactNode }) => {
    if (!username) {
      return (
        <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-black dark:via-purple-950 dark:to-black">
          <div className="max-w-4xl mx-auto mt-20">
            <div className="text-center">
              <div className="mb-6">
                <svg className="w-16 h-16 mx-auto text-yellow-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Username Required
              </h2>
              <p className="text-white/70 mb-8 text-sm sm:text-base">
                Set your username in the onboarding modal to unlock this feature
              </p>
              <button
                onClick={() => setPage("home")}
                className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <>{children}</>;
  };

  const Header = () => {
    return (
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          <div
            onClick={() => setPage("home")}
            className="flex items-center gap-3 cursor-pointer text-white font-bold hover:text-blue-400 transition-colors duration-150"
            aria-label="Go home"
            role="button"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M13 5v6h6" />
            </svg>
            <span>FightMate</span>
          </div>

          <div>
            {page !== "home" && (
              <button
                onClick={() => setPage("home")}
                className="text-white/80 hover:text-white bg-white/0 px-3 py-1 rounded-md border border-white/10"
                aria-label="Back to home"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </header>
    );
  };

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

    // avatar always initialized with a default value so HomePage can render immediately

    return (
      <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-black dark:via-purple-950 dark:to-black">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center mb-12 mt-8 sm:mt-16">
            <div className="relative mb-8">
              <div className="relative w-48 h-64 sm:w-56 sm:h-72 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
                <AvatarImage
                  level={avatar.level}
                  size="xl"
                  showGlow={false}
                  fullImage={true}
                  className="w-full h-full"
                />
              </div>

              <div className={`absolute -bottom-3 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r ${getLevelColor(avatar.level)} text-white text-xs font-bold shadow-lg border-2 border-white/30 whitespace-nowrap z-10`}>
                {avatar.level} Fighter
              </div>
            </div>

            <div className="flex gap-6 mt-8 text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 hover:bg-white/15 transition-colors duration-200">
                <div className="text-2xl font-bold text-white">{sessions.length}</div>
                <div className="text-xs text-white/70 uppercase tracking-wide">Sessions</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 hover:bg-white/15 transition-colors duration-200">
                <div className="text-2xl font-bold text-white">{avatar.level}</div>
                <div className="text-xs text-white/70 uppercase tracking-wide">Level</div>
              </div>
            </div>

            <div className="w-full max-w-xs mt-6">
              <div className="flex justify-between text-xs text-white/80 mb-2">
                <span>Level Progress</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden border border-white/20 backdrop-blur-sm shadow-inner">
                <div
                  className={`h-full bg-gradient-to-r ${getLevelColor(avatar.level)} transition-all duration-700 ease-out rounded-full shadow-lg`}
                  style={{ width: `${avatar.progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <button
              onClick={() => setPage("log")}
              className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold py-6 px-6 rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50 border-2 border-white/20 backdrop-blur-sm"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
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
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
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
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
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
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!date) {
        alert("Please select a date");
        return;
      }
      
      setIsSubmitting(true);
      const normalizedDate = normalizeDateToISO(date);
      await addSession({ 
        date: normalizedDate, 
        type, 
        level,
        group_id: DEFAULT_GROUP_ID,
        points: 0, // Will be calculated
      });
      setDate("");
      setType(SESSION_TYPES[0]);
      setLevel(CLASS_LEVELS[0]);
      setIsSubmitting(false);
      setPage("history");
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const normalized = normalizeDateToISO(inputValue);
      setDate(normalized);
    };

    return (
      <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 dark:from-black dark:via-blue-950 dark:to-black">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8 mt-8 sm:mt-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">
              Log Training Session
            </h2>
            <p className="text-white/70 text-sm sm:text-base">
              Track your progress and level up your fighter avatar
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="date" className="block text-white font-semibold mb-2 text-sm sm:text-base">
                  Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="date"
                    value={date}
                    onChange={handleDateChange}
                    required
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm text-sm sm:text-base"
                    style={{ colorScheme: "dark" }}
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="session-type" className="block text-white font-semibold mb-2 text-sm sm:text-base">
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
                      <option key={sessionType} value={sessionType} className="bg-slate-800 text-white">
                        {sessionType}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="class-level" className="block text-white font-semibold mb-2 text-sm sm:text-base">
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
                      <option key={classLevel} value={classLevel} className="bg-slate-800 text-white">
                        {classLevel}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/50 border-2 border-white/20 backdrop-blur-sm"
                >
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
                  <div className="relative flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-lg">{isSubmitting ? "Saving..." : "Log Session"}</span>
                  </div>
                </button>
              </div>
            </form>
          </div>

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
      const normalizedDate = normalizeDateToISO(dateString);
      const date = parseDateUTC(normalizedDate);
      if (isNaN(date.getTime())) {
        return dateString;
      }
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

          {sessions.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-12 text-center">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-white/60 text-lg font-medium">No sessions logged yet.</p>
              <p className="text-white/40 text-sm mt-2">Start tracking your training by logging your first session!</p>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-6 py-4 bg-white/5 border-b border-white/10">
                <div className="col-span-4 text-white/70 font-semibold text-sm uppercase tracking-wide">Date</div>
                <div className="col-span-5 text-white/70 font-semibold text-sm uppercase tracking-wide">Session Type</div>
                <div className="col-span-3 text-white/70 font-semibold text-sm uppercase tracking-wide">Class Level</div>
              </div>

              <div className="divide-y divide-white/10">
                {sessions.map((session, index) => (
                  <div
                    key={session.id}
                    className={`px-4 sm:px-6 py-4 sm:py-5 transition-all duration-200 hover:bg-white/10 hover:shadow-md cursor-default rounded-lg ${
                      index % 2 === 0 ? "bg-white/5" : "bg-white/[0.02]"
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                      <div className="col-span-1 sm:col-span-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-white font-medium text-sm sm:text-base">{formatDate(session.date)}</div>
                            <div className="text-white/50 text-xs sm:hidden">{session.date}</div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-1 sm:col-span-5">
                        <div className="flex items-center gap-3">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${getSessionTypeColor(session.type)} flex items-center justify-center shadow-lg`}>
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium text-sm sm:text-base truncate">{session.type}</div>
                            <div className="text-white/50 text-xs sm:hidden">{session.level}</div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-1 sm:col-span-3">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20 backdrop-blur-sm">
                            {session.level}
                          </span>
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="ml-2 p-2 text-white/60 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors duration-200"
                            aria-label="Delete session"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
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

  const AvatarEvolutionPage = () => {
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

    const getNextLevel = (currentLevel: Avatar["level"]): string => {
      const currentIndex = AVATAR_LEVELS.indexOf(currentLevel);
      if (currentIndex < AVATAR_LEVELS.length - 1) {
        return AVATAR_LEVELS[currentIndex + 1];
      }
      return "Max Level";
    };

    const getProgressText = (progress: number): string => {
      switch (progress) {
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

    const currentLevel = avatar.level;
    const progress = avatar.progress;
    const progressText = getProgressText(progress);
    const nextLevel = getNextLevel(currentLevel);

    return (
      <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 bg-gradient-to-br from-slate-900 via-yellow-900 to-slate-900 dark:from-black dark:via-yellow-950 dark:to-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 mt-8 sm:mt-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">Avatar Evolution</h2>
            <p className="text-white/70 text-sm sm:text-base">Track your progress and unlock new levels</p>
          </div>

          {/* All Four Avatars Grid - Fixed 3:4 Aspect Ratio */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-4 sm:p-8 md:p-10 mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
              {AVATAR_LEVELS.map((level) => {
                const isCurrentLevel = level === currentLevel;
                const isUnlocked = avatar.cumulativePoints >= LEVEL_THRESHOLDS[level].min;

                return (
                  <div
                    key={level}
                    className={`flex flex-col items-center transition-all duration-300 ${
                      isCurrentLevel ? "transform scale-105" : "hover:scale-102"
                    }`}
                  >
                    {/* Container with Fixed 3:4 Aspect Ratio - Mobile Safe */}
                    <div className="relative mb-3 sm:mb-4 w-full max-w-[140px] sm:max-w-none max-h-[200px] sm:max-h-none flex justify-center items-center">
                      <div
                        className={`w-full h-full rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${
                          isCurrentLevel
                            ? `ring-2 sm:ring-3 ring-offset-2 ring-offset-slate-900/50 ${
                                level === "Novice"
                                  ? "ring-gray-400"
                                  : level === "Intermediate"
                                  ? "ring-green-400"
                                  : level === "Seasoned"
                                  ? "ring-blue-400"
                                  : "ring-purple-400"
                              }`
                            : isUnlocked
                            ? "ring-1 sm:ring-2 ring-white/20"
                            : "ring-1 sm:ring-2 ring-white/10 opacity-50"
                        }`}
                      >
                        <AvatarImage
                          level={level}
                          size="lg"
                          showGlow={false}
                          fullImage={true}
                          className={`w-full h-full ${!isUnlocked ? "opacity-40 grayscale" : ""}`}
                        />
                      </div>
                    </div>

                    {/* Level Name */}
                    <div className="text-center mt-1 sm:mt-2 w-full">
                      <p
                        className={`font-semibold text-xs sm:text-base md:text-lg transition-colors duration-300 ${
                          isCurrentLevel ? "text-white" : isUnlocked ? "text-white/80" : "text-white/40"
                        }`}
                      >
                        {level}
                      </p>
                      {isCurrentLevel && (
                        <p className="text-xs text-white/60 mt-1 font-medium">Current</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Level Progress Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-6 sm:p-10">
            <div className="text-center mb-6">
              <div className="inline-block mb-4">
                <div className={`relative px-6 py-3 rounded-2xl bg-gradient-to-r ${getLevelColor(currentLevel)} shadow-lg border-2 border-white/30`}>
                  <div className="absolute inset-0 bg-white/10 rounded-2xl" />
                  <span className="relative text-white text-xl sm:text-2xl font-bold uppercase tracking-wide">
                    {currentLevel} Fighter
                  </span>
                </div>
              </div>
              {nextLevel !== "Max Level" && (
                <p className="text-white/60 text-sm sm:text-base">Progress to {nextLevel}</p>
              )}
            </div>

            <div className="mb-6">
              <div className="text-center mb-4">
                <p className="text-white font-semibold text-lg sm:text-xl">{progressText}</p>
              </div>

              <div className="relative">
                <div className="w-full h-8 sm:h-10 bg-white/10 rounded-full overflow-hidden border border-white/20 shadow-inner backdrop-blur-sm">
                  <div
                    className={`h-full bg-gradient-to-r ${getLevelColor(currentLevel)} transition-all duration-700 ease-out rounded-full shadow-lg relative overflow-hidden`}
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-colors duration-200">
              <p className="text-white/60 text-xs sm:text-sm text-center">
                💡 Each training session earns progress. Train different types weekly for bonus points!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const GroupRankingPage = () => {
    // Memoize sorted members to avoid recalculation during render
    const sortedMembers = useMemo(() => {
      // IMPORTANT: At render time, we intentionally override the current user's data with
      // locally-derived values (score, badges). This gives instant UI feedback while
      // Supabase is updated asynchronously. Supabase is the persisted source of truth.
      const updatedMembers = groupMembers.map((member) => {
        if (member.userId === userId) {
          return {
            ...member,
            score: currentUserScore,
            badges: currentUserBadges,
            isCurrentUser: true,
            name: username || "You",
          };
        }
        return member;
      });

      // Ensure current user exists if not in list (edge case)
      const userExists = updatedMembers.some((m) => m.userId === userId);
      if (!userExists && userId) {
        updatedMembers.push({
          userId,
          name: username || "You",
          score: currentUserScore,
          badges: currentUserBadges,
          isCurrentUser: true,
        });
      }

      // Filter out anonymous non-current users
      const filteredMembers = updatedMembers.filter((member) => {
        // Always include current user
        if (member.isCurrentUser) return true;
        // Include members with a valid name
        const hasValidName = member.name && member.name !== "Anonymous Fighter";
        return hasValidName;
      });

      // Sort by score descending
      return [...filteredMembers].sort((a, b) => b.score - a.score);
    }, [groupMembers, userId, currentUserScore, currentUserBadges, username]);

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

    const getRankBadgeColor = (index: number) => {
      switch (index) {
        case 0:
          return "from-yellow-400 to-yellow-600";
        case 1:
          return "from-gray-300 to-gray-500";
        case 2:
          return "from-orange-400 to-orange-600";
        default:
          return "from-blue-400 to-blue-600";
      }
    };

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
          <div className="text-center mb-8 mt-8 sm:mt-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">Group Ranking</h2>
            <p className="text-white/70 text-sm sm:text-base">Compete with your training group</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
            {sortedMembers.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-white/60 text-lg">No members found.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {sortedMembers.map((member, index) => (
                  <div
                    key={member.userId}
                    className={`px-4 sm:px-6 py-5 sm:py-6 transition-all duration-200 hover:bg-white/10 hover:shadow-md cursor-default rounded-lg ${
                      member.isCurrentUser
                        ? "bg-blue-500/20 border-l-4 border-blue-400"
                        : index % 2 === 0
                        ? "bg-white/5"
                        : "bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="flex-shrink-0">
                        <div
                          className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${getRankBadgeColor(index)} flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg border-2 border-white/30`}
                        >
                          {getRankIcon(index)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                          <div className="flex-1">
                            <h3 className={`font-bold text-lg sm:text-xl mb-1 truncate ${member.isCurrentUser ? "text-blue-300" : "text-white"}`}>
                              {member.name}
                              {member.isCurrentUser && (
                                <span className="ml-2 text-xs bg-blue-500/30 px-2 py-0.5 rounded-full">You</span>
                              )}
                            </h3>
                              <div className="flex items-center gap-2">
                              <span className="text-white/70 text-sm sm:text-base">{member.score.toFixed(1)} points</span>
                            </div>
                          </div>

                          {member.badges.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {member.badges.map((badge) => (
                                <span
                                  key={badge}
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-md border border-yellow-300/50 hover:shadow-lg hover:scale-105 transition-all duration-200"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
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

          <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center hover:bg-white/10 transition-colors duration-200">
            <p className="text-white/60 text-xs sm:text-sm">Rankings are based on training activity. Earn badges for your achievements!</p>
          </div>
        </div>
      </div>
    );
  };

  // Shoutbox component moved to app/components/Shoutbox.tsx

  // LoginScreen moved to app/components/LoginScreen.tsx

  return (
    <AuthGate userId={userId} setUserId={setUserId} authLoading={authLoading} setAuthLoading={setAuthLoading}>
      <>
        <Header />
        <MigrationBanner
          migrationNeeded={migrationNeeded}
          migrating={migrating}
          migrationResult={migrationResult}
          onMigrate={migrate}
          onDismiss={dismiss}
        />
        <OnboardingModal 
          userId={userId}
          hasUsername={!!username}
          onOnboardingComplete={handleOnboardingComplete} 
        />
        <ChatFAB
          unreadCount={unreadCount}
          onClick={() => setIsChatOpen((v) => !v)}
        />
        {(() => {
          switch (page) {
            case "home":
              return <HomePage />;
            case "log":
              return <RequiresUsernameGate><LogSession /></RequiresUsernameGate>;
            case "history":
              return <RequiresUsernameGate><HistoryPage /></RequiresUsernameGate>;
            case "avatar":
              return <RequiresUsernameGate><AvatarEvolutionPage /></RequiresUsernameGate>;
            case "ranking":
              return <RequiresUsernameGate><GroupRankingPage /></RequiresUsernameGate>;
            default:
              return <HomePage />;
          }
        })()}
        {/* Chat overlay — Shoutbox is reused and only mounted when open */}
        {isChatOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setIsChatOpen(false)} />

            <div className="relative w-full sm:w-[420px] max-h-[80vh] m-4 sm:m-6 bg-slate-900/95 rounded-t-xl sm:rounded-xl shadow-2xl border border-white/10 overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between p-3 border-b border-white/10">
                <h3 className="text-white font-bold">Chat</h3>
                <button
                  onClick={() => setIsChatOpen(false)}
                  aria-label="Close chat"
                  className="text-white/80 hover:text-white px-2 py-1 rounded-md"
                >
                  ✕
                </button>
              </div>

              <div className="h-[64vh] overflow-auto">
                <Shoutbox
                  userId={userId}
                  username={username}
                  onNewMessages={(messages) => {
                    // Sync baseline when Shoutbox loads (chat is open)
                    if (isChatOpen) {
                      lastMessageCountRef.current = messages.length;
                      lastMessageInitializedRef.current = true;
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </>
    </AuthGate>
  );
}
