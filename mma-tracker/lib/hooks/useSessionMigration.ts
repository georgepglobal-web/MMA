import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import type { DbSession } from '../supabase';

const MIGRATION_FLAG = 'fightmate-sessions-migrated';
const SESSIONS_KEY = 'fightmate-sessions';

interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errors: string[];
}

export function useSessionMigration(userId: string | null) {
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  // Check if migration is needed
  useEffect(() => {
    if (!userId) return;

    const alreadyMigrated = localStorage.getItem(MIGRATION_FLAG) === 'true';
    const hasLocalSessions = localStorage.getItem(SESSIONS_KEY);

    if (!alreadyMigrated && hasLocalSessions) {
      setMigrationNeeded(true);
    }
  }, [userId]);

  const migrate = useCallback(async () => {
    if (!userId || migrating) return;

    setMigrating(true);
    const errors: string[] = [];
    let migratedCount = 0;

    try {
      // Get localStorage sessions
      const localSessionsStr = localStorage.getItem(SESSIONS_KEY);
      if (!localSessionsStr) {
        setMigrationResult({ success: true, migratedCount: 0, errors: [] });
        localStorage.setItem(MIGRATION_FLAG, 'true');
        setMigrationNeeded(false);
        setMigrating(false);
        return;
      }

      const localSessions = JSON.parse(localSessionsStr) as unknown[];

      type LocalSession = {
        groupId?: string;
        date: string;
        type: string;
        level?: string;
        points?: number;
      };

      // Transform to database format
      const sessionsToInsert = localSessions.map((s) => {
        const item = s as LocalSession;
        return {
          user_id: userId,
          group_id: item.groupId || 'global',
          date: item.date,
          type: item.type,
          level: item.level || 'Unknown',
          points: item.points || 0,
        };
      });

      // Batch insert (Supabase handles duplicates with upsert)
      const { data, error } = await supabase
        .from('sessions')
        .upsert(sessionsToInsert, { 
          onConflict: 'user_id,date,type',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        errors.push(error.message);
      } else {
        migratedCount = data?.length || sessionsToInsert.length;
        
        // Mark migration as complete
        localStorage.setItem(MIGRATION_FLAG, 'true');
        setMigrationNeeded(false);
      }

      setMigrationResult({
        success: errors.length === 0,
        migratedCount,
        errors,
      });
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Unknown error');
      setMigrationResult({
        success: false,
        migratedCount,
        errors,
      });
    } finally {
      setMigrating(false);
    }
  }, [userId, migrating]);

  const dismiss = useCallback(() => {
    localStorage.setItem(MIGRATION_FLAG, 'true');
    setMigrationNeeded(false);
  }, []);

  return {
    migrationNeeded,
    migrating,
    migrationResult,
    migrate,
    dismiss,
  };
}
