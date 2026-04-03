import { rawSupabase as supabase } from "@/integrations/supabase/raw-client";

/**
 * Enhanced Logging Utility for AI Debugger Integration
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type ErrorType = 'runtime' | 'api' | 'database' | 'ui' | 'rls';
type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface LogContext {
  module?: string;
  component?: string;
  action?: string;
  errorType?: ErrorType;
  severity?: Severity;
  statusCode?: number;
  endpoint?: string;
  request?: {
    body?: any;
    query?: any;
  };
  schemaContext?: string;
  payload?: any; // New column for AI context
  [key: string]: unknown;
}

class Logger {
  private static instance: Logger;
  private currentContext: { module?: string; component?: string } = {};

  private constructor() {}

  public setContext(context: { module?: string; component?: string }) {
    this.currentContext = { ...this.currentContext, ...context };
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getDeviceInfo() {
    const ua = navigator.userAgent;
    let type = 'desktop';
    if (/Mobi|Android/i.test(ua)) {
      type = 'mobile';
    } else if (/Tablet|iPad/i.test(ua)) {
      type = 'tablet';
    }

    return {
      type,
      user_agent: ua,
      platform: navigator.platform,
      language: navigator.language,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
  }

  private async persistError(
    message: string,
    error?: any,
    context?: LogContext
  ) {
    try {
      const storedUser = localStorage.getItem('auth_user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      const errorPayload = {
        error_type: context?.errorType || 'runtime',
        message: message,
        stack: error instanceof Error ? error.stack : (typeof error === 'object' ? JSON.stringify(error) : String(error)),
        status_code: context?.statusCode,
        endpoint: context?.endpoint,
        module: context?.module || this.currentContext.module || 'Global',
        component: context?.component || this.currentContext.component || 'Unknown',
        action: context?.action,
        severity: context?.severity || 'medium',
        user_context: {
          id: user?.id,
          name: user?.username,
          role: user?.role,
          centerId: user?.center_id,
        },
        request_context: context?.request || {},
        schema_context: context?.schemaContext,
        payload: context?.payload || {}, // New payload column for AI studio
        device_info: this.getDeviceInfo(),
        timestamp: new Date().toISOString(),
      };

      // Asynchronous insert to Supabase - The trigger will send this to the AI studio
      const { error: insertError } = await supabase
        .from('error_logs')
        .insert(errorPayload);

      if (insertError) {
        console.error("Failed to persist error log to Supabase:", insertError);
      }
    } catch (e) {
      console.error("Error in logger persistence logic:", e);
    }
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  public info(message: string, ...args: any[]) {
    if (import.meta.env.DEV) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  public warn(message: string, ...args: any[]) {
    if (import.meta.env.DEV) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  public async error(message: string, error?: unknown, context?: LogContext) {
    const formattedMessage = this.formatMessage('error', message);

    // Filter sensitive context in production logs
    const safeContext = import.meta.env.DEV ? context : {
      module: context?.module,
      component: context?.component,
      errorType: context?.errorType,
      severity: context?.severity,
    };

    console.error(formattedMessage, {
      error: error instanceof Error ? {
        message: error.message,
        stack: import.meta.env.DEV ? error.stack : undefined,
        ...(import.meta.env.DEV ? (error as any) : {})
      } : (import.meta.env.DEV ? error : 'Sensitive Error Detail Restricted'),
      ...safeContext
    });

    // Persist full error to secure database (admin-only access via RLS)
    return await this.persistError(message, error, context);
  }

  public debug(message: string, ...args: any[]) {
    if (import.meta.env.DEV) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }
}

export const logger = Logger.getInstance();
