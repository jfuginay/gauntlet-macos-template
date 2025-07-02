// Shared utilities for ENGIE v2.0

// Check if we're in development mode
export const isDev = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') || false;

export const isProduction = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') || false;

export function formatTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}