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

  async track(eventName: string, properties?: Record<string, any>) {
    try {
      await supabase.from('analytics_events').insert({
        user_id: this.userId,
        event_name: eventName,
        event_properties: properties || {},
        page: this.currentPage,
      });
    } catch (error) {
      // Fail silently - don't block user experience
      console.warn('Analytics tracking failed:', error);
    }
  }

  // Convenience methods
  pageView(pageName: string) {
    this.track('page_view', { page: pageName });
  }

  sessionLogged(sessionType: string, classLevel: string, points: number) {
    this.track('session_logged', { 
      session_type: sessionType, 
      class_level: classLevel,
      points 
    });
  }

  sessionDeleted(sessionType: string) {
    this.track('session_deleted', { session_type: sessionType });
  }

  avatarLevelUp(newLevel: string, totalPoints: number) {
    this.track('avatar_level_up', { 
      new_level: newLevel,
      total_points: totalPoints 
    });
  }

  messagesSent(messageCount: number = 1) {
    this.track('chat_message_sent', { count: messageCount });
  }

  usernameSet(username: string) {
    this.track('username_set', { username_length: username.length });
  }
}

export const analytics = new Analytics();
