import React, { useEffect, useState } from 'react';

const TUTORIAL_URL = 'https://youtu.be/Qub8hP5aa5M?si=20Diku-S3XAGEQdh';
const TUTORIAL_THUMB_SRC = './assets/aistudio/file_00000000f96c8211ad324bfdc89796ec_c5a94e0a.png';

export default function TutorialPopup({ isOpen, onClose }) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="zynex-tutorial-title"
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white border border-[#EAE3DB] shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tutorial popup"
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/65 hover:bg-black/85 text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FF3358]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Clickable Tutorial Thumbnail */}
        <a
          href={TUTORIAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="relative block aspect-video w-full bg-[#13100E] overflow-hidden group focus-visible:outline-2 focus-visible:outline-[#FF3358]"
          aria-label="Watch Zynex Hunter Client Hunting Tutorial on YouTube"
        >
          {!imgFailed ? (
            <img
              src={TUTORIAL_THUMB_SRC}
              alt="Zynex Hunter Client Hunting Tutorial"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#6B30FF] via-[#E62E7A] to-[#FF3358] text-white p-6 text-center">
              <span className="text-lg font-extrabold tracking-tight">Zynex Hunter</span>
              <span className="text-xs opacity-90 mt-1">Client Hunting Step-by-Step Tutorial</span>
            </div>
          )}

          {/* Subtle scrim + Play button overlay */}
          <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-[#FF3358]/95 group-hover:bg-[#FF1F48] text-white flex items-center justify-center shadow-xl transition-transform duration-200 group-hover:scale-110">
              <svg className="w-6 h-6 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            </div>
          </div>
        </a>

        {/* Content & Actions */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="space-y-1.5 text-center sm:text-left">
            <h2
              id="zynex-tutorial-title"
              className="text-lg sm:text-xl font-black tracking-tight text-neutral-950 leading-snug"
            >
              New User? Watch this Tutorial to Find Clients
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 font-medium leading-relaxed">
              Learn step-by-step how to find active YouTubers, save target channels, and send winning pitches.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            <a
              href={TUTORIAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex-1 min-h-[44px] py-2.5 px-5 rounded-2xl bg-[#FF3358] hover:bg-[#FF1F48] text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FF3358]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
              <span>Watch Tutorial</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] py-2.5 px-5 rounded-2xl bg-[#FAF6F2] hover:bg-[#F0EAE3] text-neutral-800 border border-[#EAE3DB] text-xs sm:text-sm font-bold transition-colors flex items-center justify-center whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FF3358]"
            >
              I Have Watched
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
