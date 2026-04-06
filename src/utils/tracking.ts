import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

export type VisitorType = 'registered' | 'trial' | 'general' | 'sandbox';
export type EventType = 'page_view' | 'click' | 'feature_action' | 'form_submission' | 'error';

interface TrackingEvent {
  type: EventType;
  name: string;
  metadata?: any;
  timestamp: string;
}

class TrackingManager {
  private static instance: TrackingManager;
  private sessionId: string | null = null;
  private visitorId: string | null = null;
  private fingerprint: string | null = null;
  private currentUserId: string | null = null;
  private eventQueue: TrackingEvent[] = [];
  private batchInterval: number = 30000; // 30 seconds
  private lastActivity: number = Date.now();
  private inactivityTimeout: number = 30 * 60 * 1000; // 30 minutes
  private intervalId: any = null;
  private fpPromise: Promise<string> | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.sessionId = localStorage.getItem('tracking_session_id');
      this.visitorId = localStorage.getItem('tracking_visitor_id');
      this.fpPromise = this.initFingerprint();
      this.setupListeners();
      this.startBatchInterval();
    }
  }

  public static getInstance(): TrackingManager {
    if (!TrackingManager.instance) {
      TrackingManager.instance = new TrackingManager();
    }
    return TrackingManager.instance;
  }

  private async initFingerprint(): Promise<string> {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      this.fingerprint = result.visitorId;
      return result.visitorId;
    } catch (err) {
      console.error('Failed to initialize fingerprinting:', err);
      this.fingerprint = 'anonymous-' + Math.random().toString(36).substr(2, 9);
      return this.fingerprint;
    }
  }

  private setupListeners() {
    window.addEventListener('beforeunload', () => this.flushEvents(true));
    window.addEventListener('mousedown', () => this.updateActivity());
    window.addEventListener('keydown', () => this.updateActivity());
    window.addEventListener('scroll', () => this.updateActivity());
    window.addEventListener('click', (e) => this.handleClick(e));
  }

  private handleClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target) return;

    // Capture meaningful elements
    const interactive = target.closest('button, a, input, select, [role="button"]');
    if (interactive) {
      const el = interactive as HTMLElement;
      this.trackEvent('click', 'click_element', {
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        text: el.innerText?.slice(0, 50).trim() || undefined,
        role: el.getAttribute('role') || undefined,
        type: (el as any).type || undefined,
        name: (el as any).name || undefined,
      });
    }
  }

  private updateActivity() {
    this.lastActivity = Date.now();
  }

  private startBatchInterval() {
    this.intervalId = setInterval(() => {
      this.flushEvents();
      this.checkInactivity();
    }, this.batchInterval);
  }

  private checkInactivity() {
    if (Date.now() - this.lastActivity > this.inactivityTimeout && this.sessionId) {
      this.endSession();
    }
  }

  public async startSession(user?: { id: string; role: string }) {
    // If user has changed (e.g. login/logout), end current session and start new one
    if (this.sessionId && this.currentUserId !== (user?.id || null)) {
      await this.endSession();
    }

    if (this.sessionId) return;

    this.currentUserId = user?.id || null;

    let visitorType: VisitorType = 'general';
    if (user) {
      visitorType = 'registered';
    } else if (localStorage.getItem('is_sandbox') === 'true') {
      visitorType = 'sandbox';
    } else if (localStorage.getItem('is_trial') === 'true') {
      visitorType = 'trial';
    }

    if (!this.fingerprint && this.fpPromise) {
      // Don't wait forever, timeout after 2 seconds
      await Promise.race([
        this.fpPromise,
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
    }

    try {
      const { data, error } = await supabase.functions.invoke('visitor-tracking', {
        body: {
          action: 'create-session',
          payload: {
            visitor_type: visitorType,
            user_id: user?.id,
            fingerprint_id: this.fingerprint || 'unknown',
            entry_page: window.location.pathname,
          },
        },
      });

      if (error) {
        logger.error('Edge function error starting tracking session', error, {
          errorType: 'runtime',
          component: 'TrackingManager',
          action: 'create-session'
        });
        return;
      }

      if (data?.success) {
        this.sessionId = data.sessionId;
        this.visitorId = data.visitorId;
        localStorage.setItem('tracking_session_id', this.sessionId!);
        localStorage.setItem('tracking_visitor_id', this.visitorId!);
      } else {
        logger.error('Failed to start tracking session: response unsuccessful', data?.error || 'Unknown error', {
          errorType: 'runtime',
          component: 'TrackingManager',
          action: 'create-session'
        });
      }
    } catch (err) {
      logger.error('Exception starting tracking session', err, {
        errorType: 'runtime',
        component: 'TrackingManager',
        action: 'create-session'
      });
    }
  }

  public trackEvent(type: EventType, name: string, metadata?: any) {
    const event: TrackingEvent = {
      type,
      name,
      metadata: {
        ...metadata,
        url: window.location.href,
        path: window.location.pathname,
      },
      timestamp: new Date().toISOString(),
    };

    this.eventQueue.push(event);
    if (this.eventQueue.length >= 10) {
      this.flushEvents();
    }
  }

  public async flushEvents(isSync = false) {
    if (this.eventQueue.length === 0 || !this.sessionId) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    const body = {
      action: 'log-events',
      payload: { sessionId: this.sessionId, events: eventsToFlush },
    };

    if (isSync) {
        // Use fetch with keepalive for reliability on unload
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/visitor-tracking`;
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify(body),
            keepalive: true
        }).catch(err => console.error('Failed to flush events on unload', err));
    } else {
        try {
            await supabase.functions.invoke('visitor-tracking', { body });
        } catch (err) {
            // Re-queue events if failed
            this.eventQueue = [...eventsToFlush, ...this.eventQueue];
            console.error('Failed to flush events, re-queueing', err);
        }
    }
  }

  public async endSession() {
    if (!this.sessionId) return;

    const sessionIdToEnd = this.sessionId;
    this.sessionId = null;
    this.currentUserId = null;
    localStorage.removeItem('tracking_session_id');
    localStorage.removeItem('tracking_visitor_id');

    try {
      await this.flushEvents();
      await supabase.functions.invoke('visitor-tracking', {
        body: {
          action: 'end-session',
          payload: {
            sessionId: sessionIdToEnd,
            exit_page: window.location.pathname,
          },
        },
      });
    } catch (err) {
      console.error('Failed to end tracking session', err);
    }
  }
}

export const tracking = TrackingManager.getInstance();
