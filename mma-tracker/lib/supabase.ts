import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables not set. Group ranking features will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database table interface
export interface GroupMember {
  user_id: string;
  group_id: string;
  username: string | null;
  score: number;
  badges: string[];
  updated_at?: string;
}
