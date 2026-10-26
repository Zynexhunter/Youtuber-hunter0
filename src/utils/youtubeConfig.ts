/**
 * src/utils/youtubeConfig.ts
 * Manages YouTube Data API v3 configuration.
 * Safe fallback priority:
 * 1. Admin UI override in localStorage ('yf_youtube_api_key')
 * 2. Vite environment variable (VITE_YOUTUBE_API_KEY)
 * 3. Default provided Free Tier key: AIzaSyBeoBLkZ7hQD1fAHkP9raCAkbCnYZNGrBc
 */

export const DEFAULT_YOUTUBE_API_KEY = 'AIzaSyBeoBLkZ7hQD1fAHkP9raCAkbCnYZNGrBc';

const STORAGE_KEY = 'yf_youtube_api_key';

export function getYoutubeApiKey(): string {
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem(STORAGE_KEY);
    if (customKey && customKey.trim().length > 0) {
      return customKey.trim();
    }
  }

  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_YOUTUBE_API_KEY) || '';
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }

  return DEFAULT_YOUTUBE_API_KEY;
}

export function setYoutubeApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const clean = (key || '').trim();
  if (clean) {
    localStorage.setItem(STORAGE_KEY, clean);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function resetYoutubeApiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 10) return '••••••••••••';
  return key.slice(0, 8) + '••••••••••••' + key.slice(-4);
}
