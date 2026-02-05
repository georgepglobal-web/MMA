import React, { useEffect } from "react";
import LoginScreen from "./LoginScreen";
import { supabase } from "../../lib/supabase";

export default function AuthGate({
  userId,
  setUserId,
  authLoading,
  setAuthLoading,
  children,
}: {
  userId: string;
  setUserId: React.Dispatch<React.SetStateAction<string>>;
  authLoading: boolean;
  setAuthLoading: React.Dispatch<React.SetStateAction<boolean>>;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if session already exists
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Error getting session:", sessionError);
        }

        if (session?.user) {
          // Validate session by attempting to fetch the user
          try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
              // If the user no longer exists in auth (deleted), sign them out
              console.warn("User validation failed; signing out:", userError);
              await supabase.auth.signOut();
              setUserId("");
            } else {
              // Session and user are valid
              console.log("Using existing Supabase auth session:", session.user.id);
              setUserId(session.user.id);
            }
          } catch (validationErr) {
            console.error("Error validating user:", validationErr);
            await supabase.auth.signOut();
            setUserId("");
          }
        }
      } catch (e) {
        console.error("Error initializing authentication:", e);
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        setUserId("");
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUserId, setAuthLoading]);

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-black dark:via-purple-950 dark:to-black">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
