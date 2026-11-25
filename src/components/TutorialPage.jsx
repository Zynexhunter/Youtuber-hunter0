import React, { useState } from 'react';

const TUTORIAL_URL = 'https://youtu.be/Qub8hP5aa5M?si=20Diku-S3XAGEQdh';
const TUTORIAL_EMBED_URL = 'https://www.youtube.com/embed/Qub8hP5aa5M?autoplay=1&rel=0';
const TUTORIAL_THUMB_SRC = './assets/aistudio/file_00000000f96c8211ad324bfdc89796ec_c5a94e0a.png';

const STEPS = [
  {
    num: '01',
    title: 'Find YouTubers',
    desc: 'Open Find YouTubers to browse active creators who regularly upload videos.',
  },
  {
    num: '02',
    title: 'Apply Filters',
    desc: 'Filter channels by niche, subscriber bracket (e.g. 10k–20k), and country.',
  },
  {
    num: '03',
    title: 'Save Channels',
    desc: 'Click "Save It" on creators you want to pitch so they stay in your shortlist.',
  },
  {
    num: '04',
    title: 'Generate DM / Email',
    desc: 'Go to Saved YouTubers and generate personalized Short DMs or Cold Emails in 1 tap.',
  },
  {
    num: '05',
    title: 'Contact Easily',
    desc: 'Copy your pitch, reach out directly to the creator, and land recurring client work.',
  },
];

export default function TutorialPage({ onNavigate }) {
  const [playingInline, setPlayingInline] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Main Video Showcase Card */}
      <div className="rounded-3xl bg-white border border-[#EAE3DB] shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left: Video / Thumbnail Player */}
          <div className="lg:col-span-7 bg-[#13100E] relative aspect-video lg:aspect-auto lg:min-h-[300px]">
            {playingInline ? (
              <iframe
                src={TUTORIAL_EMBED_URL}
                title="Zynex Hunter Client Hunting Tutorial"
                className="w-full h-full min-h-[240px] lg:min-h-[320px] border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlayingInline(true)}
                aria-label="Play Client Hunting Tutorial"
                className="relative w-full h-full min-h-[220px] block group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FF3358]"
              >
                {!imgFailed ? (
                  <img
                    src={TUTORIAL_THUMB_SRC}
                    alt="Zynex Hunter Client Hunting Tutorial"
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#6B30FF] via-[#E62E7A] to-[#FF3358] text-white p-6">
                    <span className="text-lg font-black">Zynex Hunter Tutorial</span>
                    <span className="text-xs opacity-90 mt-1">Step-by-Step Client Hunting Guide</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/15 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-[#FF3358] group-hover:bg-[#FF1F48] text-white flex items-center justify-center shadow-2xl transition-transform duration-200 group-hover:scale-110">
                    <svg className="w-7 h-7 ml-1" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="6 4 20 12 6 20 6 4" />
                    </svg>
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Right: Info & Actions */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs font-bold text-[#FF3358] uppercase tracking-wider">
                Step-by-Step Guide
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-950 tracking-tight leading-snug">
                How to Find YouTube Clients with Zynex Hunter
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 font-medium leading-relaxed">
                Watch this walkthrough to learn how to filter high-potential creators, shortlist channels, and send outreach pitches that convert.
              </p>
            </div>

            <div className="space-y-2.5">
              <a
                href={TUTORIAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[44px] py-3 px-5 rounded-2xl text-xs sm:text-sm font-extrabold text-white bg-[#FF3358] hover:bg-[#FF1F48] shadow-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FF3358]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
                <span>Watch on YouTube</span>
              </a>

              {!playingInline && (
                <button
                  type="button"
                  onClick={() => setPlayingInline(true)}
                  className="w-full min-h-[44px] py-2.5 px-5 rounded-2xl text-xs sm:text-sm font-bold text-neutral-800 bg-[#FAF6F2] hover:bg-[#F0EAE3] border border-[#EAE3DB] transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <span>Play Video Here</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5-Step Quick Workflow */}
      <div className="rounded-3xl bg-white border border-[#EAE3DB] shadow-sm p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EAE3]">
          <div>
            <h3 className="text-lg font-black text-neutral-950 tracking-tight">
              Quick Client Hunting Workflow
            </h3>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Follow these 5 steps to start landing video editing &amp; thumbnail design clients.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/dashboard/find')}
            className="self-start sm:self-center py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-neutral-950 hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            Go to Find YouTubers →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="p-4 rounded-2xl bg-[#FAF6F2] border border-[#EAE3DB] flex flex-col justify-between gap-2"
            >
              <div>
                <span className="text-xs font-black font-mono text-[#FF3358] block mb-1.5">
                  {step.num}.
                </span>
                <h4 className="text-sm font-extrabold text-neutral-950 leading-snug">
                  {step.title}
                </h4>
                <p className="text-xs text-neutral-600 font-medium mt-1 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
