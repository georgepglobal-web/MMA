import { supabase } from './supabase';
import type { AnalyticsEvent } from './supabase';

class Analytics {
  private userId: string | null = null;
  private currentPage: string = 'home';

  setUser(userId: string | null) {
    this.userId = userId;
  }

  setPage(page: string) {
    this.currentPage = page;
  }

  private async track(eventName: string, properties?: Record<string, unknown>) {
    try {
      const payload = {
        user_id: this.userId || null,
        event_name: eventName,
        event_properties: properties || {},
        page: this.currentPage,
      };

      console.log('[Analytics] Tracking event:', { eventName, userId: this.userId });

      const { data, error } = await supabase
        .from('analytics_events')
        .insert([payload]);

      if (error) {
        console.error('[Analytics] Insert error:', {
          eventName,
          error: error.message,
          code: error.code,
        });
        return;
      }

      console.log('[Analytics] Event tracked successfully:', eventName);
    } catch (err) {
      console.error('[Analytics] Exception:', err);
    }
  }

  // Convenience methods - fire and forget but non-blocking
  pageView(pageName: string) {
    // Don't await - let it happen in background
    this.track('page_view', { page: pageName }).catch(() => {
      // Silently ignore errors
    });
  }

  sessionLogged(sessionType: string, classLevel: string, points: number) {
    this.track('session_logged', { 
      session_type: sessionType, 
      class_level: classLevel,
      points 
    }).catch(() => {
      // Silently ignore errors
    });
  }

  sessionDeleted(sessionType: string) {
    this.track('session_deleted', { session_type: sessionType }).catch(() => {
      // Silently ignore errors
    });
  }

  avatarLevelUp(newLevel: string, totalPoints: number) {
    this.track('avatar_level_up', { 
      new_level: newLevel,
      total_points: totalPoints 
    }).catch(() => {
      // Silently ignore errors
    });
  }

  messagesSent(messageCount: number = 1) {
    this.track('chat_message_sent', { count: messageCount }).catch(() => {
      // Silently ignore errors
    });
  }

  usernameSet(username: string) {
    this.track('username_set', { username_length: username.length }).catch(() => {
      // Silently ignore errors
    });
  }
}

export const analytics = new Analytics();
