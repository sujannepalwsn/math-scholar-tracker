import { rawSupabase as supabase } from "@/integrations/supabase/client";

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

  public info(message: string, context?: LogContext) {
    console.info(this.formatMessage('info', message), context || '');
  }

  public warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message), context || '');
  }

  public async error(message: string, error?: unknown, context?: LogContext) {
    const formattedMessage = this.formatMessage('error', message);

    console.error(formattedMessage, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        ...(error as any)
      } : error,
      ...context
    });

    // Only persist errors to the database
    return await this.persistError(message, error, context);
  }

  public debug(message: string, context?: LogContext) {
    if (import.meta.env.DEV) {
      console.debug(this.formatMessage('debug', message), context || '');
    }
  }
}

export const logger = Logger.getInstance();
