/**
 * src/utils/youtubeSync.ts
 * Real-time YouTube Subscriber Synchronizer using YouTube Data API v3.
 * 
 * Features:
 * - Smart quota optimization: Batches direct channel IDs (up to 50 channels per 1 quota unit)
 * - Resolves handles (@handle) using forHandle (1 unit)
 * - Resolves legacy custom URLs & usernames
 * - Gracefully detects deleted/suspended channels or changed handles and marks them as skipped/pending
 * - Real-time progress reporting, pause/cancel capabilities, quota unit tracking
 */

export interface ParsedYouTubeId {
  type: 'id' | 'handle' | 'username' | 'search';
  value: string;
}

export interface YouTubeChannelStats {
  found: boolean;
  channelId?: string;
  title?: string;
  handle?: string;
  subscriberCount?: number;
  hiddenSubscriberCount?: boolean;
  videoCount?: number;
  viewCount?: string;
  error?: string;
  isDeletedOrNotFound?: boolean;
}

export interface SyncProgressItem {
  creatorId: string;
  name: string;
  channelLink: string;
  previousSubs: number;
  newSubs?: number;
  status: 'pending' | 'updating' | 'updated' | 'skipped' | 'unchanged' | 'error';
  reason?: string;
  channelId?: string;
  quotaCost: number;
  timestamp: string;
}

export interface SyncStats {
  total: number;
  processed: number;
  updated: number;
  unchanged: number;
  skipped: number;
  pending: number;
  quotaUnitsUsed: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
  currentChannelName?: string;
  errorMessage?: string;
}

/**
 * Extracts YouTube channel identifier from URL, handle, or channel name
 */
export function parseYouTubeIdentifier(urlOrHandle: string, fallbackName = ''): ParsedYouTubeId {
  if (!urlOrHandle || typeof urlOrHandle !== 'string') {
    if (fallbackName && fallbackName.trim()) {
      return { type: 'handle', value: fallbackName.trim().replace(/^@/, '') };
    }
    return { type: 'search', value: '' };
  }

  let str = urlOrHandle.trim();

  // 1. Direct Channel ID in URL: youtube.com/channel/(UC...)
  const directIdMatch = str.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/i);
  if (directIdMatch) {
    return { type: 'id', value: directIdMatch[1] };
  }

  // 1b. Raw Channel ID (UC...)
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(str)) {
    return { type: 'id', value: str };
  }

  // 2. Modern @handle: youtube.com/@handle or @handle
  const handleMatch = str.match(/(?:youtube\.com\/(?:@)?|@)([a-zA-Z0-9_.-]+)/i);
  if (handleMatch) {
    return { type: 'handle', value: handleMatch[1].replace(/^@/, '') };
  }

  // 3. Custom channel URL: youtube.com/c/name
  const customMatch = str.match(/youtube\.com\/c\/([a-zA-Z0-9_.-]+)/i);
  if (customMatch) {
    return { type: 'handle', value: customMatch[1] };
  }

  // 4. Legacy username: youtube.com/user/name
  const userMatch = str.match(/youtube\.com\/user\/([a-zA-Z0-9_.-]+)/i);
  if (userMatch) {
    return { type: 'username', value: userMatch[1] };
  }

  // 5. Bare path on youtube.com: youtube.com/SomeCreator
  const pathMatch = str.match(/youtube\.com\/([a-zA-Z0-9_.-]+)\/?$/i);
  if (pathMatch && !['watch', 'feed', 'playlist', 'results', 'shorts', 'channel'].includes(pathMatch[1].toLowerCase())) {
    return { type: 'handle', value: pathMatch[1] };
  }

  // 6. Clean fallbackName if given
  if (fallbackName && fallbackName.trim()) {
    const clean = fallbackName.trim().replace(/\s+/g, '');
    return { type: 'handle', value: clean };
  }

  return { type: 'search', value: str };
}

/**
 * Fetches real-time channel statistics from YouTube Data API v3
 */
export async function fetchYouTubeStats(
  identifier: ParsedYouTubeId,
  apiKey: string,
  signal?: AbortSignal
): Promise<YouTubeChannelStats> {
  if (!identifier.value) {
    return {
      found: false,
      isDeletedOrNotFound: true,
      error: 'Empty YouTube channel reference',
    };
  }

  let endpoint = '';
  if (identifier.type === 'id') {
    endpoint = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${encodeURIComponent(identifier.value)}&key=${apiKey}`;
  } else if (identifier.type === 'handle') {
    // YouTube forHandle works best with the @ prefix
    const handleValue = identifier.value.startsWith('@') ? identifier.value : `@${identifier.value}`;
    endpoint = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=${encodeURIComponent(handleValue)}&key=${apiKey}`;
  } else if (identifier.type === 'username') {
    endpoint = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forUsername=${encodeURIComponent(identifier.value)}&key=${apiKey}`;
  } else {
    // Fallback: try as handle
    const handleValue = identifier.value.startsWith('@') ? identifier.value : `@${identifier.value}`;
    endpoint = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=${encodeURIComponent(handleValue)}&key=${apiKey}`;
  }

  try {
    const response = await fetch(endpoint, { signal });
    const data = await response.json();

    if (!response.ok) {
      const apiErr = data?.error?.message || `YouTube API HTTP ${response.status}`;
      const isQuota = data?.error?.errors?.some((e: any) => e.reason === 'quotaExceeded') || response.status === 403;
      if (isQuota) {
        throw new Error(`YouTube API Quota Exceeded or Forbidden: ${apiErr}`);
      }
      return {
        found: false,
        error: apiErr,
        isDeletedOrNotFound: response.status === 404,
      };
    }

    if (!data.items || data.items.length === 0) {
      // If forHandle with @ prefix found nothing, try without @ as fallback (1 extra try)
      if (identifier.type === 'handle' && identifier.value.startsWith('@')) {
        const fallbackHandle = identifier.value.replace(/^@/, '');
        const fallbackEndpoint = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=${encodeURIComponent(fallbackHandle)}&key=${apiKey}`;
        const fallbackRes = await fetch(fallbackEndpoint, { signal });
        const fallbackData = await fallbackRes.json();
        if (fallbackData.items && fallbackData.items.length > 0) {
          const item = fallbackData.items[0];
          return {
            found: true,
            channelId: item.id,
            title: item.snippet?.title,
            handle: item.snippet?.customUrl || fallbackHandle,
            subscriberCount: item.statistics?.subscriberCount ? parseInt(item.statistics.subscriberCount, 10) : 0,
            hiddenSubscriberCount: Boolean(item.statistics?.hiddenSubscriberCount),
            videoCount: item.statistics?.videoCount ? parseInt(item.statistics.videoCount, 10) : 0,
            viewCount: item.statistics?.viewCount || '0',
          };
        }
      }

      return {
        found: false,
        isDeletedOrNotFound: true,
        error: 'Channel not found on YouTube (Channel may be deleted or handle changed)',
      };
    }

    const item = data.items[0];
    const subCount = item.statistics?.subscriberCount ? parseInt(item.statistics.subscriberCount, 10) : 0;

    return {
      found: true,
      channelId: item.id,
      title: item.snippet?.title,
      handle: item.snippet?.customUrl || identifier.value,
      subscriberCount: subCount,
      hiddenSubscriberCount: Boolean(item.statistics?.hiddenSubscriberCount),
      videoCount: item.statistics?.videoCount ? parseInt(item.statistics.videoCount, 10) : 0,
      viewCount: item.statistics?.viewCount || '0',
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err;
    }
    if (err.message && err.message.includes('Quota Exceeded')) {
      throw err;
    }
    return {
      found: false,
      error: err.message || 'Network error connecting to YouTube API',
      isDeletedOrNotFound: false,
    };
  }
}

/**
 * Batch fetches direct Channel IDs (up to 50 IDs per single quota unit)
 */
export async function fetchBatchChannelIdsStats(
  channelIds: string[],
  apiKey: string,
  signal?: AbortSignal
): Promise<Map<string, YouTubeChannelStats>> {
  const results = new Map<string, YouTubeChannelStats>();
  if (!channelIds || channelIds.length === 0) return results;

  const chunkSize = 50;
  for (let i = 0; i < channelIds.length; i += chunkSize) {
    const chunk = channelIds.slice(i, i + chunkSize);
    const endpoint = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${encodeURIComponent(chunk.join(','))}&key=${apiKey}`;
    
    try {
      const response = await fetch(endpoint, { signal });
      const data = await response.json();
      
      if (!response.ok) {
        const errMessage = data?.error?.message || `HTTP ${response.status}`;
        chunk.forEach((id) => {
          results.set(id, { found: false, error: errMessage });
        });
        continue;
      }

      const returnedMap = new Map<string, any>();
      (data.items || []).forEach((item: any) => {
        returnedMap.set(item.id, item);
      });

      chunk.forEach((id) => {
        const item = returnedMap.get(id);
        if (item) {
          results.set(id, {
            found: true,
            channelId: item.id,
            title: item.snippet?.title,
            handle: item.snippet?.customUrl,
            subscriberCount: item.statistics?.subscriberCount ? parseInt(item.statistics.subscriberCount, 10) : 0,
            hiddenSubscriberCount: Boolean(item.statistics?.hiddenSubscriberCount),
            videoCount: item.statistics?.videoCount ? parseInt(item.statistics.videoCount, 10) : 0,
          });
        } else {
          results.set(id, {
            found: false,
            isDeletedOrNotFound: true,
            error: 'Channel deleted or ID changed',
          });
        }
      });
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      chunk.forEach((id) => {
        results.set(id, { found: false, error: err.message });
      });
    }
  }

  return results;
}

/**
 * Small delay helper to avoid browser connection saturation
 */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
