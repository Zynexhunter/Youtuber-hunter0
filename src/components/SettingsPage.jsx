/**
 * src/components/SettingsPage.jsx
 * "Settings" dashboard view.
 * Displays user profile, email, active plan status, demo toggle, and logout button -> /
 * Styled with warm minimal aesthetic (#FAF6F2).
 */
import React, { useState, useEffect } from 'react';
import { me, plan, isPaid, logout, savedIds, subscribeStore } from '../../lib/store.js';

export default function SettingsPage({ onNavigate }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [userIsPaid, setUserIsPaid] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const update = () => {
      setCurrentUser(me());
      setCurrentPlan(plan());
      setUserIsPaid(isPaid());
      setSavedCount(savedIds().length);
    };
    update();
    const unsub = subscribeStore(update);
    return () => unsub();
  }, []);

  const handleLogout = () => {
    logout();
    if (onNavigate) {
      onNavigate('/');
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#/';
    }
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Profile Details Card */}
      <div data-reveal="up" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EAE3DB] shadow-sm card-hover-lift">
        <div className="flex items-center gap-4 pb-6 border-b border-[#F0EAE3] mb-6">
          <div className="w-14 h-14 rounded-2xl bg-neutral-900 text-white font-black text-2xl flex items-center justify-center shadow-sm">
            {currentUser.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-black text-neutral-950">
              {currentUser.username}
            </h2>
            <p className="text-xs text-neutral-500 font-semibold">
              Client Hunter since {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Recently'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
          <div className="p-4 rounded-2xl bg-[#FAF6F2] border border-[#EAE3DB]">
            <span className="text-neutral-500 block mb-1">Username</span>
            <span className="font-extrabold text-sm text-neutral-950 font-mono">
              @{currentUser.username}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6F2] border border-[#EAE3DB]">
            <span className="text-neutral-500 block mb-1">Registered Email</span>
            <span className="font-extrabold text-sm text-neutral-950 font-mono">
              {currentUser.email}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6F2] border border-[#EAE3DB]">
            <span className="text-neutral-500 block mb-1">Current Membership Plan</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${userIsPaid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="font-extrabold text-sm text-neutral-950">
                {userIsPaid
                  ? `Active till ${currentPlan?.expiresAt ? new Date(currentPlan.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Active'}`
                  : 'Free Tier (5 Channels)'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6F2] border border-[#EAE3DB]">
            <span className="text-neutral-500 block mb-1">Saved Pitch Shortlist</span>
            <span className="font-extrabold text-sm text-neutral-950">
              {savedCount} creators saved
            </span>
          </div>
        </div>

        {!userIsPaid && (
          <div className="mt-6 pt-6 border-t border-[#F0EAE3] flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-500 font-medium">
              Unlock unlimited creator leads and instant pitch generator access:
            </span>
            <button
              onClick={() => onNavigate && onNavigate('/dashboard/plans')}
              className="py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-[#FF3358] hover:bg-[#FF1F48] cursor-pointer shadow-xs"
            >
              Upgrade Plan (₹30)
            </button>
          </div>
        )}
      </div>

      {/* Download Android APK Card */}
      <div data-reveal="up" className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-500/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 0 0-.1521-.5676.416.416 0 0 0-.5676.1521l-2.0223 3.503C15.5902 7.893 13.8533 7.5 12 7.5s-3.5902.393-5.1368 1.4497L4.8409 5.4467a.4161.4161 0 0 0-.5677-.1521.4157.4157 0 0 0-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.7778h24c-.3432-4.1189-2.6889-7.5911-6.1185-9.4564" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-neutral-950">
                Zynex Hunter Android App
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Official APK
              </span>
            </div>
            <p className="text-xs text-neutral-600 font-medium mt-1 leading-relaxed">
              Install the native Android APK for instant 1-tap launcher access, fast search, and offline-ready creator directories.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const apkUrl = 'https://download1593.mediafire.com/fl9bghpqpaegiY4EFBOO_XkoCninee_oIpfzDf0i9odBiHU9iJcQ_ErFyyXCrvPyk6Gx4dpXPKksBuku2EIUEcaOD17gF3In9NjcXWnxxVNqAyK-i71j2UcIpLD4IM-lEXdilRi3TGg9coU64evNDZ4aqiIshHbob3tIqPxO0yK_euLv/pbsgg8hy5ni95no/Zynex+Hunter.apk';
            let iframe = document.getElementById('zynex-apk-downloader');
            if (!iframe) {
              iframe = document.createElement('iframe');
              iframe.id = 'zynex-apk-downloader';
              iframe.style.display = 'none';
              document.body.appendChild(iframe);
            }
            iframe.src = apkUrl;
            try {
              const a = document.createElement('a');
              a.href = apkUrl;
              a.setAttribute('download', 'Zynex Hunter.apk');
              a.setAttribute('target', '_self');
              a.style.display = 'none';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            } catch {}
          }}
          className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Download APK</span>
        </button>
      </div>

      {/* USER POLICY & PRIVACY POLICY SECTION (FOR READING) */}
      <div data-reveal="up" className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EAE3DB] shadow-sm space-y-4 card-hover-lift stagger-1">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#F0EAE3]">
          <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-black text-neutral-950">
              User Policy & Privacy Policy
            </h3>
            <span className="text-[11px] text-neutral-500 font-medium">
              Transparency, Public Data Integrity & Ethics
            </span>
          </div>
        </div>

        <div className="space-y-3.5 text-xs text-neutral-600 font-medium leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-[#FAF6F2] border border-[#EAE3DB]">
            <h4 className="font-extrabold text-neutral-950 mb-1">
              1. We Never Sell Any Personal Data
            </h4>
            <p>
              Zynex Hunter strictly <strong>does NOT sell, trade, rent, or commercialize anyone's personal, private, or confidential data</strong>. We respect creator and user privacy above all else.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF6F2] border border-[#EAE3DB]">
            <h4 className="font-extrabold text-neutral-950 mb-1">
              2. Only Publicly Published Channel Data is Organized
            </h4>
            <p>
              This platform only indexes and organizes information that creators themselves have already made publicly accessible across YouTube — such as public channel names, links, niches, and approximate subscriber brackets. We do not uncover hidden or private phone numbers, home addresses, or private accounts.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF6F2] border border-[#EAE3DB]">
            <h4 className="font-extrabold text-neutral-950 mb-1">
              3. Purpose: Helping Thumbnail Designers Land Retainers
            </h4>
            <p>
              The core mission of our tool is to build genuine professional opportunities. We empower talented thumbnail designers and packaging artists to reach out with high-CTR, value-first pitches to active creators and build long-term retainer partnerships.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF6F2] border border-[#EAE3DB]">
            <h4 className="font-extrabold text-neutral-950 mb-1">
              4. Inquiries, Creator Removal & Official Support
            </h4>
            <p>
              Our directory organizes publicly available YouTube channel links. For assistance, questions, or creator removal requests, contact our official Telegram support directly at{' '}
              <a
                href="https://t.me/Pixel_Craft0"
                target="_blank"
                rel="noopener noreferrer"
                className="font-black text-neutral-950 hover:text-[#229ED9] underline inline-flex items-center gap-1"
              >
                <span>t.me/Pixel_Craft0 (@Pixel_Craft0)</span>
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Account Actions Card (Log out) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EAE3DB] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-neutral-950">
            Sign Out of Your Workspace
          </h3>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Log out from this browser session and return to the homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="py-2.5 px-5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-extrabold transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-rose-500"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
