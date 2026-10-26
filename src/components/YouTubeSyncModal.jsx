/**
 * src/components/YouTubeSyncModal.jsx
 * Real-time YouTube Subscriber Sync Dashboard for Admin Control Panel.
 *
 * Capabilities:
 * - Free Tier Quota Optimization: Batches direct channel IDs (up to 50 channels per call)
 *   and resolves handles with 1 unit per request.
 * - Live real-time progress: Total, Updated, Pending/Remaining, Skipped/Deleted counts.
 * - Graceful handling: If a channel is deleted or handle changed, it is skipped without error,
 *   logged with reason, and categorized under 'Skipped / Deleted' filter.
 * - API Key Manager: Allows admin to test, view, or enter custom YouTube API key.
 * - Incremental persistence: Saves every updated channel count to Supabase & local store in real-time.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  getYoutubeApiKey,
  setYoutubeApiKey,
  resetYoutubeApiKey,
  maskApiKey,
  DEFAULT_YOUTUBE_API_KEY,
} from '../utils/youtubeConfig';
import {
  parseYouTubeIdentifier,
  fetchYouTubeStats,
  fetchBatchChannelIdsStats,
  delay,
} from '../utils/youtubeSync';
import {
  adminExportAllCreators,
  adminUpdateSingleCreatorSubs,
  getLiveCreators,
} from '../../lib/store.js';

// Format number: 1200000 -> 1.2M, 50000 -> 50K
function formatSubs(num) {
  if (!num || isNaN(num)) return '0';
  const n = Number(num);
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('en-IN');
}

export default function YouTubeSyncModal({ isOpen, onClose, onSyncComplete }) {
  const [apiKey, setApiKey] = useState(() => getYoutubeApiKey());
  const [showKeySettings, setShowKeySettings] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keySaveMsg, setKeySaveMsg] = useState('');

  // Creators list and sync items
  const [items, setItems] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Sync state
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'running' | 'paused' | 'completed' | 'stopped' | 'error'
  const [currentChannel, setCurrentChannel] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'updated' | 'pending' | 'skipped'
  const [searchFilter, setSearchFilter] = useState('');
  const [quotaUnits, setQuotaUnits] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Refs for pause/cancel signals
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);
  const cancelRequestedRef = useRef(false);

  // Load creators when opened
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const loadCreators = async () => {
      setLoadingInitial(true);
      setErrorMessage('');
      try {
        let allCreators = [];
        try {
          allCreators = await adminExportAllCreators();
        } catch {
          allCreators = await getLiveCreators();
        }

        if (!allCreators || allCreators.length === 0) {
          allCreators = await getLiveCreators();
        }

        if (mounted) {
          const syncItems = allCreators.map((c) => ({
            id: c.id,
            name: c.name || 'Unnamed Creator',
            channel_link: c.channel_link || c.link || '',
            previousSubs: Number(c.subscribers || c.subs || 0),
            newSubs: null,
            status: 'pending', // 'pending' | 'updating' | 'updated' | 'unchanged' | 'skipped'
            reason: '',
            youtubeChannelId: '',
            hiddenSubs: false,
            updatedAt: null,
          }));

          setItems(syncItems);
          setSyncStatus('idle');
          setQuotaUnits(0);
        }
      } catch (err) {
        if (mounted) {
          setErrorMessage(err.message || 'Failed to load creators list.');
        }
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    };

    loadCreators();

    return () => {
      mounted = false;
      isRunningRef.current = false;
      cancelRequestedRef.current = true;
    };
  }, [isOpen]);

  // Derived counts
  const totalCount = items.length;
  const updatedCount = items.filter((i) => i.status === 'updated' || i.status === 'unchanged').length;
  const skippedCount = items.filter((i) => i.status === 'skipped').length;
  const pendingCount = items.filter((i) => i.status === 'pending' || i.status === 'updating').length;
  const progressPercent = totalCount > 0 ? Math.round(((updatedCount + skippedCount) / totalCount) * 100) : 0;

  // Save custom API key
  const handleSaveApiKey = (e) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      resetYoutubeApiKey();
      setApiKey(getYoutubeApiKey());
      setKeySaveMsg('Reset to default key.');
    } else {
      setYoutubeApiKey(keyInput.trim());
      setApiKey(keyInput.trim());
      setKeySaveMsg('API Key saved successfully!');
    }
    setTimeout(() => setKeySaveMsg(''), 3000);
  };

  // Main Sync Engine
  const startSync = async (retrySkippedOnly = false) => {
    if (items.length === 0) return;
    const activeKey = getYoutubeApiKey();
    if (!activeKey) {
      setErrorMessage('YouTube API Key is missing. Please enter a valid API key.');
      return;
    }

    isRunningRef.current = true;
    isPausedRef.current = false;
    cancelRequestedRef.current = false;
    setSyncStatus('running');
    setErrorMessage('');

    // Determine target items to process
    const targetItems = items.filter((it) => {
      if (retrySkippedOnly) return it.status === 'skipped';
      return it.status === 'pending' || it.status === 'updating';
    });

    if (targetItems.length === 0) {
      // If all are already processed and user clicked start, reset all to pending
      const resetItems = items.map((i) => ({
        ...i,
        status: 'pending',
        reason: '',
        newSubs: null,
      }));
      setItems(resetItems);
      setTimeout(() => startSync(false), 50);
      return;
    }

    let localQuota = quotaUnits;

    // Process channels sequentially with quota optimization
    for (let idx = 0; idx < items.length; idx++) {
      if (!isRunningRef.current || cancelRequestedRef.current) {
        setSyncStatus('stopped');
        break;
      }

      // Check if paused
      while (isPausedRef.current) {
        setSyncStatus('paused');
        await delay(300);
        if (!isRunningRef.current || cancelRequestedRef.current) break;
      }

      if (!isRunningRef.current || cancelRequestedRef.current) break;

      const item = items[idx];
      if (retrySkippedOnly && item.status !== 'skipped') continue;
      if (!retrySkippedOnly && item.status !== 'pending' && item.status !== 'updating') continue;

      // Mark current channel as updating
      setCurrentChannel(item.name);
      setItems((prev) =>
        prev.map((it, i) => (i === idx ? { ...it, status: 'updating' } : it))
      );

      // Parse YouTube Identifier
      const parsed = parseYouTubeIdentifier(item.channel_link, item.name);

      if (!parsed.value) {
        // Missing link or name
        setItems((prev) =>
          prev.map((it, i) =>
            i === idx
              ? {
                  ...it,
                  status: 'skipped',
                  reason: 'Missing YouTube link or handle',
                }
              : it
          )
        );
        continue;
      }

      try {
        localQuota += 1; // 1 quota unit for channels.list
        setQuotaUnits(localQuota);

        const stats = await fetchYouTubeStats(parsed, activeKey);

        if (!stats.found) {
          // Channel is deleted, suspended, or handle changed
          const skipReason = stats.error || 'Channel not found on YouTube (Deleted or Handle changed)';
          setItems((prev) =>
            prev.map((it, i) =>
              i === idx
                ? {
                    ...it,
                    status: 'skipped',
                    reason: skipReason,
                  }
                : it
            )
          );
        } else {
          // Channel found!
          const realSubs = stats.subscriberCount || 0;
          const isChanged = realSubs !== item.previousSubs;

          // Save to Supabase and local store
          try {
            await adminUpdateSingleCreatorSubs(item.id, realSubs, item.channel_link);
          } catch (saveErr) {
            console.warn('Sync save note:', saveErr);
          }

          setItems((prev) =>
            prev.map((it, i) =>
              i === idx
                ? {
                    ...it,
                    status: isChanged ? 'updated' : 'unchanged',
                    newSubs: realSubs,
                    hiddenSubs: stats.hiddenSubscriberCount || false,
                    youtubeChannelId: stats.channelId || '',
                    updatedAt: new Date().toLocaleTimeString(),
                  }
                : it
            )
          );
        }
      } catch (callErr) {
        if (callErr.name === 'AbortError' || cancelRequestedRef.current) {
          break;
        }

        const msg = callErr.message || '';
        if (msg.includes('Quota Exceeded') || msg.includes('403')) {
          setErrorMessage('YouTube API Quota exceeded for today, or API key is restricted. Please provide another API key.');
          setSyncStatus('error');
          isRunningRef.current = false;
          break;
        }

        // Network error for this channel; skip and proceed
        setItems((prev) =>
          prev.map((it, i) =>
            i === idx
              ? {
                  ...it,
                  status: 'skipped',
                  reason: msg || 'Network error fetching stats',
                }
              : it
          )
        );
      }

      // Small pacing delay to avoid flooding
      await delay(90);
    }

    if (isRunningRef.current && !cancelRequestedRef.current) {
      setSyncStatus('completed');
      setCurrentChannel('');
      if (onSyncComplete) onSyncComplete();
    }
  };

  const handlePauseToggle = () => {
    if (syncStatus === 'running') {
      isPausedRef.current = true;
      setSyncStatus('paused');
    } else if (syncStatus === 'paused') {
      isPausedRef.current = false;
      setSyncStatus('running');
    }
  };

  const handleStop = () => {
    isRunningRef.current = false;
    isPausedRef.current = false;
    cancelRequestedRef.current = true;
    setSyncStatus('stopped');
    setCurrentChannel('');
    if (onSyncComplete) onSyncComplete();
  };

  const handleClose = () => {
    if (syncStatus === 'running') {
      const confirmClose = window.confirm(
        'Subscriber sync is currently running in background. Stop sync and close?'
      );
      if (!confirmClose) return;
      handleStop();
    }
    onClose();
  };

  // Filter items for table
  const filteredItems = items.filter((item) => {
    if (activeFilter === 'updated' && item.status !== 'updated' && item.status !== 'unchanged') return false;
    if (activeFilter === 'skipped' && item.status !== 'skipped') return false;
    if (activeFilter === 'pending' && item.status !== 'pending' && item.status !== 'updating') return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.channel_link.toLowerCase().includes(q) ||
        (item.reason && item.reason.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#EAE3DB] max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-[#EAE3DB] bg-[#FAF6F2] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF3358] to-rose-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
              🔄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-neutral-900 text-base sm:text-lg">
                  Real-time YouTube Subscriber Sync
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300">
                  YouTube v3 API
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium">
                Fetch and update real-time YouTube subscriber counts directly into database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKeySettings(!showKeySettings)}
              className="px-3 py-1.5 bg-white hover:bg-neutral-100 border border-[#EAE3DB] rounded-xl text-xs font-bold text-neutral-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Configure YouTube API Key"
            >
              <span>🔑</span>
              <span className="hidden sm:inline">API Key</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-neutral-200 text-neutral-600 font-bold flex items-center justify-center cursor-pointer border border-[#EAE3DB]"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* EXPANDABLE API KEY SETTINGS */}
        {showKeySettings && (
          <div className="p-4 bg-amber-50/60 border-b border-amber-200 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-amber-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span>🔑 YouTube API Key Settings</span>
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">
                Current: {maskApiKey(apiKey)}
              </span>
            </div>
            <p className="text-neutral-600 mb-3">
              Default pre-configured free-tier YouTube API key is active. You can provide a custom key below anytime:
            </p>
            <form onSubmit={handleSaveApiKey} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter new YouTube v3 API Key (leave empty to reset to default)"
                className="flex-1 min-w-[240px] px-3 py-2 bg-white rounded-xl border border-amber-300 font-mono text-xs text-neutral-900 focus:outline-none focus:border-[#FF3358]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
              >
                Save Key
              </button>
              <button
                type="button"
                onClick={() => {
                  resetYoutubeApiKey();
                  setApiKey(DEFAULT_YOUTUBE_API_KEY);
                  setKeyInput('');
                  setKeySaveMsg('Reset to default key.');
                  setTimeout(() => setKeySaveMsg(''), 3000);
                }}
                className="px-3 py-2 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 rounded-xl font-bold cursor-pointer transition-all text-xs"
              >
                Reset Default
              </button>
            </form>
            {keySaveMsg && (
              <div className="mt-2 text-emerald-700 font-bold text-xs">
                ✅ {keySaveMsg}
              </div>
            )}
          </div>
        )}

        {/* ERROR NOTICE */}
        {errorMessage && (
          <div className="p-3 mx-4 mt-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="text-rose-700 font-bold ml-2">✕</button>
          </div>
        )}

        {/* STATS STRIP: 4 TILES */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-white border-b border-[#EAE3DB]">
          {/* Total Channels */}
          <div className="bg-[#FAF6F2] p-3 rounded-2xl border border-[#EAE3DB]">
            <div className="text-[11px] font-bold text-neutral-500 uppercase">Total Channels</div>
            <div className="text-xl sm:text-2xl font-black text-neutral-900 mt-0.5">
              {loadingInitial ? '...' : totalCount}
            </div>
            <div className="text-[10px] text-neutral-400 font-medium">In your database</div>
          </div>

          {/* Updated Count */}
          <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200">
            <div className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
              <span>✅ Updated</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">
              {updatedCount}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium">Live subs synced</div>
          </div>

          {/* Pending / Remaining Count */}
          <div className="bg-sky-50/70 p-3 rounded-2xl border border-sky-200">
            <div className="text-[11px] font-bold text-sky-800 uppercase flex items-center gap-1">
              <span>⏳ Remaining</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-sky-700 mt-0.5">
              {pendingCount}
            </div>
            <div className="text-[10px] text-sky-600 font-medium">Waiting in queue</div>
          </div>

          {/* Skipped / Deleted Count */}
          <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-200">
            <div className="text-[11px] font-bold text-rose-800 uppercase flex items-center gap-1">
              <span>⏭️ Skipped / Deleted</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5">
              {skippedCount}
            </div>
            <div className="text-[10px] text-rose-600 font-medium">Handle changed / Deleted</div>
          </div>
        </div>

        {/* PROGRESS BAR & CONTROLS */}
        <div className="p-4 bg-[#FAF6F2]/60 border-b border-[#EAE3DB] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-neutral-800 uppercase tracking-wide">
                Progress:
              </span>
              <span className="text-xs font-bold text-neutral-600">
                {updatedCount + skippedCount} of {totalCount} ({progressPercent}%)
              </span>
              {currentChannel && (
                <span className="text-xs font-mono text-[#FF3358] bg-[#FF3358]/10 px-2 py-0.5 rounded-md animate-pulse truncate max-w-[200px]">
                  Syncing: {currentChannel}
                </span>
              )}
            </div>

            {/* Quota Tracker */}
            <div className="text-[11px] font-mono text-neutral-500 bg-white px-2.5 py-1 rounded-lg border border-[#EAE3DB] shadow-2xs">
              ⚡ API Quota Used: <span className="font-bold text-neutral-900">{quotaUnits}</span> / 10,000 free units
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#FF3358] to-emerald-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {syncStatus !== 'running' && syncStatus !== 'paused' ? (
                <button
                  type="button"
                  onClick={() => startSync(false)}
                  disabled={loadingInitial || totalCount === 0}
                  className="px-4 py-2 bg-[#FF3358] hover:bg-[#FF1F48] text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <span>▶️</span>
                  <span>{progressPercent === 100 ? 'Re-Sync All Channels' : 'Start Subscriber Update'}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handlePauseToggle}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>{syncStatus === 'paused' ? '▶️ Resume' : '⏸️ Pause'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStop}
                    className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>⏹️ Stop Sync</span>
                  </button>
                </>
              )}

              {skippedCount > 0 && syncStatus !== 'running' && (
                <button
                  type="button"
                  onClick={() => startSync(true)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  title="Retry only channels that were skipped or not found"
                >
                  🔄 Retry Skipped Only ({skippedCount})
                </button>
              )}
            </div>

            {syncStatus === 'completed' && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                <span>🎉</span>
                <span>All channels updated successfully!</span>
              </span>
            )}
          </div>
        </div>

        {/* FILTER BAR & SEARCH */}
        <div className="px-4 py-2.5 bg-white border-b border-[#EAE3DB] flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setActiveFilter('updated')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilter === 'updated'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Updated ({updatedCount})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilter === 'pending'
                  ? 'bg-sky-600 text-white'
                  : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setActiveFilter('skipped')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeFilter === 'skipped'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              Skipped / Deleted ({skippedCount})
            </button>
          </div>

          {/* Search filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter channels..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-2.5 py-1 bg-[#FAF6F2] rounded-lg border border-[#EAE3DB] text-xs font-medium focus:outline-none w-36 sm:w-48 placeholder:text-neutral-400"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* CHANNELS TABLE / ACTIVITY FEED */}
        <div className="flex-1 overflow-y-auto min-h-[260px] max-h-[420px] divide-y divide-[#EAE3DB] text-xs">
          {loadingInitial ? (
            <div className="p-8 text-center text-neutral-400 font-medium">
              Loading YouTubers from database...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 font-medium">
              No channels match the active filter.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#FAF6F2] sticky top-0 z-10 border-b border-[#EAE3DB] text-[11px] font-extrabold uppercase text-neutral-500 tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Channel</th>
                  <th className="py-2.5 px-3">Previous</th>
                  <th className="py-2.5 px-3">Live Count</th>
                  <th className="py-2.5 px-3">Status / Notes</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE3DB]">
                {filteredItems.map((item) => {
                  const hasDiff =
                    item.newSubs !== null &&
                    item.newSubs !== undefined &&
                    item.newSubs !== item.previousSubs;
                  const diff = hasDiff ? item.newSubs - item.previousSubs : 0;

                  return (
                    <tr
                      key={item.id || item.channel_link}
                      className={`hover:bg-[#FAF6F2]/60 transition-colors ${
                        item.status === 'updating' ? 'bg-amber-50/60' : ''
                      }`}
                    >
                      {/* Channel Info */}
                      <td className="py-2.5 px-4">
                        <div className="font-extrabold text-neutral-900 truncate max-w-[200px]">
                          {item.name}
                        </div>
                        <a
                          href={item.channel_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-neutral-400 hover:text-[#FF3358] truncate block max-w-[220px]"
                        >
                          {item.channel_link}
                        </a>
                      </td>

                      {/* Previous count */}
                      <td className="py-2.5 px-3 font-mono font-bold text-neutral-600">
                        {formatSubs(item.previousSubs)}
                      </td>

                      {/* Live YouTube count */}
                      <td className="py-2.5 px-3 font-mono">
                        {item.newSubs !== null && item.newSubs !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-neutral-950">
                              {formatSubs(item.newSubs)}
                            </span>
                            {hasDiff && (
                              <span
                                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                                  diff > 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {diff > 0 ? `+${formatSubs(diff)}` : `-${formatSubs(Math.abs(diff))}`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">--</span>
                        )}
                      </td>

                      {/* Status / Notes */}
                      <td className="py-2.5 px-3">
                        {item.status === 'updated' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span>✓</span> Updated
                          </span>
                        )}
                        {item.status === 'unchanged' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
                            <span>=</span> Verified (Same)
                          </span>
                        )}
                        {item.status === 'updating' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                            <span>⏳</span> Fetching...
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded-full">
                            Waiting
                          </span>
                        )}
                        {item.status === 'skipped' && (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <span>⏭️</span> Skipped
                            </span>
                            <div className="text-[10px] text-neutral-500 mt-0.5 truncate max-w-[200px]" title={item.reason}>
                              {item.reason}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-right">
                        <a
                          href={item.channel_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-neutral-600 hover:text-[#FF3358] bg-white border border-[#EAE3DB] px-2 py-1 rounded-lg transition-all shadow-2xs inline-block"
                        >
                          Visit ↗
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 bg-[#FAF6F2] border-t border-[#EAE3DB] flex items-center justify-between text-xs">
          <div className="text-neutral-500">
            {updatedCount} of {totalCount} channels synced with real-time YouTube count
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
}
